(function() {
  var svg;

  // Save off default references
  var d3 = window.d3, topojson = window.topojson;

  var defaultOptions = {
    scope: 'world',
    responsive: false,
    aspectRatio: 0.5625,
    setProjection: setProjection,
    projection: 'equirectangular',
    dataType: 'json',
    data: {},
    done: function() {},
    zoom: null,
    zoomScale: [1, 10],
    fills: {
      defaultFill: '#ABDDA4'
    },
    filters: {},
    geographyConfig: {
        dataUrl: null,
        hideAntarctica: true,
        hideHawaiiAndAlaska : false,
        borderWidth: 1,
        borderOpacity: 1,
        borderColor: '#FDFDFD',
        popupTemplate: function(geography, data) {
          return '<div class="hoverinfo"><strong>' + geography.properties.name + '</strong></div>';
        },
        popupOnHover: true,
        highlightOnHover: true,
        highlightFillColor: '#FC8D59',
        highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
        highlightBorderWidth: 2,
        highlightBorderOpacity: 1
    },
    projectionConfig: {
      rotation: [97, 0]
    },
    bubblesConfig: {
        borderWidth: 2,
        borderOpacity: 1,
        borderColor: '#FFFFFF',
        popupOnHover: true,
        radius: null,
        popupTemplate: function(geography, data) {
          return '<div class="hoverinfo"><strong>' + data.name + '</strong></div>';
        },
        fillOpacity: 0.75,
        animate: true,
        highlightOnHover: true,
        highlightFillColor: '#FC8D59',
        highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
        highlightBorderWidth: 2,
        highlightBorderOpacity: 1,
        highlightFillOpacity: 0.85,
        exitDelay: 100,
        key: JSON.stringify
    },
    arcConfig: {
      strokeColor: '#DD1C77',
      strokeWidth: 1,
      arcSharpness: 1,
      animationSpeed: 600,
      popupOnHover: false,
      popupTemplate: function(geography, data) {
        // Case with latitude and longitude
        if ( ( data.origin && data.destination ) && data.origin.latitude && data.origin.longitude && data.destination.latitude && data.destination.longitude ) {
          return '<div class="hoverinfo"><strong>Arc</strong><br>Origin: ' + JSON.stringify(data.origin) + '<br>Destination: ' + JSON.stringify(data.destination) + '</div>';
        }
        // Case with only country name
        else if ( data.origin && data.destination ) {
          return '<div class="hoverinfo"><strong>Arc</strong><br>' + data.origin + ' -> ' + data.destination + '</div>';
        }
        // Missing information
        else {
          return '';
        }
      }
    }
  };

  /*
    Getter for value. If not declared on datumValue, look up the chain into optionsValue
  */
  function val( datumValue, optionsValue, context ) {
    if ( typeof context === 'undefined' ) {
      context = optionsValue;
      optionsValues = undefined;
    }
    var value = typeof datumValue !== 'undefined' ? datumValue : optionsValue;

    if (typeof value === 'undefined') {
      return  null;
    }

    if ( typeof value === 'function' ) {
      var fnContext = [context];
      if ( context.geography ) {
        fnContext = [context.geography, context.data];
      }
      return value.apply(null, fnContext);
    }
    else {
      return value;
    }
  }

  function addContainer( element, height, width ) {
    // prepare svg
    this.svg = d3.select( element ).append('svg')
      .attr('width', width || element.offsetWidth)
      .attr('height', height || (width * this.options.aspectRatio) || element.offsetWidth * this.options.aspectRatio)
      .attr('data-width', width || element.offsetWidth)
      .attr('data-height', height || (width * this.options.aspectRatio) || element.offsetWidth * this.options.aspectRatio)
      .attr('class', 'datamap')
      .style('overflow', 'hidden') // IE10+ doesn't respect height/width when map is zoomed in
    ;

    // Fix height definition of the container
    this.svg.select(function() { return this.parentNode; })
      .style('height', height)
      .style('min-height', height)
      .style('max-height', height)
    ;

    if (this.options.responsive) {
      d3.select(this.options.element).style({'position': 'relative', 'padding-bottom': (this.options.aspectRatio*100) + '%'});
      d3.select(this.options.element).select('svg').style({'position': 'absolute', 'width': '100%', 'height': '100%'});
      d3.select(this.options.element).select('svg').select('g').selectAll('path').style('vector-effect', 'non-scaling-stroke');
    }

    return this.svg;
  }

  // setProjection takes the svg element and options
  function setProjection( element, options ) {
    var width = options.width || element.offsetWidth;
    var height = options.height || element.offsetHeight;
    var projection, path;
    var svg = this.svg;

    if ( options && typeof options.scope === 'undefined') {
      options.scope = 'world';
    }

    if ( options.scope === 'usa' ) {
      projection = d3.geoAlbersUsa()
        .scale(width)
        .translate([width / 2, height / 2]);
    }
    else if ( options.scope === 'world' ) {
      var projection = options.projection.charAt(0).toUpperCase() + options.projection.slice(1);
      
      projection = d3['geo' + projection].call(this)
        .scale((width + 1) / 2 / Math.PI)
        .translate([width / 2, height / (options.projection === "mercator" ? 1.45 : 1.8)]);
    }

    if ( options.projection === 'orthographic' ) {

      svg.append("defs").append("path")
        .datum({type: "Sphere"})
        .attr("id", "sphere")
        .attr("d", path);

      svg.append("use")
          .attr("class", "stroke")
          .attr("xlink:href", "#sphere");

      svg.append("use")
          .attr("class", "fill")
          .attr("xlink:href", "#sphere");
      projection.scale(250).clipAngle(90).rotate(options.projectionConfig.rotation)
    }

    path = d3.geoPath()
      .projection( projection );

    return {path: path, projection: projection};
  }

  function addStyleBlock() {
    if ( d3.select('.datamaps-style-block').empty() ) {
      d3.select('head').append('style').attr('class', 'datamaps-style-block')
      .html('.datamap path.datamaps-graticule { fill: none; stroke: #777; stroke-width: 0.5px; stroke-opacity: .5; pointer-events: none; } .datamap .labels {pointer-events: none;} .datamap path {stroke: #FFFFFF; stroke-width: 1px;} .datamaps-legend dt, .datamaps-legend dd { float: left; margin: 0 3px 0 0;} .datamaps-legend dd {width: 20px; margin-right: 6px; border-radius: 3px;} .datamaps-legend {padding-bottom: 20px; z-index: 1001; position: absolute; left: 4px; font-size: 12px; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;} .datamaps-hoverover {display: none; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; } .hoverinfo {padding: 4px; border-radius: 1px; background-color: #FFF; box-shadow: 1px 1px 5px #CCC; font-size: 12px; border: 1px solid #CCC; } .hoverinfo hr {border:1px dotted #CCC; }');
    }
  }

  function drawSubunits( data ) {
    var fillData = this.options.fills,
        colorCodeData = this.options.data || {},
        geoConfig = this.options.geographyConfig;

    var subunits = this.svg.select('g.datamaps-subunits');
    if ( subunits.empty() ) {
      subunits = this.addLayer('datamaps-subunits', null, true);
    }

    var geoData = topojson.feature( data, data.objects[ this.options.scope ] ).features;
    if ( geoConfig.hideAntarctica ) {
      geoData = geoData.filter(function(feature) {
        return feature.id !== "ATA";
      });
    }

    if ( geoConfig.hideHawaiiAndAlaska ) {
      geoData = geoData.filter(function(feature) {
        return feature.id !== "HI" && feature.id !== 'AK';
      });
    }

    var geo = subunits.selectAll('path.datamaps-subunit').data( geoData );

    geo.enter()
      .append('path')
      .attr('d', this.path)
      .attr('class', function(d) {
        return 'datamaps-subunit ' + d.id;
      })
      .attr('data-info', function(d) {
        return JSON.stringify( colorCodeData[d.id]);
      })
      .style('fill', function(d) {
        // If fillKey - use that
        // Otherwise check 'fill'
        // Otherwise check 'defaultFill'
        var fillColor;

        var datum = colorCodeData[d.id];
        if ( datum && datum.fillKey ) {
          fillColor = fillData[ val(datum.fillKey, {data: colorCodeData[d.id], geography: d}) ];
        }

        if ( typeof fillColor === 'undefined' ) {
          fillColor = val(datum && datum.fillColor, fillData.defaultFill, {data: colorCodeData[d.id], geography: d});
        }

        return fillColor;
      })
      .style('stroke-width', geoConfig.borderWidth)
      .style('stroke-opacity', geoConfig.borderOpacity)
      .style('stroke', geoConfig.borderColor);
  }

  function handleGeographyConfig () {
    var hoverover;
    var svg = this.svg;
    var self = this;
    var options = this.options.geographyConfig;

    if ( options.highlightOnHover || options.popupOnHover ) {
      svg.selectAll('.datamaps-subunit')
        .on('mouseover', function(d) {
          var $this = d3.select(this);
          var datum = self.options.data[d.id] || {};
          if ( options.highlightOnHover ) {
            var previousAttributes = {
              'fill':  $this.style('fill'),
              'stroke': $this.style('stroke'),
              'stroke-width': $this.style('stroke-width'),
              'fill-opacity': $this.style('fill-opacity')
            };

            $this
              .style('fill', val(datum.highlightFillColor, options.highlightFillColor, datum))
              .style('stroke', val(datum.highlightBorderColor, options.highlightBorderColor, datum))
              .style('stroke-width', val(datum.highlightBorderWidth, options.highlightBorderWidth, datum))
              .style('stroke-opacity', val(datum.highlightBorderOpacity, options.highlightBorderOpacity, datum))
              .style('fill-opacity', val(datum.highlightFillOpacity, options.highlightFillOpacity, datum))
              .attr('data-previousAttributes', JSON.stringify(previousAttributes));

            // As per discussion on https://github.com/markmarkoh/datamaps/issues/19
            if ( ! /((MSIE)|(Trident))/.test(navigator.userAgent) ) {
             moveToFront.call(this);
            }
          }

          if ( options.popupOnHover ) {
            self.updatePopup($this, d, options, svg);
          }
        })
        .on('mouseout', function() {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            // Reapply previous attributes
            var previousAttributes = JSON.parse( $this.attr('data-previousAttributes') );
            for ( var attr in previousAttributes ) {
              $this.style(attr, previousAttributes[attr]);
            }
          }
          $this.on('mousemove', null);
          d3.selectAll('.datamaps-hoverover').style('display', 'none');
        });
    }

    function moveToFront() {
      this.parentNode.appendChild(this);
    }
  }

  // Plugin to add a simple map legend
  function addLegend(layer, data, options) {
    data = data || {};
    if ( !this.options.fills ) {
      return;
    }

    var html = '<dl>';
    var label = '';
    if ( data.legendTitle ) {
      html = '<h2>' + data.legendTitle + '</h2>' + html;
    }
    for ( var fillKey in this.options.fills ) {

      if ( fillKey === 'defaultFill') {
        if (! data.defaultFillName ) {
          continue;
        }
        label = data.defaultFillName;
      } else {
        if (data.labels && data.labels[fillKey]) {
          label = data.labels[fillKey];
        } else {
          label= fillKey + ': ';
        }
      }
      html += '<dt>' + label + '</dt>';
      html += '<dd style="background-color:' +  this.options.fills[fillKey] + '">&nbsp;</dd>';
    }
    html += '</dl>';

    var hoverover = d3.select( this.options.element ).append('div')
      .attr('class', 'datamaps-legend')
      .html(html);
  }

    function addGraticule ( layer, options ) {
      var graticule = d3.geoGraticule();
      this.svg.insert("path", '.datamaps-subunits')
        .datum(graticule)
        .attr("class", "datamaps-graticule")
        .attr("d", this.path);
  }

  function handleArcs (layer, data, options) {
    var self = this,
        svg = this.svg;

    if ( !data || (data && !data.slice) ) {
      throw "Datamaps Error - arcs must be an array";
    }

    // For some reason arc options were put in an `options` object instead of the parent arc
    // I don't like this, so to match bubbles and other plugins I'm moving it
    // This is to keep backwards compatability
    for ( var i = 0; i < data.length; i++ ) {
      data[i] = defaults(data[i], data[i].options);
      delete data[i].options;
    }

    if ( typeof options === "undefined" ) {
      options = defaultOptions.arcConfig;
    }

    var arcs = layer.selectAll('path.datamaps-arc').data( data, JSON.stringify );

    var path = d3.geoPath()
        .projection(self.projection);

    arcs
      .enter()
        .append('svg:path')
        .attr('class', 'datamaps-arc')
        .style('stroke-linecap', 'round')
        .style('stroke', function(datum) {
          return val(datum.strokeColor, options.strokeColor, datum);
        })
        .style('fill', 'none')
        .style('stroke-width', function(datum) {
            return val(datum.strokeWidth, options.strokeWidth, datum);
        })
        .attr('d', function(datum) {

            var originXY, destXY;

            if (typeof datum.origin === "string") {
              switch (datum.origin) {
                   case "CAN":
                       originXY = self.latLngToXY(56.624472, -114.665293);
                       break;
                   case "CHL":
                       originXY = self.latLngToXY(-33.448890, -70.669265);
                       break;
                   case "HRV":
                       originXY = self.latLngToXY(45.815011, 15.981919);
                       break;
                   case "IDN":
                       originXY = self.latLngToXY(-6.208763, 106.845599);
                       break;
                   case "JPN":
                       originXY = self.latLngToXY(35.689487, 139.691706);
                       break;
                   case "MYS":
                       originXY = self.latLngToXY(3.139003, 101.686855);
                       break;
                   case "NOR":
                       originXY = self.latLngToXY(59.913869, 10.752245);
                       break;
                   case "USA":
                       originXY = self.latLngToXY(41.140276, -100.760145);
                       break;
                   case "VNM":
                       originXY = self.latLngToXY(21.027764, 105.834160);
                       break;
                   default:
                       originXY = self.path.centroid(svg.select('path.' + datum.origin).data()[0]);
               }
            } else {
              originXY = self.latLngToXY(val(datum.origin.latitude, datum), val(datum.origin.longitude, datum))
            }

            if (typeof datum.destination === 'string') {
              switch (datum.destination) {
                    case "CAN":
                        destXY = self.latLngToXY(56.624472, -114.665293);
                        break;
                    case "CHL":
                        destXY = self.latLngToXY(-33.448890, -70.669265);
                        break;
                    case "HRV":
                        destXY = self.latLngToXY(45.815011, 15.981919);
                        break;
                    case "IDN":
                        destXY = self.latLngToXY(-6.208763, 106.845599);
                        break;
                    case "JPN":
                        destXY = self.latLngToXY(35.689487, 139.691706);
                        break;
                    case "MYS":
                        destXY = self.latLngToXY(3.139003, 101.686855);
                        break;
                    case "NOR":
                        destXY = self.latLngToXY(59.913869, 10.752245);
                        break;
                    case "USA":
                        destXY = self.latLngToXY(41.140276, -100.760145);
                        break;
                    case "VNM":
                        destXY = self.latLngToXY(21.027764, 105.834160);
                        break;
                    default:
                        destXY = self.path.centroid(svg.select('path.' + datum.destination).data()[0]);
              }
            } else {
              destXY = self.latLngToXY(val(datum.destination.latitude, datum), val(datum.destination.longitude, datum));
            }
            var midXY = [ (originXY[0] + destXY[0]) / 2, (originXY[1] + destXY[1]) / 2];
            if (options.greatArc) {
                  // TODO: Move this to inside `if` clause when setting attr `d`
              var greatArc = d3.geoGreatArc()
                  .source(function(d) { return [val(d.origin.longitude, d), val(d.origin.latitude, d)]; })
                  .target(function(d) { return [val(d.destination.longitude, d), val(d.destination.latitude, d)]; });

              return path(greatArc(datum))
            }
            var sharpness = val(datum.arcSharpness, options.arcSharpness, datum);
            return "M" + originXY[0] + ',' + originXY[1] + "S" + (midXY[0] + (50 * sharpness)) + "," + (midXY[1] - (75 * sharpness)) + "," + destXY[0] + "," + destXY[1];
        })
        .attr('data-info', function(datum) {
          return JSON.stringify(datum);
        })
        .on('mouseover', function ( datum ) {
          var $this = d3.select(this);

          if (options.popupOnHover) {
            self.updatePopup($this, datum, options, svg);
          }
        })
        .on('mouseout', function ( datum ) {
          var $this = d3.select(this);

          d3.selectAll('.datamaps-hoverover').style('display', 'none');
        })
        .transition()
          .delay(100)
          .style('fill', function(datum) {
            /*
              Thank you Jake Archibald, this is awesome.
              Source: http://jakearchibald.com/2013/animated-line-drawing-svg/
            */
            var length = this.getTotalLength();
            this.style.transition = this.style.WebkitTransition = 'none';
            this.style.strokeDasharray = length + ' ' + length;
            this.style.strokeDashoffset = length;
            this.getBoundingClientRect();
            this.style.transition = this.style.WebkitTransition = 'stroke-dashoffset ' + val(datum.animationSpeed, options.animationSpeed, datum) + 'ms ease-out';
            this.style.strokeDashoffset = '0';
            return 'none';
          })

    arcs.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }

  function handleLabels ( layer, options ) {
    var self = this;
    options = options || {};
    var labelStartCoodinates = this.projection([-67.707617, 42.722131]);
    this.svg.selectAll(".datamaps-subunit")
      .attr("data-foo", function(d) {
        var center = self.path.centroid(d);
        if ( d.properties.iso === 'USA' ) {
            center = self.projection([-98.58333, 39.83333])
        }
        var xOffset = 7.5, yOffset = 5;

        if ( ["FL", "KY", "MI"].indexOf(d.id) > -1 ) xOffset = -2.5;
        if ( d.id === "NY" ) xOffset = -1;
        if ( d.id === "MI" ) yOffset = 18;
        if ( d.id === "LA" ) xOffset = 13;

        var x,y;

        x = center[0] - xOffset;
        y = center[1] + yOffset;

        var smallStateIndex = ["VT", "NH", "MA", "RI", "CT", "NJ", "DE", "MD", "DC"].indexOf(d.id);
        if ( smallStateIndex > -1) {
          var yStart = labelStartCoodinates[1];
          x = labelStartCoodinates[0];
          y = yStart + (smallStateIndex * (2+ (options.fontSize || 12)));
          layer.append("line")
            .attr("x1", x - 3)
            .attr("y1", y - 5)
            .attr("x2", center[0])
            .attr("y2", center[1])
            .style("stroke", options.labelColor || "#000")
            .style("stroke-width", options.lineWidth || 1)
        }

          layer.append("text")
              .attr("x", x)
              .attr("y", y)
              .style("font-size", (options.fontSize || 10) + 'px')
              .style("font-family", options.fontFamily || "Verdana")
              .style("fill", options.labelColor || "#000")
              .text(function() {
                  if (options.customLabelText && options.customLabelText[d.id]) {
                      return options.customLabelText[d.id]
                  } else {
                      return d.id
                  }
              });

        return "bar";
      });
  }


  function handleBubbles (layer, data, options ) {
    var self = this,
        fillData = this.options.fills,
        filterData = this.options.filters,
        svg = this.svg;

    if ( !data || (data && !data.slice) ) {
      throw "Datamaps Error - bubbles must be an array";
    }

    var bubbles = layer.selectAll('circle.datamaps-bubble').data( data, options.key );

    bubbles
      .enter()
        .append('svg:circle')
        .attr('class', 'datamaps-bubble')
        .attr('cx', function ( datum ) {
          var latLng;
          if ( datumHasCoords(datum) ) {
            latLng = self.latLngToXY(datum.latitude, datum.longitude);
          }
          else if ( datum.centered ) {
            if ( datum.centered === 'USA' ) {
              latLng = self.projection([-98.58333, 39.83333])
            } else {
              latLng = self.path.centroid(svg.select('path.' + datum.centered).data()[0]);
            }
          }
          if ( latLng ) return latLng[0];
        })
        .attr('cy', function ( datum ) {
          var latLng;
          if ( datumHasCoords(datum) ) {
            latLng = self.latLngToXY(datum.latitude, datum.longitude);
          }
          else if ( datum.centered ) {
            if ( datum.centered === 'USA' ) {
              latLng = self.projection([-98.58333, 39.83333])
            } else {
              latLng = self.path.centroid(svg.select('path.' + datum.centered).data()[0]);
            }
          }
          if ( latLng ) return latLng[1];
        })
        .attr('r', function(datum) {
          // If animation enabled start with radius 0, otherwise use full size.
          return options.animate ? 0 : val(datum.radius, options.radius, datum);
        })
        .attr('data-info', function(datum) {
          return JSON.stringify(datum);
        })
        .attr('filter', function (datum) {
          var filterKey = filterData[ val(datum.filterKey, options.filterKey, datum) ];

          if (filterKey) {
            return filterKey;
          }
        })
        .style('stroke', function ( datum ) {
          return val(datum.borderColor, options.borderColor, datum);
        })
        .style('stroke-width', function ( datum ) {
          return val(datum.borderWidth, options.borderWidth, datum);
        })
        .style('stroke-opacity', function ( datum ) {
          return val(datum.borderOpacity, options.borderOpacity, datum);
        })
        .style('fill-opacity', function ( datum ) {
          return val(datum.fillOpacity, options.fillOpacity, datum);
        })
        .style('fill', function ( datum ) {
          var fillColor = fillData[ val(datum.fillKey, options.fillKey, datum) ];
          return fillColor || fillData.defaultFill;
        })
        .on('mouseover', function ( datum ) {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            // Save all previous attributes for mouseout
            var previousAttributes = {
              'fill':  $this.style('fill'),
              'stroke': $this.style('stroke'),
              'stroke-width': $this.style('stroke-width'),
              'fill-opacity': $this.style('fill-opacity')
            };

            $this
              .style('fill', val(datum.highlightFillColor, options.highlightFillColor, datum))
              .style('stroke', val(datum.highlightBorderColor, options.highlightBorderColor, datum))
              .style('stroke-width', val(datum.highlightBorderWidth, options.highlightBorderWidth, datum))
              .style('stroke-opacity', val(datum.highlightBorderOpacity, options.highlightBorderOpacity, datum))
              .style('fill-opacity', val(datum.highlightFillOpacity, options.highlightFillOpacity, datum))
              .attr('data-previousAttributes', JSON.stringify(previousAttributes));
          }

          if (options.popupOnHover) {
            self.updatePopup($this, datum, options, svg);
          }
        })
        .on('mouseout', function ( datum ) {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            // Reapply previous attributes
            var previousAttributes = JSON.parse( $this.attr('data-previousAttributes') );
            for ( var attr in previousAttributes ) {
              $this.style(attr, previousAttributes[attr]);
            }
          }

          d3.selectAll('.datamaps-hoverover').style('display', 'none');
        })

    bubbles.transition()
      .duration(400)
      .attr('r', function ( datum ) {
        return val(datum.radius, options.radius, datum);
      })
    .transition()
      .duration(0)
      .attr('data-info', function(d) {
        return JSON.stringify(d);
      });

    bubbles.exit()
      .transition()
        .delay(options.exitDelay)
        .attr("r", 0)
        .remove();

    function datumHasCoords (datum) {
      return typeof datum !== 'undefined' && typeof datum.latitude !== 'undefined' && typeof datum.longitude !== 'undefined';
    }
  }

  function defaults(obj) {
    Array.prototype.slice.call(arguments, 1).forEach(function(source) {
      if (source) {
        for (var prop in source) {
          // Deep copy if property not set
          if (obj[prop] == null) {
            if (typeof source[prop] == 'function') {
              obj[prop] = source[prop];
            }
            else {
              obj[prop] = JSON.parse(JSON.stringify(source[prop]));
            }
          }
        }
      }
    });
    return obj;
  }
  /**************************************
             Public Functions
  ***************************************/

  function Datamap( options ) {
    if ( typeof d3 === 'undefined' || typeof topojson === 'undefined' ) {
      throw new Error('Include d3.js (v5.0.0 or greater) and topojson on this page before creating a new map');
    }

    // Set options for global use
    this.options = defaults(options, defaultOptions);
    this.options.geographyConfig = defaults(options.geographyConfig, defaultOptions.geographyConfig);
    this.options.projectionConfig = defaults(options.projectionConfig, defaultOptions.projectionConfig);
    this.options.bubblesConfig = defaults(options.bubblesConfig, defaultOptions.bubblesConfig);
    this.options.arcConfig = defaults(options.arcConfig, defaultOptions.arcConfig);

    // if responsive is check, we remove all width/height definition
    if (options.responsive) {
      this.options.width = undefined;
      this.options.height = undefined;
    }
    
    if (options.width && options.height && options.width > 0 && options.height > 0) {
      this.options.aspectRatio = options.height / options.width;
    }

    // Add the SVG container if not already added manually
    this.svg = d3.select(this.options.element).select('svg');
    
    if (this.svg.size() === 0) {
      this.svg = addContainer.call(this, this.options.element, this.options.height, this.options.width);
    }

    // Add zoom  and seting up
    this.zoom = d3.zoom()
      .on("zoom", this.zoomed)
      .scaleExtent(this.options.zoomScale)
      .extent([[0, 0], [this.svg.attr('data-width'), this.svg.attr('height')]])
      .translateExtent([[0, 0], [this.svg.attr('data-width'), this.svg.attr('height')]])
    ;

      // Attach to the svg
    this.svg.call(this.zoom);

    // Add core plugins to this instance
    this.addPlugin('bubbles', handleBubbles);
    this.addPlugin('legend', addLegend);
    this.addPlugin('arc', handleArcs);
    this.addPlugin('labels', handleLabels);
    this.addPlugin('graticule', addGraticule);

    // Append style block with basic hoverover styles
    if ( ! this.options.disableDefaultStyles ) {
      addStyleBlock();
    }

    return this.draw();
  }

  // Resize map
  Datamap.prototype.resize = function () {
    var self = this;
    var options = self.options;

    if (!options.responsive) {
      return;
    }

    var svg = d3.select(options.element).select('svg'),
        newHeight = (options.element.clientWidth * options.aspectRatio),
        g = svg.select('.datamaps-subunits'),
        cgSize = g.node().getBoundingClientRect(),
        cTransform = d3.zoomTransform(svg.node()),
        newTransform = d3.zoomIdentity.scale(cTransform.k)
    ;

    // resize svg himself
    svg
      .attr('height', newHeight)
      .attr('width', options.element.clientWidth)

    // resize container height for recalculate path geo data
    d3.select(options.element)
      .style('height', newHeight)
      .style('min-height', newHeight)
      .style('max-height', newHeight)
    ;

    // redraw subunit
    g.selectAll('path').remove();

    // resize options
    this.options.height = newHeight;
    this.options.width = options.element.clientWidth;
    this.path = this.options.setProjection.call(this, options.element, options).path;
    
    // draw subunits
    drawSubunits.call(this, this[options.scope + 'Topo'] || this.options.geographyConfig.dataJson);
    // Add subunits events
    handleGeographyConfig.call(this);
    
    // rezoom at the same point
    var ngSize = g.node().getBoundingClientRect();
    
    // rescale if the actual scale is not into the limit
    newTransform.x = cTransform.x / (cgSize.width / ngSize.width);
    newTransform.y = cTransform.y / (cgSize.height / ngSize.height);
    
    this.zoom
      .extent([
        [0, 0],
        [options.element.clientWidth, newHeight]
      ])
      .translateExtent([
        [0, 0],
        [options.element.clientWidth, newHeight]
      ]);
    
    svg.call(this.zoom.transform, newTransform);
  }
  
  Datamap.prototype.zoomed = function () {
    d3.select(this)
      .select('g.datamaps-subunits').attr('transform', d3.event.transform);
  }

  // Actually draw the features(states & countries)
  Datamap.prototype.draw = function() {
    // Save off in a closure
    var self = this;
    var options = self.options;

    // Set projections and paths based on scope
    var pathAndProjection = options.setProjection.apply(this, [options.element, options] );

    this.path = pathAndProjection.path;
    this.projection = pathAndProjection.projection;

    // If custom URL for topojson data, retrieve it and render
    if ( options.geographyConfig.dataUrl ) {
      d3.json( options.geographyConfig.dataUrl, function(error, results) {
        if ( error ) throw new Error(error);
        self.customTopo = results;
        draw( results );
      });
    }
    else {
      draw( this[options.scope + 'Topo'] || options.geographyConfig.dataJson);
    }

    return this;

      function draw (data) {
        // If fetching remote data, draw the map first then call `updateChoropleth`
        if ( self.options.dataUrl ) {
          // Allow for csv or json data types
          d3[self.options.dataType](self.options.dataUrl, function(data) {
            // In the case of csv, transform data to object
            if ( self.options.dataType === 'csv' && (data && data.slice) ) {
              var tmpData = {};
              for(var i = 0; i < data.length; i++) {
                tmpData[data[i].id] = data[i];
              }
              data = tmpData;
            }
            Datamaps.prototype.updateChoropleth.call(self, data);
          });
        }
        drawSubunits.call(self, data);
        handleGeographyConfig.call(self);

        if ( self.options.geographyConfig.popupOnHover || self.options.bubblesConfig.popupOnHover) {
          hoverover = d3.select( self.options.element ).append('div')
            .attr('class', 'datamaps-hoverover')
            .style('z-index', 10001)
            .style('position', 'absolute');
        }

        // Fire off finished callback
        self.options.done(self);
      }
  };
  /**************************************
                TopoJSON
  ***************************************/
  Datamap.prototype.worldTopo = '__WORLD__';
  Datamap.prototype.abwTopo = '__ABW__';
  Datamap.prototype.afgTopo = '__AFG__';
  Datamap.prototype.agoTopo = '__AGO__';
  Datamap.prototype.aiaTopo = '__AIA__';
  Datamap.prototype.albTopo = '__ALB__';
  Datamap.prototype.aldTopo = '__ALD__';
  Datamap.prototype.andTopo = '__AND__';
  Datamap.prototype.areTopo = '__ARE__';
  Datamap.prototype.argTopo = '__ARG__';
  Datamap.prototype.armTopo = '__ARM__';
  Datamap.prototype.asmTopo = '__ASM__';
  Datamap.prototype.ataTopo = '__ATA__';
  Datamap.prototype.atcTopo = '__ATC__';
  Datamap.prototype.atfTopo = '__ATF__';
  Datamap.prototype.atgTopo = '__ATG__';
  Datamap.prototype.ausTopo = '__AUS__';
  Datamap.prototype.autTopo = '__AUT__';
  Datamap.prototype.azeTopo = '__AZE__';
  Datamap.prototype.bdiTopo = '__BDI__';
  Datamap.prototype.belTopo = '__BEL__';
  Datamap.prototype.benTopo = '__BEN__';
  Datamap.prototype.bfaTopo = '__BFA__';
  Datamap.prototype.bgdTopo = '__BGD__';
  Datamap.prototype.bgrTopo = '__BGR__';
  Datamap.prototype.bhrTopo = '__BHR__';
  Datamap.prototype.bhsTopo = '__BHS__';
  Datamap.prototype.bihTopo = '__BIH__';
  Datamap.prototype.bjnTopo = '__BJN__';
  Datamap.prototype.blmTopo = '__BLM__';
  Datamap.prototype.blrTopo = '__BLR__';
  Datamap.prototype.blzTopo = '__BLZ__';
  Datamap.prototype.bmuTopo = '__BMU__';
  Datamap.prototype.bolTopo = '__BOL__';
  Datamap.prototype.braTopo = '__BRA__';
  Datamap.prototype.brbTopo = '__BRB__';
  Datamap.prototype.brnTopo = '__BRN__';
  Datamap.prototype.btnTopo = '__BTN__';
  Datamap.prototype.norTopo = '__NOR__';
  Datamap.prototype.bwaTopo = '__BWA__';
  Datamap.prototype.cafTopo = '__CAF__';
  Datamap.prototype.canTopo = '__CAN__';
  Datamap.prototype.cheTopo = '__CHE__';
  Datamap.prototype.chlTopo = '__CHL__';
  Datamap.prototype.chnTopo = '__CHN__';
  Datamap.prototype.civTopo = '__CIV__';
  Datamap.prototype.clpTopo = '__CLP__';
  Datamap.prototype.cmrTopo = '__CMR__';
  Datamap.prototype.codTopo = '__COD__';
  Datamap.prototype.cogTopo = '__COG__';
  Datamap.prototype.cokTopo = '__COK__';
  Datamap.prototype.colTopo = '__COL__';
  Datamap.prototype.comTopo = '__COM__';
  Datamap.prototype.cpvTopo = '__CPV__';
  Datamap.prototype.criTopo = '__CRI__';
  Datamap.prototype.csiTopo = '__CSI__';
  Datamap.prototype.cubTopo = '__CUB__';
  Datamap.prototype.cuwTopo = '__CUW__';
  Datamap.prototype.cymTopo = '__CYM__';
  Datamap.prototype.cynTopo = '__CYN__';
  Datamap.prototype.cypTopo = '__CYP__';
  Datamap.prototype.czeTopo = '__CZE__';
  Datamap.prototype.deuTopo = '__DEU__';
  Datamap.prototype.djiTopo = '__DJI__';
  Datamap.prototype.dmaTopo = '__DMA__';
  Datamap.prototype.dnkTopo = '__DNK__';
  Datamap.prototype.domTopo = '__DOM__';
  Datamap.prototype.dzaTopo = '__DZA__';
  Datamap.prototype.ecuTopo = '__ECU__';
  Datamap.prototype.egyTopo = '__EGY__';
  Datamap.prototype.eriTopo = '__ERI__';
  Datamap.prototype.esbTopo = '__ESB__';
  Datamap.prototype.espTopo = '__ESP__';
  Datamap.prototype.estTopo = '__EST__';
  Datamap.prototype.ethTopo = '__ETH__';
  Datamap.prototype.finTopo = '__FIN__';
  Datamap.prototype.fjiTopo = '__FJI__';
  Datamap.prototype.flkTopo = '__FLK__';
  Datamap.prototype.fraTopo = '__FRA__';
  Datamap.prototype.froTopo = '__FRO__';
  Datamap.prototype.fsmTopo = '__FSM__';
  Datamap.prototype.gabTopo = '__GAB__';
  Datamap.prototype.psxTopo = '__PSX__';
  Datamap.prototype.gbrTopo = '__GBR__';
  Datamap.prototype.geoTopo = '__GEO__';
  Datamap.prototype.ggyTopo = '__GGY__';
  Datamap.prototype.ghaTopo = '__GHA__';
  Datamap.prototype.gibTopo = '__GIB__';
  Datamap.prototype.ginTopo = '__GIN__';
  Datamap.prototype.gmbTopo = '__GMB__';
  Datamap.prototype.gnbTopo = '__GNB__';
  Datamap.prototype.gnqTopo = '__GNQ__';
  Datamap.prototype.grcTopo = '__GRC__';
  Datamap.prototype.grdTopo = '__GRD__';
  Datamap.prototype.grlTopo = '__GRL__';
  Datamap.prototype.gtmTopo = '__GTM__';
  Datamap.prototype.gumTopo = '__GUM__';
  Datamap.prototype.guyTopo = '__GUY__';
  Datamap.prototype.hkgTopo = '__HKG__';
  Datamap.prototype.hmdTopo = '__HMD__';
  Datamap.prototype.hndTopo = '__HND__';
  Datamap.prototype.hrvTopo = '__HRV__';
  Datamap.prototype.htiTopo = '__HTI__';
  Datamap.prototype.hunTopo = '__HUN__';
  Datamap.prototype.idnTopo = '__IDN__';
  Datamap.prototype.imnTopo = '__IMN__';
  Datamap.prototype.indTopo = '__IND__';
  Datamap.prototype.ioaTopo = '__IOA__';
  Datamap.prototype.iotTopo = '__IOT__';
  Datamap.prototype.irlTopo = '__IRL__';
  Datamap.prototype.irnTopo = '__IRN__';
  Datamap.prototype.irqTopo = '__IRQ__';
  Datamap.prototype.islTopo = '__ISL__';
  Datamap.prototype.isrTopo = '__ISR__';
  Datamap.prototype.itaTopo = '__ITA__';
  Datamap.prototype.jamTopo = '__JAM__';
  Datamap.prototype.jeyTopo = '__JEY__';
  Datamap.prototype.jorTopo = '__JOR__';
  Datamap.prototype.jpnTopo = '__JPN__';
  Datamap.prototype.kabTopo = '__KAB__';
  Datamap.prototype.kasTopo = '__KAS__';
  Datamap.prototype.kazTopo = '__KAZ__';
  Datamap.prototype.kenTopo = '__KEN__';
  Datamap.prototype.kgzTopo = '__KGZ__';
  Datamap.prototype.khmTopo = '__KHM__';
  Datamap.prototype.kirTopo = '__KIR__';
  Datamap.prototype.knaTopo = '__KNA__';
  Datamap.prototype.korTopo = '__KOR__';
  Datamap.prototype.kosTopo = '__KOS__';
  Datamap.prototype.kwtTopo = '__KWT__';
  Datamap.prototype.laoTopo = '__LAO__';
  Datamap.prototype.lbnTopo = '__LBN__';
  Datamap.prototype.lbrTopo = '__LBR__';
  Datamap.prototype.lbyTopo = '__LBY__';
  Datamap.prototype.lcaTopo = '__LCA__';
  Datamap.prototype.lieTopo = '__LIE__';
  Datamap.prototype.lkaTopo = '__LKA__';
  Datamap.prototype.lsoTopo = '__LSO__';
  Datamap.prototype.ltuTopo = '__LTU__';
  Datamap.prototype.luxTopo = '__LUX__';
  Datamap.prototype.lvaTopo = '__LVA__';
  Datamap.prototype.macTopo = '__MAC__';
  Datamap.prototype.mafTopo = '__MAF__';
  Datamap.prototype.marTopo = '__MAR__';
  Datamap.prototype.mcoTopo = '__MCO__';
  Datamap.prototype.mdaTopo = '__MDA__';
  Datamap.prototype.mdgTopo = '__MDG__';
  Datamap.prototype.mdvTopo = '__MDV__';
  Datamap.prototype.mexTopo = '__MEX__';
  Datamap.prototype.mhlTopo = '__MHL__';
  Datamap.prototype.mkdTopo = '__MKD__';
  Datamap.prototype.mliTopo = '__MLI__';
  Datamap.prototype.mltTopo = '__MLT__';
  Datamap.prototype.mmrTopo = '__MMR__';
  Datamap.prototype.mneTopo = '__MNE__';
  Datamap.prototype.mngTopo = '__MNG__';
  Datamap.prototype.mnpTopo = '__MNP__';
  Datamap.prototype.mozTopo = '__MOZ__';
  Datamap.prototype.mrtTopo = '__MRT__';
  Datamap.prototype.msrTopo = '__MSR__';
  Datamap.prototype.musTopo = '__MUS__';
  Datamap.prototype.mwiTopo = '__MWI__';
  Datamap.prototype.mysTopo = '__MYS__';
  Datamap.prototype.namTopo = '__NAM__';
  Datamap.prototype.nclTopo = '__NCL__';
  Datamap.prototype.nerTopo = '__NER__';
  Datamap.prototype.nfkTopo = '__NFK__';
  Datamap.prototype.ngaTopo = '__NGA__';
  Datamap.prototype.nicTopo = '__NIC__';
  Datamap.prototype.niuTopo = '__NIU__';
  Datamap.prototype.nldTopo = '__NLD__';
  Datamap.prototype.nplTopo = {"type":"Topology","objects":{"npl":{"type":"GeometryCollection","geometries":[{"type":"Polygon","properties":{"name":"Gandaki"},"id":"NP.PM","arcs":[[0,1,2,3,4]]},{"type":"Polygon","properties":{"name":"Bheri"},"id":"NP.MP","arcs":[[5,6,7,8]]},{"type":"Polygon","properties":{"name":"Dhawalagiri"},"id":"NP.PM","arcs":[[-4,9,10,11,12]]},{"type":"Polygon","properties":{"name":"Karnali"},"id":"NP.MP","arcs":[[-12,13,-9,14,15]]},{"type":"Polygon","properties":{"name":"Lumbini"},"id":"NP.PM","arcs":[[-3,16,17,18,-10]]},{"type":"Polygon","properties":{"name":"Mahakali"},"id":"NP.SP","arcs":[[19,20]]},{"type":"Polygon","properties":{"name":"Seti"},"id":"NP.SP","arcs":[[-8,21,-20,22,-15]]},{"type":"Polygon","properties":{"name":"Bagmati"},"id":"NP.MM","arcs":[[23,24,-1,25]]},{"type":"Polygon","properties":{"name":"Janakpur"},"id":"NP.MM","arcs":[[26,27,28,-24,29]]},{"type":"Polygon","properties":{"name":"Narayani"},"id":"NP.MM","arcs":[[-25,-29,30,-17,-2]]},{"type":"Polygon","properties":{"name":"Sagarmatha"},"id":"NP.PW","arcs":[[31,32,-27,33]]},{"type":"Polygon","properties":{"name":"Bhojpur"},"id":"NP.PW","arcs":[[34,35,-32,36]]},{"type":"Polygon","properties":{"name":"Mechi"},"id":"NP.PW","arcs":[[-35,37]]},{"type":"Polygon","properties":{"name":"Rapti"},"id":"NP.MP","arcs":[[-11,-19,38,-6,-14]]}]}},"arcs":[[[6206,4880],[-23,-21],[-18,-34],[-24,-87],[-13,-23],[-49,-71],[-17,-36],[-12,-38],[-20,-139],[-15,-52],[-13,-25],[-12,-14],[-33,-11],[-25,-17],[-22,-25],[-12,-21],[-9,-21],[-64,-215],[-18,-38],[-37,-66],[-7,-23],[-2,-27],[3,-16],[5,-22],[23,-74],[6,-36],[2,-34],[-4,-51],[-7,-24],[-9,-16],[-9,-5],[-10,-3],[-12,0],[-12,3],[-10,6],[-10,10],[-7,15],[-6,14],[-6,14],[-4,5],[-13,15]],[[5681,3677],[-14,41],[-14,29],[-12,15],[-11,10],[-12,7],[-13,3],[-11,-4],[-8,-5],[-26,-38],[-66,-80],[-55,-42],[-10,-19],[-3,-39],[5,-24],[6,-16],[5,-9],[6,-10],[1,-15],[-5,-7],[-42,9],[-18,-11]],[[5384,3472],[-14,42],[-12,21],[-22,-3],[-17,-24],[-14,-28],[-14,-12],[-11,2],[-8,5],[-5,12],[-2,22],[-3,22],[-16,18],[-6,20],[-4,41],[-1,31],[-7,25],[-21,22],[-53,18],[-111,2],[-52,21],[-24,27],[-44,66],[-25,19],[-30,-6],[-55,-55],[-29,-13],[-17,3],[-33,14],[-17,4],[-14,-5],[-28,-19],[-12,-2],[-18,18],[-34,63],[-21,21],[-29,6],[-100,-2],[-21,-22],[-10,-4],[-43,29],[-14,0],[-17,15],[-20,5],[-35,-2],[-36,11],[-14,-3],[-13,-26],[-18,26],[-21,20],[-11,21],[8,33],[18,19],[21,-2],[37,-17],[45,13],[38,37],[18,54]],[[4373,4075],[70,38],[15,25],[15,40],[32,141],[9,57],[5,19],[25,56],[15,46],[16,32],[14,21],[19,77],[-1,60],[-5,22],[-21,37],[-8,22],[-11,45],[-13,32],[-9,26],[-12,82],[-28,84],[22,23],[9,15],[10,24],[19,103],[9,35],[24,58],[3,4],[18,38],[9,31],[4,35],[-5,60],[7,36],[6,23],[51,82],[-4,36],[-4,18],[-52,108],[-6,24],[3,12],[9,15],[17,19],[30,28],[79,119],[12,25],[15,47],[10,18],[17,12],[24,1],[24,-7],[20,4],[19,12],[33,38],[31,45],[9,17],[14,18],[18,14],[52,12],[16,9],[33,37],[38,16],[11,9]],[[5154,6310],[12,-35],[62,-64],[84,-31],[15,-11],[13,-19],[20,-61],[26,-39],[10,-22],[19,-113],[16,-48],[31,-16],[28,2],[21,-16],[20,-22],[24,-15],[68,-20],[11,-11],[12,-43],[8,-18],[24,-16],[24,-9],[14,-20],[-6,-113],[16,-21],[56,-5],[23,-21],[33,-65],[21,-30],[16,-12],[14,-3],[68,7],[15,-4],[20,-12],[14,-3],[12,7],[10,15],[15,58],[7,15],[37,35],[11,5],[11,9],[8,20],[12,42],[8,21],[8,14],[28,12],[25,-18],[45,-56],[60,-34],[9,-29],[-14,-122],[-4,-21],[-7,-22],[-9,-12],[-21,-15],[-7,-18],[-2,-15],[0,-46],[-8,-33],[-32,-33],[-7,-25],[10,-134],[0,-48],[-5,-73]],[[3118,6484],[-57,-90],[-15,-65],[-5,-34],[-11,-43],[-15,-34],[-134,-185],[-71,-78],[-14,-23],[-45,-117],[-25,-46],[-15,-23],[-23,-23],[-7,-15],[-7,-20],[-26,-88],[-31,-30],[-53,-3],[-19,3],[-16,8],[-55,39],[-44,-94],[-9,-36],[-5,-38],[2,-21],[19,-74],[5,-37],[2,-54],[-6,-32],[-7,-26],[-8,-15],[-6,-7],[-30,-21],[-11,-11],[-9,-20],[-2,-18],[5,-21],[7,-16],[7,-21],[5,-28],[0,-91],[7,-23],[75,-54],[25,-51],[13,-55],[28,-77],[-65,-61],[-18,-88],[-16,-46],[-2,-23],[5,-26],[10,-22],[38,-53],[11,-18],[20,-48],[8,-14],[11,-5],[10,-1],[11,-3],[10,-12],[56,-89],[10,-32],[6,-31],[0,-40],[-2,-53],[-1,-13],[-3,-12],[-4,-11],[-8,-13],[-7,-9],[-13,-9],[-26,-9],[-10,-1],[-23,5],[-6,0],[-7,-5],[-6,-7],[-38,-66],[-6,-26],[0,-1]],[[2482,3834],[-29,17],[-63,11],[-36,-29],[-49,-103],[-29,-35],[-33,5],[-35,36],[-34,45],[-61,63],[-49,93],[-26,39],[-29,18],[-62,26],[-24,33],[-1,0],[-15,45],[-25,32],[-109,99],[-19,27],[-5,22],[-1,26],[-6,35],[-16,45],[-22,43],[-26,33],[-28,18],[-19,-5],[-8,-22],[-5,-31],[-11,-28],[-18,-16],[-20,-6],[-14,11],[4,35],[-20,8],[-8,19],[5,20],[19,14],[-17,59],[-71,145],[-17,69],[-25,146],[-25,57],[-29,27],[-122,41]],[[1249,5021],[0,1],[1,39],[14,96],[14,32],[41,45],[15,20],[171,331],[9,20],[11,22],[8,56],[3,49],[-4,45],[-40,159],[-14,77],[-6,82],[-13,36],[-16,28],[-18,17],[5,-32],[16,-54],[4,-31],[-49,50],[-11,-6],[-17,65],[-15,25],[-16,-5],[-17,-17],[-17,-9],[-20,22],[-46,66],[-60,112],[6,29],[20,33],[26,27],[24,11],[25,-6],[26,-16],[49,-45],[63,-88],[26,-12],[79,19],[27,-3],[13,-10],[29,-33],[12,-7],[107,23],[21,-12],[20,-44],[18,-70],[53,-108],[-4,-77],[13,-14],[2,-14],[-15,-22],[0,-17],[12,-1],[10,4],[20,14],[30,32],[-3,28],[-17,29],[-10,38],[-6,60],[-18,49],[-43,84],[-64,169],[-17,18],[-15,44],[-9,55],[3,51],[58,115],[14,19],[18,11],[80,104]],[[1865,6829],[32,-66],[2,-62],[-2,-23],[0,-18],[8,-11],[22,-14],[44,-13],[100,-61],[67,-20],[21,-11],[18,-19],[28,-23],[24,-14],[99,-15],[110,89],[25,-15],[5,-7],[3,-4],[1,-1],[8,-27],[7,-16],[11,-10],[16,1],[15,10],[19,37],[7,26],[8,20],[9,15],[12,14],[9,17],[14,43],[9,16],[12,15],[121,96],[19,7],[94,-3],[56,-46],[5,-29],[1,-21],[-1,-24],[-2,-23],[-2,-18],[-4,-17],[-3,-26],[0,-14],[2,-15],[6,-13],[7,-10],[26,-19],[10,-4],[11,0],[14,8],[10,9],[1,2],[4,7],[13,14],[27,-4],[75,-55]],[[4373,4075],[-17,65],[-11,8],[-9,-3],[-8,4],[-7,26],[-1,28],[4,13],[-2,19],[-8,15],[-57,87],[-13,15],[-16,11],[-25,8],[-35,3],[-17,10],[-19,25],[-12,23],[-8,25],[-11,19],[-15,18],[-27,25],[-16,10],[-33,3],[-18,9],[-24,26],[-67,105],[-26,18],[-20,10],[-97,-31]],[[3758,4669],[-6,66],[-16,39],[-27,46],[-115,156],[-13,67],[-8,19],[-16,27],[-10,22],[-15,60],[-12,19],[-8,24],[30,80],[-15,22],[-1,19],[8,25],[21,37],[19,13],[15,3],[14,-1],[9,8],[7,25],[-1,21],[-4,16],[-13,31],[-4,17],[14,19],[29,25],[65,31],[65,52],[41,99],[13,50],[6,69]],[[3830,5875],[35,-9],[33,-20],[19,-4],[29,2],[40,-10],[22,0],[59,21],[26,18],[28,27],[110,73],[17,40],[41,203],[22,69],[68,154],[11,17],[7,23],[6,37],[10,190],[6,29],[12,28],[14,21],[11,26],[5,20],[-8,84]],[[4453,6914],[1,1],[10,35],[5,43],[9,40],[25,43],[30,18],[31,2],[31,-5],[28,6],[55,47],[29,15],[9,8],[10,33],[8,13],[38,18],[23,6],[15,0],[15,-7],[12,-10],[7,-19],[3,-33],[16,14],[15,8],[14,-6],[11,-26],[17,-29],[22,6],[24,17],[21,-1],[12,-24],[7,-66],[9,-27],[17,-7],[19,5],[17,-4],[8,-35],[-8,-40],[-17,-39],[-11,-40],[7,-47],[27,-47],[7,-18],[5,-23],[7,-77],[28,-30],[27,-16],[13,-32],[-30,-209],[23,-65]],[[3830,5875],[-48,20],[-183,163],[-25,16],[-18,6],[-75,-10],[-63,10],[-16,-3],[-12,-8],[-22,-7],[-17,11],[-58,71],[-8,20],[-2,25],[1,33],[0,38],[-4,31],[-6,20],[-48,87],[-21,31],[-16,17],[-71,38]],[[1865,6829],[-16,30],[-16,23],[-36,40],[-10,13],[-5,32],[-3,39],[10,151],[-10,39],[-5,24],[-1,25],[6,24],[11,26],[38,68],[19,25],[51,28],[17,5],[24,1],[9,-4],[9,-9],[31,-49],[13,-10],[15,-1],[22,5],[43,23],[7,44],[-13,39],[-12,47],[-6,57],[1,57],[4,49],[8,40],[13,32],[48,58],[20,33],[8,52],[1,38],[-1,52],[-5,22],[-7,16],[-24,12],[-6,3],[-20,16],[-16,19],[-14,23],[-12,30],[-7,42],[-2,30],[1,20],[34,190],[6,62],[3,79],[3,30],[4,19],[7,14],[16,22],[9,15],[8,16],[5,18],[2,20],[-1,28],[-5,23],[-12,18],[-17,10],[-47,17],[-21,13],[-16,22],[-15,11],[-22,6],[-92,-3],[-14,-4],[-13,-6],[-26,-27],[-31,-80],[-8,-9],[-6,0],[-10,4],[-11,11],[-26,34],[-5,20],[-1,21],[4,46],[0,28],[-2,23],[-5,22],[-5,16],[-6,16],[-12,44],[-8,39],[-4,6],[-7,4],[-27,0],[-41,-9],[-11,5],[-10,10],[-15,23],[-11,13],[-26,19],[-27,33],[-12,12]],[[1520,9152],[6,20],[4,38],[-1,16],[-10,39],[0,18],[14,16],[19,3],[20,-2],[15,4],[20,24],[14,34],[9,40],[6,76],[15,45],[5,24],[-2,21],[-7,39],[-2,22],[-1,86],[4,39],[13,35],[6,34],[-3,39],[3,31],[25,13],[23,-16],[45,-76],[25,-24],[32,-8],[14,8],[14,95],[6,20],[9,10],[23,7],[17,13],[6,21],[4,21],[8,16],[28,6],[26,-15],[150,-118],[26,-11],[28,8],[26,16],[27,8],[52,-40],[42,6],[25,-9],[11,-13],[14,-36],[9,-14],[12,-3],[12,7],[12,11],[11,6],[52,6],[29,-5],[19,-17],[5,-38],[-13,-141],[3,-65],[14,-42],[22,-28],[32,-20],[19,-31],[-6,-47],[-28,-93],[1,-34],[8,-51],[11,-50],[12,-28],[25,-6],[22,14],[23,8],[55,-61],[25,-7],[25,0],[28,-12],[10,-15],[15,-41],[10,-14],[20,-6],[19,6],[19,-1],[18,-21],[16,-36],[20,-34],[22,-29],[23,-21],[60,-32],[22,-23],[94,-205],[21,-26],[13,1],[25,14],[13,-2],[14,-16],[1,-20],[-6,-25],[-4,-29],[12,-42],[74,-101],[23,-62],[14,-22],[14,-14],[15,-9],[13,-14],[8,-30],[18,-45],[25,16],[28,37],[24,18],[12,-10],[18,-36],[10,-14],[12,-3],[28,7],[14,-4],[70,-107],[10,-25],[16,-60],[13,-17],[18,2],[8,26],[3,34],[6,27],[9,6],[32,14],[29,6],[15,-2],[14,-9],[17,-23],[4,-12],[4,-33],[4,-11],[9,-10],[21,-13],[9,-9],[29,-51],[10,-33],[3,-36],[-4,-21],[-7,-13],[-7,-17],[-2,-29],[21,-53],[78,29],[34,-59],[3,-44],[-3,-37],[2,-31],[37,-53],[3,-27],[-1,-30],[5,-35],[15,-24],[16,-13],[13,-19],[11,-69],[13,-21],[34,-24],[22,-26],[11,-38],[12,-92],[3,-53],[3,-25],[8,-20],[15,-10],[31,-8],[13,-19],[15,-15],[50,-17],[18,-1],[19,13]],[[5384,3472],[12,-44],[4,-28],[-5,-36],[-12,-27],[-34,-38],[-34,23],[-31,-28],[-31,-42],[-34,-21],[-20,3],[-15,7],[-13,1],[-15,-11],[-23,-60],[-16,-21],[-20,15],[-28,-58],[-50,-148],[-15,-30],[-42,52],[-25,-30],[-27,-4],[-83,20],[-15,0],[-10,-5],[-10,-16],[-7,-22],[1,-19],[12,-8],[25,-1],[4,-12],[-13,-30],[-9,-27],[-1,-28],[2,-28],[-4,-27],[-20,-28],[-1,-1]],[[4781,2715],[-27,-14],[-57,-8],[-24,-17],[11,-39],[35,-70],[3,-23],[5,-25],[-1,-20],[-12,-8],[-7,-10],[-9,-23],[-1,3],[-7,12],[-56,36],[-170,163],[-90,60],[-135,32],[-115,2],[-32,-20],[-6,-24],[-3,-30],[3,-29],[18,-45],[-1,-30],[-9,-30],[-26,-71],[-21,-37],[-24,-24],[-28,-3],[-28,18],[-12,25],[-8,34],[-14,47],[-15,31],[-61,91],[-45,32],[-151,-2],[-77,35],[-57,56],[-31,18],[-152,18],[-28,57],[-13,93],[-12,184],[-15,94],[-21,62],[-7,5]],[[3248,3321],[3,21],[9,56],[7,28],[5,15],[6,13],[9,12],[13,12],[23,13],[19,4],[61,-10],[54,31],[-29,52],[-56,47],[-15,20],[2,15],[3,9],[42,82],[55,85],[30,16],[29,-10],[15,-2],[16,5],[15,9],[36,39],[40,25],[7,11],[6,15],[-4,27],[-4,14],[-8,15],[-11,14],[-8,23],[-4,39],[12,78],[6,65],[16,85],[32,51],[10,18],[6,20],[-2,31],[-5,23],[-23,54],[-5,24],[1,24],[9,25],[16,25],[55,47],[16,33]],[[1295,9044],[-26,-34],[-20,-31],[-36,-91],[-16,-55],[-6,-32],[1,-16],[6,-9],[9,-11],[10,-15],[8,-20],[5,-23],[3,-24],[5,-60],[20,-138],[2,-82],[-8,-41],[-14,-26],[-16,-9],[-27,-4],[-8,-4],[-39,-38],[-11,-6],[-10,-2],[-11,1],[-13,-1],[-46,-19],[-36,-27],[-24,-34],[-17,-12],[-15,-4],[-21,6],[-16,-7],[-31,-43],[-4,-14],[-4,-22],[3,-16],[6,-22],[5,-28],[4,-38],[0,-57],[-5,-29],[-8,-24],[-13,-21],[-10,-37],[3,-24],[13,-16],[35,-16],[27,-6],[7,-4],[5,-7],[2,-4],[27,-65],[61,-105],[-39,-88],[-39,-40],[-53,-29],[-18,-32],[-18,-77],[-16,-51],[-8,-37],[-5,-34],[-3,-32],[-7,-47],[-15,-41],[-23,-56],[-16,-26],[-18,-20],[-59,-32],[-21,-21],[-34,-56],[-12,-31],[-7,-33],[-2,-18],[-9,-18],[-3,-16],[-5,-64],[-18,-36],[-7,-35],[-8,-50],[-20,-70],[12,-137],[-7,-182],[1,-32],[2,-26],[4,-15],[6,-21],[17,-51],[7,-27],[9,-49],[2,-29],[-2,-179],[0,-5],[0,-1]],[[619,5734],[-20,1],[-25,-24],[-12,-34],[-3,-42],[10,-156],[-6,-32],[-24,23],[-52,110],[-23,23],[-24,3],[-24,-12],[-24,-6],[-24,18],[-14,31],[-34,122],[-9,14],[-22,9],[-10,9],[-10,18],[-13,40],[-7,16],[-20,22],[-44,13],[-23,15],[-18,25],[-41,96],[-40,41],[-10,4],[-23,8],[-23,32],[-7,99],[1,50],[3,44],[9,42],[15,40],[19,26],[20,19],[18,24],[10,42],[0,1],[-4,80],[11,110],[24,93],[38,33],[21,-5],[25,-1],[24,12],[15,33],[-3,38],[-21,102],[7,36],[21,5],[15,-22],[12,-4],[25,161],[5,57],[-3,46],[-9,14],[-11,-1],[-11,3],[-7,25],[-9,100],[-26,80],[-9,41],[5,44],[13,17],[36,21],[7,22],[4,32],[8,16],[11,14],[11,25],[1,0],[25,33],[10,19],[9,22],[0,13],[-3,13],[-2,15],[5,17],[7,10],[15,14],[7,10],[27,54],[15,50],[2,54],[-11,65],[-17,65],[-12,62],[0,62],[18,68],[32,46],[74,34],[26,39],[63,138],[27,77],[16,88],[11,42],[18,18],[44,10],[24,13],[15,17],[32,53],[44,52],[12,23],[37,103],[17,31],[74,98],[25,65],[-17,65],[18,29],[21,45],[20,25],[12,-30],[12,-44],[21,-9],[83,49],[9,1],[13,-20],[16,-41],[14,-47],[16,-80],[28,-81],[10,-38],[12,-108]],[[1249,5021],[-57,19],[-9,27],[-2,31],[-5,26],[-14,14],[-19,-11],[-24,1],[-24,9],[-20,11],[-23,29],[-6,35],[-2,37],[-10,37],[-17,13],[-50,1],[-23,7],[-21,22],[-47,87],[-20,24],[-38,19],[-21,18],[-13,28],[-25,82],[-15,20],[-46,15],[-21,12],[-22,20],[-8,20],[1,23],[2,21],[-4,15],[-27,1]],[[1295,9044],[1,-4],[15,-23],[33,14],[29,2],[57,-46],[28,9],[13,35],[-2,68],[17,21],[21,12],[12,15],[1,5]],[[7401,3791],[-22,-110],[-5,-59],[3,-87],[-1,-53],[-4,-24],[-8,-14],[-28,-9],[-7,-5],[-12,-22],[-17,-43],[-19,-77],[-15,-44],[-15,-36],[-48,-93],[-59,-129],[-6,-35],[-13,-47],[-8,-23],[-14,-25],[-6,-16],[0,-1],[0,-1],[6,-34],[2,-15],[6,-100],[-29,-57],[-71,-22],[-15,-15],[-6,-17],[-1,-21],[-3,-25],[-11,-34],[-14,-11],[-17,-2],[-176,20],[-9,5],[-8,8],[-26,37]],[[6725,2555],[-30,52],[-31,29],[-37,19],[-39,13],[-54,16],[-77,77],[-17,27],[-12,25],[-5,24],[0,3],[-4,57],[-3,15],[-5,13],[-6,14],[-5,16],[-5,15],[-2,28],[-10,155],[-16,91],[-6,19],[-7,13],[-13,9],[-60,22],[-63,51],[-21,11],[-17,5],[-84,-7],[-13,-5],[-34,-20],[-26,-4],[-27,-12],[-27,-31],[-20,-10],[-14,-3],[-78,14],[-14,79],[-6,14],[-10,16],[-12,12],[-91,6],[-20,7],[-5,11],[-1,11],[6,18],[-1,15],[-4,19],[-16,38],[-8,26],[-5,20],[-2,16],[1,13],[2,14],[8,30],[2,16]],[[6206,4880],[-2,-32],[9,-36],[27,-29],[30,0],[26,21],[23,9],[39,-64],[23,-16],[24,-9],[20,-3],[16,7],[34,28],[15,4],[16,-13],[11,-22],[13,-18],[21,-4],[19,16],[29,56],[17,19],[20,1],[18,-12],[36,-32],[27,9],[28,0],[29,-6],[26,-12],[25,-30],[16,-30],[16,0],[34,91],[9,14],[26,17],[9,14],[1,21],[0,24],[4,20],[17,6],[6,-54],[2,-109],[20,-63],[23,-53],[27,-45],[32,-37],[54,-44],[27,-28],[18,-38],[5,-26],[6,-54],[21,-51],[2,-23],[-1,-23],[1,-30],[9,-57],[13,-33],[43,-68],[16,-46],[-1,-47],[-5,-49],[-1,-51],[14,-61],[22,-15],[57,12],[30,-6],[4,1]],[[7969,3996],[23,-40],[36,-102],[8,-63],[0,-67],[7,-124],[11,-69],[1,-52],[4,-40],[-5,-25],[-6,-19],[-9,-25],[-9,-36],[-13,-71],[-12,-51],[-14,-33],[-15,-18],[-29,-18],[-27,-9],[-11,-7],[-9,-8],[-40,-71],[-18,-24],[-61,-123],[-110,-182],[-19,-49],[-21,-83],[-10,-55],[-3,-22],[0,-20],[2,-18],[11,-53],[2,-22],[-3,-30],[-6,-40],[-32,-97],[0,-16],[20,-10],[68,3],[40,-16],[19,-11],[10,-12],[8,-22],[9,-18],[6,-9],[38,-42],[5,-9],[4,-8],[-8,-24],[-37,-81],[-33,-51],[-1,-14],[4,-12],[6,-9],[6,-11],[6,-14],[11,-61],[9,-71],[0,-72],[-4,-36],[-8,-22],[-51,-27],[-33,-40],[-35,-91],[-30,-21],[-12,3],[-16,7],[-32,26],[-11,0],[-11,-10],[-17,-35],[-5,-19],[-3,-15],[-1,-17],[2,-15],[10,-50],[3,-32],[0,-123],[2,-26],[3,-24],[5,-28],[8,-28],[22,-60],[7,-23],[4,-29],[-2,-23],[-4,-22],[-57,-221],[-2,-6],[0,-1]],[[7514,632],[-2,1],[-28,-3],[-7,5],[-7,11],[-85,95],[-37,22],[-44,-25],[-29,-6],[-21,-22],[-84,-130],[-27,-28],[-19,-6],[-9,14],[-2,19],[-1,21],[-2,21],[-10,15],[-11,-5],[-13,-9],[-11,5],[-66,94],[-18,39],[-13,86],[9,182],[-9,84],[-17,37],[-97,96],[-13,8],[-97,-68],[-54,-52],[-44,-43],[-23,-13],[-22,13],[-21,2],[-21,-33],[-17,-37]],[[6542,1022],[0,1],[-2,100],[3,50],[11,78],[19,89],[40,107],[7,27],[4,28],[2,43],[-2,31],[-2,23],[-3,14],[-2,22],[-1,19],[3,28],[5,29],[18,58],[78,194],[8,55],[3,62],[3,19],[2,13],[3,11],[2,20],[0,29],[-7,57],[-7,32],[-7,22],[-6,13],[-7,12],[-10,13],[-30,28],[-11,15],[-6,16],[-4,21],[0,22],[2,17],[20,42],[57,73]],[[7401,3791],[9,2],[17,15],[39,68],[7,10],[-1,26],[-6,17],[-8,15],[-6,18],[-1,27],[4,22],[0,20],[-11,22],[-13,16],[-1,14],[2,16],[0,20],[5,41],[1,14],[-4,19],[-14,37],[-1,24],[107,196],[24,-9],[13,-47],[1,-61],[-8,-49],[-10,-42],[3,-23],[9,-18],[9,-28],[8,-71],[9,-30],[18,-18],[0,-1],[25,-13],[25,-4],[24,-10],[20,-28],[29,-65],[12,-15],[12,-4],[10,7],[10,9],[11,4],[11,-11],[42,-61],[24,-17],[16,2],[45,41],[27,25],[16,36],[8,47]],[[6542,1022],[-2,-6],[-20,-27],[-43,-23],[-18,-1],[-114,54],[-36,67],[0,85],[-4,74],[-48,36],[-28,-5],[-69,-49],[-32,5],[-2,33],[2,38],[-21,19],[-16,4],[-15,7],[-28,27],[-11,44],[-7,51],[-18,47],[-27,28],[-62,37],[-28,31],[-1,1],[-13,38],[-19,8],[-20,-13],[-17,-23],[-13,0],[-148,72],[-16,20],[-7,52],[10,56],[18,57],[12,53],[7,97],[-3,94],[-12,92],[-20,89],[-31,82],[-36,46],[-353,115],[-27,31],[-23,58],[-12,46],[-17,23],[-37,-11],[-12,7],[-13,60],[-11,22],[-30,21],[-13,14],[-12,21],[-5,45],[-22,9],[-24,-18],[-62,-137],[-27,-32],[-39,-3],[-49,16],[-16,10],[-1,-1]],[[8541,3945],[0,-4],[-3,-154],[13,-110],[9,-50],[2,-24],[0,-13],[-7,-48],[-2,-57],[10,-101],[0,-34],[-2,-25],[-23,-144],[-23,-247],[-6,-33],[-12,-99],[-5,-26],[-14,-29],[-22,-45],[-3,-15],[-6,-35],[15,-90],[49,-149],[4,-41],[-1,-33],[-4,-16],[-6,-15],[-9,-9],[-11,-9],[-10,-10],[-6,-14],[-4,-38],[7,-109],[-1,-45],[-10,-149],[3,-36],[7,-31],[24,-45],[12,-30],[5,-29],[11,-373],[41,-12],[146,60],[44,2],[20,-14],[5,-44],[-6,-49],[-5,-18],[-6,-51],[-2,-16],[-7,-29],[-17,-25],[-34,-39],[-86,-162],[-28,-22],[-19,-31],[-28,-205],[-18,-54],[-6,-31],[3,-24],[4,-18],[2,-27],[1,-28],[-2,-21],[-10,-25],[-27,-45],[-4,-19],[0,-1]],[[8483,433],[-34,-21],[-39,-41],[-12,-55],[-24,-49],[-30,-35],[-31,-17],[-12,4],[-43,31],[-17,-5],[-9,-24],[-8,-29],[-13,-18],[-23,9],[-86,93],[-82,68],[-25,27],[-17,35],[-17,27],[-19,19],[-24,10],[-37,27],[-75,73],[-37,24],[-11,0],[-27,-6],[-9,2],[-8,18],[-1,34],[-9,17],[-20,8],[-27,-8],[-46,-28],[-28,-32],[-8,-5],[-13,5],[-8,10],[-5,12],[-9,8],[-18,10],[-8,1]],[[7969,3996],[0,57],[-1,43],[8,28],[10,25],[10,33],[3,36],[0,40],[4,36],[11,28],[20,6],[17,-22],[16,-28],[19,-15],[19,8],[27,43],[15,14],[23,-3],[24,-17],[22,-26],[17,-27],[5,-30],[-4,-73],[9,-33],[37,-23],[87,6],[34,-49],[10,-59],[20,-41],[27,-22],[31,-5],[37,11],[15,8]],[[9396,3608],[-29,-148],[-27,-99],[-19,-53],[-14,-27],[-12,-13],[-9,0],[-10,7],[-7,11],[-9,9],[-9,3],[-10,-6],[-5,-19],[-10,-88],[-14,-66],[-14,-44],[-24,-54],[-13,-42],[-9,-39],[-15,-100],[-12,-145],[-9,-62],[-4,-44],[-1,-37],[5,-29],[7,-23],[74,-142],[9,-13],[13,-11],[55,-19],[119,-87],[52,-36],[19,-24],[5,-17],[3,-15],[0,-16],[-3,-13],[-8,-16],[-18,-31],[-6,-19],[-2,-24],[-4,-21],[-6,-19],[-9,-13],[-11,-11],[-55,-35],[-15,-13],[-31,-43],[-69,-128],[-58,-128],[-24,-41],[27,-70],[28,-142],[10,-29],[10,-20],[21,-22],[49,-35],[2,-2],[61,-148],[18,-66],[2,-18],[1,-39],[-27,-206],[-3,-535],[2,-37],[6,-33]],[[9360,163],[-31,-42],[-45,-37],[-43,21],[-88,90],[-38,13],[-41,-4],[-39,-20],[-34,-37],[-14,-35],[-23,-89],[-15,-23],[-17,5],[-52,42],[-16,18],[-11,32],[-8,38],[-13,23],[-38,-21],[-65,-13],[-36,26],[-28,67],[-20,82],[-13,72],[-14,121],[-1,42],[-3,46],[-15,-1],[-17,-26],[-37,-70],[-16,-21],[-46,-29]],[[8541,3945],[8,4],[21,-2],[30,-33],[39,-73],[67,-157],[48,-46],[32,-3],[63,13],[71,-34],[28,31],[27,44],[35,21],[26,-14],[-6,-33],[-14,-41],[0,-37],[22,1],[109,54],[48,21],[21,4],[24,-12],[6,-12],[4,-19],[7,-20],[10,-15],[21,-1],[38,37],[18,10],[30,-9],[22,-16]],[[9396,3608],[27,-19],[33,5],[36,31],[29,47],[23,59],[19,67],[14,38],[14,5],[24,-24],[96,-8],[13,-8],[26,-23],[15,-5],[16,5],[33,23],[14,3],[28,-17],[53,-52],[28,-11],[30,-12],[16,-11],[11,-15],[2,-29],[-15,-45],[6,-101],[-12,-62],[-18,-63],[-29,-205],[-77,-231],[-31,-124],[-2,-26],[2,-24],[6,-48],[3,-11],[11,-20],[2,-11],[-2,-21],[-6,-14],[-6,-12],[-5,-16],[-11,-57],[-3,-27],[2,-34],[5,-27],[15,-47],[3,-28],[-7,-60],[-30,-120],[-19,-76],[-5,-172],[-18,-71],[-2,-21],[2,-20],[6,-18],[20,-34],[22,-88],[22,-25],[19,-16],[16,-27],[26,-64],[24,-80],[19,-86],[10,-38],[28,-75],[10,-38],[5,-42],[5,-106],[10,-97],[2,-46],[-2,-47],[-5,-49],[-21,-108],[-55,-194],[-18,-105],[-9,-53],[0,-25],[3,-31],[-10,-101],[-36,-118],[-47,-88],[-38,-8],[-17,30],[-40,43],[-17,29],[-8,24],[-8,43],[-6,20],[-3,-2],[-30,44],[-1,10],[-21,-10],[-38,-57],[-21,0],[-23,21],[-21,13],[-15,-11],[-9,-52],[-8,-37],[-18,-17],[-21,5],[-16,26],[-20,20],[-27,-17],[-13,-18]],[[3248,3321],[-27,19],[-155,-71],[-105,-22],[-47,26],[-67,120],[-95,85],[-147,215],[-53,38],[-21,21],[-23,44],[-25,37],[-1,1]]],"transform":{"scale":[0.0008139593663366394,0.0004073543747374736],"translate":[80.03028772000005,26.343767802000087]}};
  Datamap.prototype.nruTopo = '__NRU__';
  Datamap.prototype.nulTopo = '__NUL__';
  Datamap.prototype.nzlTopo = '__NZL__';
  Datamap.prototype.omnTopo = '__OMN__';
  Datamap.prototype.pakTopo = '__PAK__';
  Datamap.prototype.panTopo = '__PAN__';
  Datamap.prototype.pcnTopo = '__PCN__';
  Datamap.prototype.perTopo = '__PER__';
  Datamap.prototype.pgaTopo = '__PGA__';
  Datamap.prototype.phlTopo = '__PHL__';
  Datamap.prototype.plwTopo = '__PLW__';
  Datamap.prototype.pngTopo = '__PNG__';
  Datamap.prototype.polTopo = '__POL__';
  Datamap.prototype.priTopo = '__PRI__';
  Datamap.prototype.prkTopo = '__PRK__';
  Datamap.prototype.prtTopo = '__PRT__';
  Datamap.prototype.pryTopo = '__PRY__';
  Datamap.prototype.pyfTopo = '__PYF__';
  Datamap.prototype.qatTopo = '__QAT__';
  Datamap.prototype.rouTopo = '__ROU__';
  Datamap.prototype.rusTopo = '__RUS__';
  Datamap.prototype.rwaTopo = '__RWA__';
  Datamap.prototype.sahTopo = '__SAH__';
  Datamap.prototype.sauTopo = '__SAU__';
  Datamap.prototype.scrTopo = '__SCR__';
  Datamap.prototype.sdnTopo = '__SDN__';
  Datamap.prototype.sdsTopo = '__SDS__';
  Datamap.prototype.senTopo = '__SEN__';
  Datamap.prototype.serTopo = '__SER__';
  Datamap.prototype.sgpTopo = '__SGP__';
  Datamap.prototype.sgsTopo = '__SGS__';
  Datamap.prototype.shnTopo = '__SHN__';
  Datamap.prototype.slbTopo = '__SLB__';
  Datamap.prototype.sleTopo = '__SLE__';
  Datamap.prototype.slvTopo = '__SLV__';
  Datamap.prototype.smrTopo = '__SMR__';
  Datamap.prototype.solTopo = '__SOL__';
  Datamap.prototype.somTopo = '__SOM__';
  Datamap.prototype.spmTopo = '__SPM__';
  Datamap.prototype.srbTopo = '__SRB__';
  Datamap.prototype.stpTopo = '__STP__';
  Datamap.prototype.surTopo = '__SUR__';
  Datamap.prototype.svkTopo = '__SVK__';
  Datamap.prototype.svnTopo = '__SVN__';
  Datamap.prototype.sweTopo = '__SWE__';
  Datamap.prototype.swzTopo = '__SWZ__';
  Datamap.prototype.sxmTopo = '__SXM__';
  Datamap.prototype.sycTopo = '__SYC__';
  Datamap.prototype.syrTopo = '__SYR__';
  Datamap.prototype.tcaTopo = '__TCA__';
  Datamap.prototype.tcdTopo = '__TCD__';
  Datamap.prototype.tgoTopo = '__TGO__';
  Datamap.prototype.thaTopo = '__THA__';
  Datamap.prototype.tjkTopo = '__TJK__';
  Datamap.prototype.tkmTopo = '__TKM__';
  Datamap.prototype.tlsTopo = '__TLS__';
  Datamap.prototype.tonTopo = '__TON__';
  Datamap.prototype.ttoTopo = '__TTO__';
  Datamap.prototype.tunTopo = '__TUN__';
  Datamap.prototype.turTopo = '__TUR__';
  Datamap.prototype.tuvTopo = '__TUV__';
  Datamap.prototype.twnTopo = '__TWN__';
  Datamap.prototype.tzaTopo = '__TZA__';
  Datamap.prototype.ugaTopo = '__UGA__';
  Datamap.prototype.ukrTopo = '__UKR__';
  Datamap.prototype.umiTopo = '__UMI__';
  Datamap.prototype.uryTopo = '__URY__';
  Datamap.prototype.usaTopo = '__USA__';
  Datamap.prototype.usgTopo = '__USG__';
  Datamap.prototype.uzbTopo = '__UZB__';
  Datamap.prototype.vatTopo = '__VAT__';
  Datamap.prototype.vctTopo = '__VCT__';
  Datamap.prototype.venTopo = '__VEN__';
  Datamap.prototype.vgbTopo = '__VGB__';
  Datamap.prototype.virTopo = '__VIR__';
  Datamap.prototype.vnmTopo = '__VNM__';
  Datamap.prototype.vutTopo = '__VUT__';
  Datamap.prototype.wlfTopo = '__WLF__';
  Datamap.prototype.wsbTopo = '__WSB__';
  Datamap.prototype.wsmTopo = '__WSM__';
  Datamap.prototype.yemTopo = '__YEM__';
  Datamap.prototype.zafTopo = '__ZAF__';
  Datamap.prototype.zmbTopo = '__ZMB__';
  Datamap.prototype.zweTopo = '__ZWE__';

  /**************************************
                Utilities
  ***************************************/

  // Convert lat/lng coords to X / Y coords
  Datamap.prototype.latLngToXY = function(lat, lng) {
     return this.projection([lng, lat]);
  };

  // Add <g> layer to root SVG
  Datamap.prototype.addLayer = function( className, id, first ) {
    var layer;
    if ( first ) {
      layer = this.svg.insert('g', ':first-child')
    }
    else {
      layer = this.svg.append('g')
    }
    return layer.attr('id', id || '')
      .attr('class', className || '');
  };

  Datamap.prototype.updateChoropleth = function(data, options) {
    var svg = this.svg;
    var that = this;

    // When options.reset = true, reset all the fill colors to the defaultFill and kill all data-info
    if ( options && options.reset === true ) {
      svg.selectAll('.datamaps-subunit')
        .attr('data-info', function() {
           return "{}"
        })
        .transition().style('fill', this.options.fills.defaultFill)
    }

    for ( var subunit in data ) {
      if ( data.hasOwnProperty(subunit) ) {
        var color,
            subunitData = data[subunit],
            geo = this.svg.select('.' + subunit);
        
        if (!subunit || geo.size() === 0) {
          continue;
        } else if ( typeof subunitData === "string" ) {
          color = subunitData;
        } else if ( typeof subunitData.color === "string" ) {
          color = subunitData.color;
        } else if ( typeof subunitData.fillColor === "string" ) {
          color = subunitData.fillColor;
        } else {
          color = this.options.fills[ subunitData.fillKey ];
        }
        
        color = d3.color(color).formatRgb();
        
        // If it's an object, overriding the previous data
        if ( subunitData === Object(subunitData) ) {
          this.options.data[subunit] = defaults(subunitData, this.options.data[subunit] || {});
          this.svg.select('.' + subunit).attr('data-info', JSON.stringify(this.options.data[subunit]));
          
          // change color into previousAttribute (The highlightOnHover must rollback the color to the new one)
          if (this.options.geographyConfig.highlightOnHover) {
            var previousAttributes = JSON.parse(geo.attr('data-previousAttributes'));
            
            if (previousAttributes !== null) {
              previousAttributes.fill = color;
              geo.attr('data-previousAttributes', JSON.stringify(previousAttributes));
            }
          }
        }
        
        svg
          .select('.' + subunit)
          .transition()
            .style('fill', color);
      }
    }
  };

  Datamap.prototype.updatePopup = function (element, d, options) {
    var self = this,
        parentNode = self.svg.select(function () { return this.parentNode; });
    
    element.on('mousemove', function() {
      var position = d3.mouse(self.options.element),
          parentRect = parentNode.node().getBoundingClientRect();
      
      parentNode.select('.datamaps-hoverover')
        .style('top', ( (parentRect.top + position[1] + 30)) + "px")
        .html(function() {
          var data = JSON.parse(element.attr('data-info'));
          try {
            return options.popupTemplate(d, data);
          } catch (e) {
            return "";
          }
        })
        .style('left', (parentRect.left + position[0]) + "px");
    });

    parentNode.select('.datamaps-hoverover').style('display', 'block');
  };

  Datamap.prototype.addPlugin = function( name, pluginFn ) {
    var self = this;
    if ( typeof Datamap.prototype[name] === "undefined" ) {
      Datamap.prototype[name] = function(data, options, callback, createNewLayer) {
        var layer;
        if ( typeof createNewLayer === "undefined" ) {
          createNewLayer = false;
        }

        if ( typeof options === 'function' ) {
          callback = options;
          options = undefined;
        }

        options = defaults(options || {}, self.options[name + 'Config']);

        // Add a single layer, reuse the old layer
        if ( !createNewLayer && this.options[name + 'Layer'] ) {
          layer = this.options[name + 'Layer'];
          options = options || this.options[name + 'Options'];
        }
        else {
          layer = this.addLayer(name);
          this.options[name + 'Layer'] = layer;
          this.options[name + 'Options'] = options;
        }
        pluginFn.apply(this, [layer, data, options]);
        if ( callback ) {
          callback(layer);
        }
      };
    }
  };

  // Expose library
  if (typeof exports === 'object') {
    d3 = require('d3');
    topojson = require('topojson');
    module.exports = Datamap;
  }
  else if ( typeof define === "function" && define.amd ) {
    define( "datamaps", ["require", "d3", "topojson"], function(require) {
      d3 = require('d3');
      topojson = require('topojson');

      return Datamap;
    });
  }
  else {
    window.Datamap = window.Datamaps = Datamap;
  }

  if ( window.jQuery ) {
    window.jQuery.fn.datamaps = function(options, callback) {
      options = options || {};
      options.element = this[0];
      var datamap = new Datamap(options);
      if ( typeof callback === "function" ) {
        callback(datamap, options);
      }
      return this;
    };
  }
})();
