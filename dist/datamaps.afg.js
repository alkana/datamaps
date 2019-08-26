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
    drawSubunits.call(this, this[options.scope + 'Topo'] || this.options.geographyConfig.dataJson);

    // rezoom at the same point
    var ngSize = g.node().getBoundingClientRect();
    
    // rescale if the actual scale is not into the limit
    newTransform.x = cTransform.x / (cgSize.width / ngSize.width);
    newTransform.y = cTransform.y / (cgSize.height / ngSize.height);
    
    this.zoom.extent([
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
  Datamap.prototype.afgTopo = {"type":"Topology","objects":{"afg":{"type":"GeometryCollection","geometries":[{"type":"Polygon","properties":{"name":"Badghis"},"id":"AF.BG","arcs":[[0,1,2,3]]},{"type":"Polygon","properties":{"name":"Hirat"},"id":"AF.HR","arcs":[[-2,4,5,6]]},{"type":"Polygon","properties":{"name":"Bamyan"},"id":"AF.BM","arcs":[[7,8,9,10,11,12,13,14]]},{"type":"Polygon","properties":{"name":"Balkh"},"id":"AF.BK","arcs":[[15,16,17,18,19]]},{"type":"Polygon","properties":{"name":"Faryab"},"id":"AF.FB","arcs":[[20,21,-4,22,23]]},{"type":"Polygon","properties":{"name":"Jawzjan"},"id":"AF.JW","arcs":[[-19,24,-24,25]]},{"type":"Polygon","properties":{"name":"Ghor"},"id":"AF.GR","arcs":[[-13,26,27,28,-5,-1,-22,29]]},{"type":"Polygon","properties":{"name":"Sari Pul"},"id":"AF.SP","arcs":[[30,-14,-30,-21,-25,-18]]},{"type":"Polygon","properties":{"name":"Farah"},"id":"AF.FH","arcs":[[31,32,33,-6,-29]]},{"type":"Polygon","properties":{"name":"Hilmand"},"id":"AF.HM","arcs":[[34,35,36,37,38,-32,-28]]},{"type":"Polygon","properties":{"name":"Nimroz"},"id":"AF.NM","arcs":[[-39,39,-33]]},{"type":"Polygon","properties":{"name":"Uruzgan"},"id":"AF.OZ","arcs":[[40,41,42,-36,43]]},{"type":"Polygon","properties":{"name":"Uruzgan"},"id":"AF.OZ","arcs":[[-12,44,-44,-35,-27]]},{"type":"Polygon","properties":{"name":"Kandahar"},"id":"AF.KD","arcs":[[45,46,-37,-43]]},{"type":"Polygon","properties":{"name":"Zabul"},"id":"AF.ZB","arcs":[[47,48,-46,-42,49]]},{"type":"Polygon","properties":{"name":"Ghazni"},"id":"AF.GZ","arcs":[[50,51,52,-50,-41,-45,-11,53]]},{"type":"Polygon","properties":{"name":"Khost"},"id":"AF.KT","arcs":[[54,55,56]]},{"type":"Polygon","properties":{"name":"Paktika"},"id":"AF.PK","arcs":[[-55,57,-48,-53,58]]},{"type":"Polygon","properties":{"name":"Badakhshan"},"id":"AF.BD","arcs":[[59,60,61,62]]},{"type":"Polygon","properties":{"name":"Nuristan"},"id":"AF.NR","arcs":[[63,64,65,-60,66]]},{"type":"Polygon","properties":{"name":"Kunar"},"id":"AF.KR","arcs":[[67,68,-64,69]]},{"type":"Polygon","properties":{"name":"Kunduz"},"id":"AF.KZ","arcs":[[70,71,72,-16,73]]},{"type":"Polygon","properties":{"name":"Nangarhar"},"id":"AF.NG","arcs":[[74,75,76,77,78,-68]]},{"type":"Polygon","properties":{"name":"Takhar"},"id":"AF.TK","arcs":[[-62,79,80,-71,81]]},{"type":"Polygon","properties":{"name":"Baghlan"},"id":"AF.BL","arcs":[[-81,82,83,-8,84,-72]]},{"type":"Polygon","properties":{"name":"Kabul"},"id":"AF.KB","arcs":[[85,86,-78,87,88,89]]},{"type":"Polygon","properties":{"name":"Kapisa"},"id":"AF.KP","arcs":[[90,-86,91,92]]},{"type":"Polygon","properties":{"name":"Parwan"},"id":"AF.PV","arcs":[[-61,-66,93,-93,94,-83,-80]]},{"type":"Polygon","properties":{"name":"Laghman"},"id":"AF.LA","arcs":[[-69,-79,-87,-91,-94,-65]]},{"type":"Polygon","properties":{"name":"Logar"},"id":"AF.LW","arcs":[[-77,95,-51,96,-88]]},{"type":"Polygon","properties":{"name":"Parwan"},"id":"AF.PV","arcs":[[-95,-92,-90,97,-9,-84]]},{"type":"Polygon","properties":{"name":"Samangan"},"id":"AF.SM","arcs":[[-73,-85,-15,-31,-17]]},{"type":"Polygon","properties":{"name":"Wardak"},"id":"AF.VR","arcs":[[-89,-97,-54,-10,-98]]},{"type":"Polygon","properties":{"name":"Paktya"},"id":"AF.PT","arcs":[[-76,98,-56,-59,-52,-96]]}]}},"arcs":[[[2945,6411],[14,-37],[10,-14],[30,-25],[5,-2],[4,-1],[17,2],[9,-4],[7,-6],[7,-8],[10,-16],[17,-33],[5,-7],[43,-40],[9,-15],[5,-13],[1,-10],[3,-11],[6,-14],[12,-22],[5,-13],[2,-12],[-2,-11],[-7,-37],[-1,-12],[0,-10],[2,-19],[-1,-9],[-4,-28],[-4,-14],[-6,-20],[-3,-5],[-3,-4],[-3,-2],[-4,-7],[-21,-13],[-124,-45],[-46,-30],[-8,-3],[-8,0],[-5,2],[-10,1],[-6,3],[-11,7],[-85,5],[-14,-6],[-9,-6],[-6,-9],[-4,-7],[-1,-4],[-3,-12]],[[2769,5815],[-77,-7],[-4,1],[-18,10],[-9,4],[-8,2],[-68,1],[-6,-1],[-9,-4],[-10,-7],[-17,-16],[-8,-9],[-4,-8],[-4,-19],[-1,-4],[-1,-2],[-4,-4],[-4,-2],[-17,-3],[-7,-3],[-46,-49],[-144,-56],[-13,-2],[-6,2],[-9,8],[-6,7],[-20,15],[-53,21],[-11,-7],[-11,-4],[-8,0],[-40,9],[-12,5],[-29,21],[-7,7],[-10,13],[-23,17],[-50,24],[-59,8],[-22,3],[-8,-2],[-6,-5],[-24,-28],[-11,-3],[-44,28],[-22,5],[-20,6],[-9,-1],[-2,1],[-1,1],[-1,2],[1,31],[-4,15],[-4,8],[-2,3],[-3,3],[-10,22],[-3,4],[-4,1],[-13,-2],[-26,0],[-6,2],[-8,5],[-9,7],[-8,8],[-6,8],[-5,6],[-4,3],[-20,7],[-5,3],[-8,5],[-18,19],[-24,31],[-6,5],[-4,2],[-3,0],[-5,-1],[-6,-1],[-5,1],[-31,17],[-3,2],[-2,4],[-2,7],[-5,21],[-2,11],[0,13],[8,123],[6,40],[12,55],[7,22],[59,127],[27,101],[0,9]],[[1622,6537],[3,2],[63,65],[46,29],[14,4],[29,3],[14,5],[9,13],[4,20],[3,42],[7,34],[-2,12],[-12,12],[-2,14],[-2,56],[2,16],[18,24],[53,22],[20,18],[4,10],[0,8],[-3,6],[-18,9],[-5,5],[-9,17],[-36,41],[-4,14],[-3,20],[-7,14],[-5,14],[3,19],[11,14],[14,4],[151,-4],[61,16],[56,34],[10,12],[17,29],[10,13],[12,9],[15,4],[85,7],[28,9],[65,49],[21,9],[12,2]],[[2374,7312],[20,-15],[8,-33],[0,-49],[-3,-43],[-12,-71],[-6,-24],[-1,-19],[1,-23],[-1,-5],[-11,-22],[-7,-26],[-2,-12],[2,-9],[4,-3],[5,-2],[8,-2],[9,-5],[6,-5],[7,-6],[12,-16],[8,-13],[10,-22],[6,-21],[2,-19],[4,-77],[-1,-11],[-1,-9],[-2,-11],[0,-6],[1,-4],[3,-4],[3,-4],[4,-3],[7,-5],[111,-10],[42,-11],[5,-6],[3,-6],[2,-7],[1,-6],[-1,-5],[-1,-5],[-1,-3],[-5,-8],[0,-8],[25,-19],[8,-4],[5,-1],[13,5],[8,1],[25,11],[30,5],[6,-7],[1,-10],[0,-14],[-3,-25],[-7,-33],[0,-11],[0,-18],[-3,-40],[-1,-18],[2,-14],[2,-6],[4,-3],[66,-28],[71,-13],[13,0],[20,5],[23,1],[17,5],[7,4]],[[2769,5815],[-11,-94],[0,-29],[1,-7],[2,-10],[11,-32],[1,-16],[0,-9],[-3,-4],[-2,-2],[-3,0],[-9,3],[-12,1],[-4,2],[-2,3],[-4,8],[-6,17],[-4,2],[-4,1],[-6,-3],[-14,-13],[-12,-8],[-15,-2],[-8,-3],[-5,-5],[-4,-6],[-8,-7],[-9,-3],[-9,-1],[-15,1],[-10,4],[-8,1],[-7,-1],[-10,-5],[-4,-5],[-3,-5],[-1,-6],[-1,-8],[0,-10],[3,-31],[0,-6],[-2,-14],[0,-8],[0,-9],[2,-8],[1,-10],[-1,-8],[-3,-12],[-2,-7],[1,-6],[2,-5],[6,-10],[3,-7],[2,-7],[1,-10],[-1,-13],[-5,-18],[-4,-8],[-5,-4],[-9,-1],[-7,-3],[-10,-8],[-10,-15],[-7,-7],[-6,-4],[-5,-2],[-17,1],[-2,0],[-2,-1],[-4,-1],[-4,0],[-5,1],[-5,2],[-31,21],[-2,1],[-1,-1],[-6,-11],[-4,-12],[-10,-7],[-88,2],[-11,5],[-12,16],[-9,9],[-12,9],[-20,11],[-11,4],[-59,7],[-12,-1],[-6,-1],[-95,-5],[-12,-63],[-19,-48],[-40,-80],[-3,-12],[1,-11],[27,-62],[4,-12],[3,-18],[3,-9],[3,-8],[5,-7],[22,-24],[13,-21],[9,-17],[5,-14],[10,-47],[4,-8],[19,-27],[8,-15],[0,-10],[-4,-8],[-6,-6],[-8,-6],[-7,-4],[-6,-1],[-12,-2],[-3,-1],[-3,-3],[-3,-3],[-2,-5],[-3,-7],[-1,-6],[1,-5],[9,-38],[1,-11],[0,-6],[0,-3],[-10,-27],[-16,-15],[-19,-8],[-67,-9],[-78,-28],[-11,-7],[-1,-2],[-2,-4],[-3,-5],[-12,-10],[-9,-5],[-12,-4],[-28,-16],[-28,-29],[-10,-13],[-2,-6],[0,-6],[0,-4],[1,-4],[7,-8],[3,-4],[2,-7],[2,-9],[0,-7],[-4,-13],[2,-12],[5,-12],[14,-26],[5,-15],[4,-19],[0,-21],[2,-41],[5,-20]],[[1842,4328],[-12,-13],[-16,-10],[-5,-5],[-7,-14],[-8,-22],[-12,-44],[-4,-19],[-1,-14],[0,-6],[-2,-6],[-2,-5],[-18,-25],[-61,-30],[-3,1],[-2,1],[-1,1],[-1,2],[0,3],[0,4],[1,3],[1,8],[1,3],[-1,1],[-2,0],[-17,-3],[-58,-28],[-10,-3],[-9,-1],[-28,3],[-4,-3],[-4,-5],[-4,-11],[-2,-10],[-3,-8],[-3,-8],[-8,-9],[-11,-8],[-28,-12],[-35,-9],[-6,-1],[-6,1],[-4,2],[-18,13],[-4,2],[-3,1],[-4,0],[-6,-1],[-9,-4],[-28,-20],[-20,-18],[-18,-20],[-11,-9],[-5,-6],[-4,-9],[-5,-18],[0,-11],[0,-9],[2,-12],[0,-6],[0,-6],[-2,-8],[-16,-46],[-3,-10],[0,-7],[2,-17],[0,-2],[-2,-3],[-5,-1],[-14,3],[-16,1],[-26,-7],[-57,-8],[-20,-6],[-11,-6],[-5,-5],[-21,-26],[-11,-7],[-5,-4],[-10,-1],[-10,1],[-5,2],[-4,2],[-3,6],[-2,5],[-2,9],[-2,4],[-4,9],[-1,4],[-1,4],[0,4],[0,5],[0,4],[0,4],[-4,17],[-2,13],[-1,29],[-1,3],[-3,2],[-4,1],[-6,0],[-11,-7],[-35,-34],[-19,-28],[-7,-11],[-5,-5],[-5,-3],[-5,-2],[-3,1],[-3,1],[-4,3],[-6,7],[-25,35],[-8,17],[-4,8],[-5,4],[-8,2],[-41,2],[-7,3],[-7,4],[-6,6],[-4,13],[-2,18],[1,39],[4,36],[4,16],[3,7],[4,5],[15,12],[4,5],[3,4],[2,6],[2,7],[3,6],[3,5],[9,10],[23,31],[8,15],[4,6],[7,9],[19,19],[7,11],[0,13],[-31,66],[-27,40],[-4,9],[1,10],[2,5],[6,8],[3,4],[6,12],[3,5],[10,9],[13,18],[4,7],[1,7],[2,9],[0,47],[1,9],[1,8],[3,5],[10,13],[3,6],[2,8],[1,9],[1,11],[-2,8],[-7,7],[-45,14],[-53,5],[-21,-2],[-13,2],[-9,14],[-33,9],[-32,2],[-15,-4],[-7,-6],[-5,-8],[-4,-11],[-4,-10],[-6,-8],[-8,-6],[-19,-9],[-10,-1],[-7,1],[-15,8],[-8,3],[-12,0],[-100,-14],[-48,5],[-91,27],[-40,23],[-24,4],[-14,2]],[[301,4540],[0,2],[-6,15],[-12,14],[-10,9],[-24,8],[-26,2],[-51,-3],[-55,5],[-56,31],[-44,55],[-17,81],[6,36],[21,64],[2,43],[-20,168],[-8,95],[-1,15],[4,49],[20,52],[22,38],[24,33],[33,23],[11,15],[-5,24],[49,4],[70,5],[52,4],[-8,21],[-51,88],[-11,28],[-7,13],[-8,10],[-17,10],[-6,8],[-6,26],[-5,8],[-6,4],[-7,2],[10,23],[17,11],[38,7],[18,6],[13,13],[32,47],[3,8],[5,8],[9,7],[10,2],[9,-1],[8,2],[7,13],[3,27],[-2,28],[0,26],[13,19],[22,23],[13,31],[4,19],[22,9],[5,36],[3,39],[0,10],[-3,20],[-1,11],[2,14],[10,21],[2,10],[2,22],[11,41],[4,46],[5,15],[16,31],[-7,10],[-1,9],[2,10],[1,12],[-2,5],[-24,43],[-4,11],[4,5],[7,5],[1,11],[-4,10],[-4,5],[0,11],[0,23],[4,24],[10,10],[15,1],[17,3],[13,10],[6,20],[-4,56],[4,23],[4,12],[14,26],[4,11],[6,34],[8,21],[16,26],[9,21],[5,23],[-2,22],[-7,45],[-6,10],[10,5],[36,9],[6,0],[5,-3],[7,-8],[-1,-3],[-6,-12],[9,-10],[1,0],[1,0],[11,-13],[1,-5],[-3,-12],[0,-4],[5,-9],[4,-6],[6,-4],[8,-2],[4,-3],[6,-3],[45,-54],[32,-46],[46,-23],[94,-19],[41,4],[83,38],[41,-1],[21,-13],[18,-17],[71,-91],[19,-16],[38,-22],[11,-14],[7,-17],[5,-20],[1,-19],[-1,-45],[4,-16],[13,-40],[7,-12],[11,8],[68,119],[22,28],[19,1],[45,-55],[8,-5],[7,1],[7,2],[7,1],[21,-12],[6,-1],[11,4],[51,28],[10,8],[9,12],[9,16],[18,24],[44,27]],[[5276,6684],[-1,-28],[2,-19],[11,-37],[1,-9],[-1,-9],[-6,-15],[-2,-12],[0,-10],[6,-22],[-1,-7],[-2,-7],[-3,-5],[-3,-9],[-2,-11],[-4,-32],[-2,-9],[-5,-14],[-2,-10],[-5,-12],[-17,-13],[-4,-5],[-5,-7],[-4,-6],[-4,-10],[-1,-7],[-3,-24],[0,-7],[1,-5],[1,-6],[2,-6],[0,-6],[0,-7],[0,-7],[0,-6],[3,-37],[1,-9],[3,-5],[3,-3],[22,-8],[2,-3],[2,-3],[3,-3],[3,-2],[4,0],[5,0],[16,5],[5,0],[5,-1],[4,-3],[25,-27],[3,-2],[3,0],[3,1],[5,2]],[[5343,6187],[36,-51],[9,-32],[1,-28],[2,-25],[-1,-33],[-3,-33],[1,-6],[2,-3],[13,-10],[8,-9]],[[5411,5957],[-80,-54],[-19,-19],[-10,-22],[-15,-21],[-7,-8],[-6,-3],[-8,6],[-5,2],[-6,0],[-8,-3],[-5,-4],[-5,-7],[-4,-9],[-14,-20],[-3,-6],[-3,-13],[-16,-44],[-42,7],[-128,47],[-16,3],[-27,-4],[-19,1],[-12,2],[-13,5],[-22,3],[-5,2],[-3,4],[-4,6],[-6,6],[-13,7],[-8,4],[-6,1],[-4,-1],[-5,-2],[-19,-15],[-5,-3],[-60,-16],[-39,-7],[-6,-2],[-7,-5],[-2,-4],[-4,-12],[7,-31],[8,-13],[20,-23],[4,-8],[2,-8],[-1,-20],[-1,-6],[-3,-5],[-12,-12],[-3,-2],[-4,-2],[-19,-2],[-4,-3],[-4,-3],[-4,-5],[-3,-6],[-4,-8],[-3,-11],[-5,-18],[0,-13],[2,-9],[4,-7],[4,-5],[5,-3],[5,-3],[48,-5],[31,2],[7,-1],[6,-3],[7,-7],[4,-7],[2,-8],[0,-7],[0,-7],[-1,-6],[-1,-4],[-3,-3],[-3,-3],[-2,-1],[-6,-3],[-15,-11],[-2,-4],[0,-6],[2,-3],[4,-2],[23,-3],[8,-3],[69,-41],[8,-9],[2,-6],[-7,-10],[-10,-17],[-2,-6],[-3,-11],[-2,-4],[-2,-3],[-56,-28],[-5,-6],[-5,-10],[-4,-22],[0,-11],[3,-10],[12,-15]],[[4820,5229],[-28,-28],[-9,-15],[-6,-17],[-3,-8],[-12,-44]],[[4762,5117],[-10,-17],[-6,-6],[-7,-6],[-57,-12],[-23,-8],[-4,-4],[-3,-4],[-3,-5],[-5,-14],[-2,-3],[-5,-5],[-2,-3],[-2,-2],[-2,0],[-10,17],[-3,3],[-2,1],[-4,0],[-6,0],[-11,-4],[-7,-4],[-40,-32],[-4,-1],[-5,0],[-26,15],[-4,3],[-1,2],[-2,3],[-1,5],[-3,4],[-3,4],[-5,4],[-124,33],[-11,0],[-21,-5],[-9,-6],[-7,-5],[-3,-4],[-3,-2],[-8,-3],[-19,-10],[-15,2],[-40,28],[-39,51],[-7,11],[-3,6],[-2,10],[0,16],[2,32],[5,20],[17,47],[1,12],[0,7],[-10,35],[-3,41],[1,5],[3,6],[4,6],[9,11],[4,2],[7,4],[3,2],[2,3],[2,4],[-1,7],[-1,6],[-4,7],[-5,4],[-9,6],[-22,11],[-25,1],[-5,12],[-7,12],[1,5],[0,4],[13,23]],[[4165,5505],[42,39],[7,4],[38,15],[3,0],[3,-1],[22,-8],[6,3],[9,8],[43,48],[1,12],[-13,14],[-3,6],[-3,12],[-1,5],[3,13],[1,14],[1,2],[2,4],[20,25],[12,17],[3,8],[3,8],[0,7],[-1,8],[-2,9],[-3,9],[-7,11],[-9,10],[-24,19],[-5,3],[-3,-1],[-9,-3],[-3,0],[-3,0],[-3,1],[-11,8],[-2,1],[-2,-1],[-5,-4],[-3,0],[-1,3],[0,8],[2,5],[5,9],[0,3],[-2,4],[-5,5],[-11,8],[-7,6],[-6,8],[-7,15],[-3,12],[-7,33],[-3,6],[-21,26],[-11,17],[-3,4],[-2,3],[-57,57],[-19,12],[-32,8]],[[4079,6082],[-6,4],[-5,5],[-2,2],[-5,9],[-2,5],[-2,6],[0,8],[-1,9],[2,29],[1,8],[2,6],[2,7],[3,13],[1,27],[6,45],[0,7],[-1,6],[-3,5],[-6,8],[-2,4],[-1,3],[-1,5],[4,29],[1,6],[5,14],[3,7],[3,6],[5,8],[4,4],[4,3],[11,1],[100,-15],[14,1],[24,12],[36,18],[4,2],[14,1],[4,5],[5,8],[45,108],[35,55],[7,9],[19,5]],[[4406,6590],[38,-20],[19,-5],[70,0],[19,5],[63,37],[54,18],[64,32],[8,2],[6,-1],[4,-2],[9,-3],[14,-1],[27,-10],[75,40],[43,11],[17,0],[92,-27],[9,-1],[8,0],[37,17],[7,0],[6,-2],[3,-4],[6,-10],[3,-5],[6,-4],[6,-1],[69,13],[28,-2],[60,17]],[[5232,8295],[0,-1],[7,-46],[1,-63],[1,-9],[38,-116],[18,-42],[5,-6],[11,-11],[14,-17],[9,-16],[5,-12],[5,-26]],[[5346,7930],[-56,-29],[-20,-5],[-138,25],[-33,5],[-16,7],[-9,7],[-5,4],[-21,18],[-40,24],[-10,4],[-11,-1],[-10,-3],[-20,-11],[-10,-3],[-79,10],[-10,-5],[-10,-30],[-7,-9],[-32,-12],[-14,-9],[-6,-7],[-7,-8],[-2,-4],[-1,-3],[0,-3],[0,-2],[2,-3],[12,-21],[18,-50],[1,-8],[0,-12],[-16,-58],[-10,-53],[-1,-49],[-5,-41],[-3,-7],[-5,-8],[-11,-12],[-6,-8],[-3,-7],[0,-5],[0,-4],[1,-5],[2,-7],[0,-7],[-2,-15],[-3,-8],[-5,-7],[-14,-18],[-12,-17],[-7,-9],[-5,-5],[-10,-4],[-37,-7],[-13,-6],[-65,-64],[-14,-18],[0,-2],[0,-2],[1,-3],[1,-4],[2,-4],[5,-4],[2,-2],[1,-3],[0,-4],[1,-12],[0,-2],[3,-7],[4,-10],[19,-32],[2,-8],[0,-10],[-2,-22],[-3,-12],[-4,-9],[-4,-5],[-11,-8],[-6,-6],[-3,-7],[-2,-11],[-3,-8],[-4,-5],[-8,-9],[-10,-14],[-26,-41],[-15,-14],[-26,-16],[-6,-8],[-5,-8],[-12,-27],[-2,-11],[-2,-9],[-1,-9],[1,-12]],[[4455,6967],[-35,-27],[-11,-6],[-10,-4],[-6,-4],[-5,-5],[-6,-2],[-76,-8],[-4,1],[-4,4],[-2,4],[-4,10],[-1,3],[-1,2],[-1,2],[-1,1],[-1,0],[-99,-24],[-10,1],[-2,6],[15,56],[7,18],[4,7],[7,10],[6,7],[3,3],[10,5],[2,2],[2,3],[2,2],[0,2],[5,20],[19,50],[5,20],[1,14],[-1,19],[-13,110],[-2,11],[-10,20],[-1,14],[1,14],[0,5],[1,4],[1,3],[5,8],[1,3],[0,3],[0,3],[-2,10],[0,7],[0,42],[1,6],[2,9],[1,4],[-1,6],[-2,16],[-2,4],[-4,4],[-7,2],[-16,-1],[-11,3],[-5,3],[-28,30],[-22,14],[-2,4],[-1,4],[1,6],[2,4],[9,14],[23,45],[3,10],[8,15],[2,5],[3,14],[17,46],[2,8],[4,24],[1,6],[2,5],[12,28],[7,14],[4,5],[16,20],[5,8],[8,19],[3,4],[6,8],[2,5],[9,21],[2,5],[1,7],[0,4],[0,4],[-2,6],[-3,5],[-3,4],[-3,3],[-20,9],[-75,19]],[[4193,7924],[-17,18],[-16,21],[-6,15],[-4,17],[-2,58],[-9,11],[-6,6],[-13,13],[-3,8],[0,7],[6,12],[6,6],[24,13],[3,1],[3,0],[3,-1],[15,-7],[4,0],[4,0],[4,3],[12,9],[3,2],[11,2],[4,1],[2,6],[1,10],[-6,33],[-4,11],[-7,14],[-2,11],[-1,8],[1,5],[1,3],[0,5],[-2,7],[-5,8],[-17,26],[-18,40],[-11,22],[-3,19],[3,26],[6,31],[14,55],[2,5],[0,2],[2,9],[1,6],[-6,19],[-32,44],[-10,17],[-1,4],[-2,16],[-1,9],[0,4],[-1,6],[-2,4],[-3,7],[-3,10],[-4,11],[-5,7],[-7,7],[-24,17],[-7,3],[-10,1],[-43,15],[-8,4],[-1,2],[-2,2],[-3,4],[-1,4],[-1,7],[0,6],[1,35],[1,7]],[[4001,8773],[5,-3],[11,-15],[14,-13],[18,-2],[48,19],[17,3],[7,-4],[10,-20],[9,-5],[7,1],[6,6],[11,15],[12,14],[11,9],[14,6],[18,1],[16,-2],[46,-25],[9,-2],[19,-1],[7,4],[14,15],[7,3],[91,5],[63,19],[34,-1],[13,-7],[27,-25],[15,-6],[8,-10],[12,-48],[6,-16],[14,-11],[31,-15],[14,-17],[7,-19],[5,-20],[8,-17],[16,-8],[15,4],[27,22],[18,5],[16,2],[15,5],[14,9],[14,13],[23,29],[13,13],[14,5],[16,-10],[13,-46],[12,-13],[7,4],[5,10],[5,11],[4,5],[7,2],[13,5],[8,1],[8,-3],[15,-15],[8,-5],[9,-1],[25,1],[14,-4],[12,-10],[9,-14],[3,-21],[-6,-70],[0,-17],[9,-14],[16,-15],[17,-11],[31,-10],[10,-13],[7,-20],[11,-22],[8,-9],[16,-11],[6,-7],[24,-37],[4,-9],[3,-10],[4,-9],[6,-5],[3,-1]],[[3608,7278],[18,18],[11,4],[5,0],[4,-2],[4,-2],[4,-5],[3,-5],[2,-4],[0,-4],[-1,-2],[-5,-9],[0,-2],[-1,-2],[2,-9],[-1,-2],[0,-3],[-2,-3],[-2,-3],[-2,-4],[-1,-5],[3,-10],[4,-4],[6,-5],[2,-2],[2,-3],[3,-16],[7,-21],[1,-3],[2,-3],[5,-2],[1,-1],[1,-3],[0,-5],[7,-40],[0,-9],[1,-3],[0,-1],[2,0],[2,-1],[4,-2],[1,-3],[-1,-3],[-6,-8],[-2,-7],[-2,-7],[-2,-12],[-1,-6],[-2,-3],[-1,-1],[-12,-6],[-24,-4],[-18,5],[-12,2],[-4,0],[-3,-1],[-5,-3],[-2,-3],[0,-5],[4,-8],[1,-5],[-1,-7],[-3,-17],[-2,-8],[-5,-9],[-3,-5],[-16,-33],[-13,-22],[-8,-6],[-4,0],[-4,0],[-21,8],[-22,2],[-7,-1],[-5,-2],[-22,-23],[-4,-6],[-2,-6],[0,-6],[0,-8],[0,-2],[-1,-3],[-4,-10],[-2,-9],[0,-4],[0,-2],[1,-4],[9,-38],[1,-7],[0,-3],[0,-2],[-1,-4],[-22,-54],[-9,-35],[-3,-6],[-4,-5],[-9,-7],[-3,-4],[-1,-4],[-2,-28],[-2,-31],[3,-20],[0,-11],[-2,-20],[0,-13],[2,-17],[8,-34],[3,-8],[3,-7],[15,-25]],[[3446,6456],[-23,-21],[-21,-30],[-4,-4],[-34,-17],[-10,-1],[-6,3],[-3,3],[-3,3],[-3,1],[-3,0],[-12,-8],[-2,0],[-1,-1],[-2,-2],[-2,0],[-2,2],[-4,5],[0,4],[1,4],[3,6],[1,3],[0,3],[-1,4],[-7,17],[-2,4],[-4,4],[-4,2],[-4,0],[-4,-4],[-5,-7],[-3,-2],[-8,-4],[-2,1],[-13,8],[-3,2],[-6,8],[-4,3],[-9,6],[-7,6],[-5,2],[-7,0],[-12,-5],[-9,-7],[-6,-6],[-19,-14],[-25,-7],[-2,-1],[-2,-1],[-1,2],[-2,5],[0,4],[0,4],[0,4],[-1,2],[-4,0],[-6,-1],[-52,-26],[-5,-1],[-5,1],[-8,5],[-16,20],[-4,3],[-8,1],[-33,-6],[-53,-24]],[[2374,7312],[10,2],[20,-5],[66,-33],[0,14],[-6,52],[0,19],[6,18],[8,14],[46,45],[25,15],[26,7],[28,-6],[12,-7],[8,-2],[7,7],[11,45],[8,13],[11,9],[13,7],[51,15],[23,11],[23,24],[14,22],[55,108],[12,38],[8,40],[3,44],[-2,23],[-9,42],[-4,23],[0,22],[2,22],[9,44],[12,35],[74,174],[26,59],[9,38],[-3,43],[-13,83],[3,43],[13,28],[20,20],[126,86],[51,21],[295,10]],[[3471,8644],[-4,-8],[-80,-181],[-19,-82],[-5,-34],[0,-16],[0,-15],[6,-33],[36,-59],[8,-46],[2,-6],[4,-9],[6,-7],[9,-16],[5,-11],[2,-9],[1,-6],[-1,-5],[-4,-27],[-6,-33],[-9,-48],[-2,-6],[-4,-9],[-4,-4],[-6,-7],[-1,-4],[0,-4],[2,-5],[3,-5],[4,-5],[18,-12],[4,-5],[4,-5],[3,-8],[1,-5],[0,-4],[-7,-35],[-4,-34],[0,-10],[2,-8],[11,-23],[8,-34],[5,-25],[3,-11],[7,-24],[-14,-7],[-3,-9],[-1,-5],[-1,-2],[-2,0],[-8,2],[-114,-5],[-14,-5],[-4,-4],[-5,-8],[-2,-8],[-22,-103],[0,-52],[1,-9],[1,-7],[2,-6],[1,-7],[0,-8],[0,-12],[-1,-7],[-3,-6],[-5,-11],[-5,-11],[-3,-4],[-5,-7],[-3,-2],[-8,-11],[6,-37],[3,-14],[-1,-5],[-3,-8],[-9,-16],[-4,-6],[-4,-4],[-3,-3],[-13,-8],[-11,-10],[-5,-6],[-2,-5],[-1,-5],[-1,-6],[1,-5],[1,-4],[1,-4],[3,-6],[4,-4],[20,-23],[12,-6],[9,-1],[4,0],[4,1],[7,7],[6,4],[28,4],[8,3],[3,0],[3,-1],[1,-3],[1,-3],[1,-7],[2,-5],[2,-2],[2,1],[7,5],[7,3],[4,0],[2,-1],[6,-6],[4,-2],[32,-16],[33,-5],[47,8],[4,2],[3,3],[4,7],[4,8],[4,6],[1,3],[1,3],[0,4],[1,3],[2,4],[5,3],[4,1],[3,0],[2,-3],[2,-2],[3,-8],[3,-6],[5,-7],[7,-7],[4,-2],[3,0],[2,1],[7,8],[2,2],[20,8],[6,4],[12,11],[12,7],[2,2],[3,2],[2,4],[2,3],[2,5],[1,5],[2,10],[0,8]],[[4193,7924],[-27,-17],[-4,-2],[-9,-1],[-9,0],[-21,-2],[-53,-19],[-81,-17],[-66,-5],[-28,11],[-19,-3],[-16,-8],[-30,-25],[-3,-4],[-3,-4],[-6,-13],[-7,-10],[-7,-5],[-63,-16],[-20,-11],[-42,-41],[-35,-46],[-17,-16],[-16,-6],[-76,-13],[-36,0],[-12,-9],[-3,-6],[-3,-11],[0,-9],[0,-10],[5,-36],[0,-9],[-13,-177],[16,-20],[9,-17],[3,-9],[3,-12],[1,-9],[0,-7],[-8,-27],[-1,-22],[3,-8],[4,-4],[89,17],[6,3],[5,2],[5,7]],[[3471,8644],[10,0],[24,16],[32,56],[20,26],[9,15],[4,23],[-1,24],[-5,47],[3,25],[7,23],[9,22],[7,18],[7,11],[8,7],[12,3],[29,0],[9,9],[4,29],[2,16],[11,-6],[14,-4],[5,-5],[12,-33],[5,-10],[5,-7],[13,-13],[156,-73],[13,-14],[19,-33],[12,-15],[14,-9],[8,-1],[23,1],[7,-2],[10,-10],[7,-3],[6,-4]],[[4165,5505],[-16,8],[-87,-18],[-6,-4],[-4,0],[-4,0],[-3,3],[-10,11],[-2,3],[-6,4],[-8,4],[-36,8],[-9,-1],[-6,-3],[-4,-13],[-3,-5],[-14,-21],[-5,-5],[-7,-5],[-8,-1],[-18,3],[-26,-6],[-4,0],[-14,4],[-26,1],[-5,-1],[-1,-2],[-10,-15],[-6,-7],[-7,-7],[-13,-8],[-8,-2],[-8,-1],[-44,12],[-92,8],[-52,12],[-27,3],[-64,-3],[-7,-5],[-7,-35],[-1,-17],[1,-10],[-2,-9],[-9,-32],[-4,-16],[-3,-26],[-1,-10],[1,-7],[1,-2],[2,-2],[2,-4],[2,-5],[-1,-5],[-8,-22],[-1,-8],[-1,-9],[1,-12],[-4,-21],[-4,-16],[-2,-29],[1,-4],[3,-3],[1,-2],[2,-3],[2,-4],[2,-5],[3,-15],[2,-4],[2,-2],[2,-1],[3,-1],[9,-1],[3,-4],[1,-4],[5,-33],[-4,-26],[-6,-12],[-8,-6],[-11,-21],[-4,-21],[-4,-10],[-2,-5],[-3,-1],[-12,-1],[-3,-2],[-3,-1],[-1,-1],[-4,-4],[-17,-12],[-3,-5],[-2,-5],[-1,-7],[0,-4],[0,-3],[1,-3],[1,-5],[1,-4],[2,-14],[0,-3],[2,-3],[2,-3],[19,-16],[2,-3],[1,-4],[1,-4],[1,-4],[1,-3],[1,-3],[3,-3],[1,-2],[2,-1],[4,-1],[5,-3],[2,-2],[2,-2],[2,-6],[5,-7],[4,-11],[4,-33],[7,-61],[6,-17],[14,-9],[12,-13],[9,-14],[4,-10],[3,-12],[-1,-6],[-2,-4],[-17,-18],[-11,-8],[-10,-6],[-3,-2],[-23,-27],[-21,-34],[-23,-25],[-2,-3],[-1,-3],[-2,-2],[-2,-2],[-2,-1],[-2,-1],[-10,-1],[-2,-1],[-2,-2],[-2,-2],[-10,-20],[-1,-5],[0,-4],[1,-2],[3,-3],[1,-3],[0,-3],[0,-16],[-28,-19],[-13,-6],[-19,-5],[-16,-8],[-10,-10],[-19,-20]],[[3285,4375],[-26,4],[-8,-1],[-8,-3],[-30,-25],[-12,-14],[-8,-12],[-3,-4],[-60,-38],[-2,-3],[-2,-2],[-19,-18],[-7,-9],[-5,-3],[-6,0],[-13,3],[-5,4],[-5,4],[-5,1],[-5,-3],[-9,-10],[-22,-33],[-5,-6],[-5,-3],[-5,-3],[-4,-1],[-5,0],[-9,2],[-4,4],[-2,4],[-2,27],[0,4],[-1,4],[-1,3],[-9,-1],[-31,-20]],[[2942,4227],[-22,21],[-5,14],[-1,7],[0,5],[-2,5],[-1,3],[-5,3],[-8,3],[-24,0],[-5,0],[-2,-1],[-2,-1],[-4,1],[-6,4],[-9,8],[-6,9],[-2,4],[-3,10],[-1,3],[-1,2],[-2,2],[-2,1],[-8,1],[-12,-3],[-8,-11],[-15,-55],[-11,-25],[-6,-10],[-7,-9],[-9,-9],[-14,-11],[-12,-8],[-19,-6],[-3,-2],[-4,-3],[-1,-2],[-1,-3],[1,-2],[2,-3],[14,-20],[2,-5],[1,-4],[0,-4],[-1,-3],[-2,-2],[-3,-2],[-4,-1],[-19,-2],[-6,-2],[-3,-1],[-3,-2],[-7,-9],[-2,-1],[-4,1],[-30,22],[-16,20],[-4,3],[-5,0],[-9,-5],[-3,-1],[-5,6],[-5,11],[-20,53],[-6,10],[-9,11],[-3,3],[-2,6],[-2,11],[-3,5],[-5,3],[-7,0],[-6,3],[-10,5],[-2,4],[-2,6],[0,10],[1,12],[0,4],[-2,13],[-1,6],[0,18],[-2,9],[-21,67],[-39,85],[-12,15],[-25,18],[-17,-3],[-32,-19],[-13,-13],[-10,-12],[-13,-23],[-11,-23],[-9,-9],[-11,-6],[-47,-7],[-29,-8],[-22,-12],[-14,-12],[-27,-29],[-28,-14],[-36,-10],[-141,-8],[-52,-21],[-10,-2],[-23,1],[-23,13]],[[3446,6456],[7,-16],[7,-3],[41,0],[21,5],[7,3],[4,3],[8,10],[3,2],[2,2],[24,11],[5,1],[3,-1],[1,-1],[0,-2],[-2,-6],[-1,-4],[0,-4],[0,-3],[0,-3],[2,-2],[1,-3],[2,-2],[3,-3],[10,-7],[2,-2],[2,-2],[2,-3],[2,-3],[1,-3],[1,-4],[2,-10],[3,-5],[4,-2],[7,-1],[5,-3],[10,-7],[3,-1],[3,0],[11,4],[3,0],[1,-2],[1,-3],[1,-4],[0,-4],[-2,-12],[0,-5],[1,-6],[2,-6],[1,-6],[9,-23],[4,-8],[8,-11],[5,-5],[5,-4],[72,-32],[21,-3],[35,-10],[5,0],[1,3],[4,1],[5,1],[9,-1],[5,-2],[4,-3],[3,-5],[2,-5],[2,-6],[1,-5],[1,-5],[0,-5],[-1,-23],[-1,-5],[-1,-4],[-1,-3],[-2,-2],[-7,-4],[-3,-3],[0,-4],[2,-6],[13,-15],[2,-3],[0,-2],[-1,-3],[-5,-9],[-2,-6],[0,-7],[12,-4],[6,-7],[4,-10],[6,-16],[20,-90],[0,-7],[0,-4],[-5,-15],[-1,-7],[-1,-10],[3,-5],[2,-2],[2,1],[3,2],[6,9],[18,30],[2,2],[3,1],[9,3],[3,2],[1,2],[1,3],[1,3],[-1,4],[-1,3],[0,4],[1,4],[1,3],[2,2],[3,1],[13,1],[2,1],[2,2],[1,3],[1,4],[1,10],[1,2],[2,2],[9,2],[3,2],[3,2],[1,1],[1,3],[-1,2],[-3,9],[-1,4],[0,4],[0,4],[2,4],[2,5],[5,3],[3,1],[5,-3],[5,-5],[13,-7],[9,-4],[12,-2],[6,0],[5,0],[3,2],[7,5],[13,7]],[[4455,6967],[66,-40],[15,-18],[3,-12],[0,-5],[0,-3],[-1,-3],[0,-3],[-2,-3],[-3,-4],[-4,-3],[-13,-7],[-3,-4],[-3,-5],[0,-7],[2,-4],[15,-11],[2,-3],[1,-2],[-1,-10],[0,-5],[1,-15],[0,-4],[-1,-3],[-2,-1],[-10,-4],[-2,-1],[-1,-1],[-1,-3],[0,-4],[4,-28],[1,-8],[0,-10],[-2,-12],[-1,-10],[-2,-8],[-4,-8],[-4,-7],[-33,-43],[-12,-12],[-12,-11],[-23,-13],[-11,-8],[-8,-11]],[[2942,4227],[5,-12],[2,-3],[2,-3],[0,-3],[-2,-5],[-22,-26],[-3,-7],[-2,-9],[0,-16],[1,-7],[1,-5],[11,-8],[-62,-64],[-8,-9],[-5,-12],[-7,-10],[-13,-18],[-7,-11],[-4,-11],[0,-6],[2,-3],[1,-1],[2,-2],[2,-2],[0,-3],[-1,-6],[-3,-8],[-7,-14],[-7,-20],[-3,-8],[-1,-4],[0,-3],[0,-1],[3,-2],[16,-9],[4,-3],[3,-3],[1,-4],[-1,-5],[-3,-5],[-5,-5],[-90,-48],[-16,-4],[-6,-3],[-7,-6],[-7,-9],[-8,-16],[-11,-16],[-11,-22],[-3,-7],[0,-4],[0,-4],[1,-4],[-3,-8],[-7,-9],[-29,-26],[-11,-18],[-7,-16],[-2,-13],[1,-5],[1,-2],[2,-2],[10,-4],[14,-11],[3,-3],[1,-4],[0,-6],[-5,-12],[-1,-6],[1,-7],[0,-7],[-6,-9],[-12,-12],[-32,-20],[-23,-20],[-7,-3],[-36,-2],[-50,-13],[-7,-1],[-5,2],[-1,3],[-1,4],[-1,8],[-1,2],[-1,1],[-1,0],[-2,0],[-3,-1],[-5,-3],[-6,-8],[-3,-4],[-3,-7],[0,-23],[1,-25],[1,-5],[2,-5],[6,-10],[3,-7],[3,-11],[2,-11],[1,-10],[-2,-8],[-4,-6],[-11,-6],[-10,-8],[-10,-12],[-5,-9],[-3,-8],[-4,-6],[-4,-2],[-6,3],[-6,8],[-3,0],[-6,-5],[-49,-53],[-4,-6],[-2,-6],[-1,-7],[0,-8],[-2,-6],[-5,-3],[-10,-2],[-22,8],[-6,0],[-6,-1],[-16,-6],[-4,-1],[-5,-2],[-7,-4],[-38,-54],[-8,-9],[-13,-11],[-54,-35],[-17,-18]],[[2112,3096],[-16,-1],[-130,42],[-70,5],[-33,12],[-4,0],[-5,0],[-6,-4],[-7,-6],[-15,-22],[-6,-12],[-4,-13],[-7,-26],[-2,-12],[-2,-82],[-1,-12],[-3,-13],[-4,-12],[-7,-13],[-9,-15],[-13,-16],[-25,-25],[-12,-7],[-37,-13],[-39,0],[-6,-2],[-64,-33],[-5,-4],[-14,-13],[-9,6],[-7,6],[-52,78],[-31,47],[-4,4],[-7,5],[-9,4],[-22,6],[-14,0],[-9,0],[-78,-31],[-288,-25],[-3,-7],[-1,-2],[-1,-4],[0,-5],[1,-6],[2,-6],[2,-16],[4,-28],[0,-9],[-3,-9],[-10,-11],[-43,-31],[-7,-8],[-4,-10],[-3,-13],[-1,-7],[0,-5],[6,-25],[2,-18],[0,-6],[0,-5],[-1,-7],[-5,-12],[-9,-15],[-21,-32],[-11,-12],[-17,-26],[-32,-82],[-22,-40],[-6,-4],[-9,-5],[-19,2],[-4,0],[-3,-2],[-3,-5],[-1,-8],[0,-15],[2,-16],[2,-3],[4,-9],[2,-5],[1,-8],[-1,-11],[-4,-10],[-10,-13],[-7,-4],[-4,-1],[-2,2],[-2,2],[-1,3],[-1,2],[-1,1],[-1,0],[-2,-2],[-2,-5],[-2,1],[-2,8],[-2,4],[-2,2],[-1,1],[-2,1],[0,-5],[1,-8],[5,-22],[4,-8],[4,-6],[2,-1],[1,-1],[0,-2],[0,-4],[-1,-5],[-3,-9],[0,-6],[1,-8],[2,-7],[0,-8],[-6,-10],[-6,-23],[-3,-9]],[[777,2203],[-80,16],[-136,27],[-118,23],[-1,0],[-116,24],[-70,13],[-23,14],[-9,103],[-10,53],[-2,26],[9,81],[-10,102],[-1,53],[5,68],[-1,24],[-3,12],[-3,11],[-2,11],[6,24],[-4,6],[-6,5],[-2,7],[5,16],[19,32],[4,18],[9,88],[1,90],[-23,117],[-31,153],[-28,127],[-25,116],[-25,110],[-23,107],[-20,90],[-10,70],[-1,87],[4,15],[34,61],[37,68],[34,60],[27,48],[20,24],[22,19],[8,12],[3,22],[-1,19],[-2,18],[2,16],[12,11],[33,3],[10,5],[6,12]],[[3285,4375],[14,-21],[13,-9],[23,-3],[4,-3],[2,-4],[-1,-5],[-2,-6],[-1,-5],[-1,-6],[2,-10],[16,-38],[7,-12],[7,-9],[9,-10],[4,-7],[3,-9],[0,-18],[-1,-10],[-1,-7],[-2,-6],[0,-5],[-1,-11],[0,-8],[-3,-13],[0,-5],[0,-10],[-2,-10],[0,-7],[0,-8],[0,-6],[0,-16]],[[3374,4078],[-12,2],[-4,-2],[-6,-6],[-15,-20],[-4,-6],[-2,-6],[2,-9],[1,-4],[0,-6],[-1,-6],[-2,-9],[-13,-17],[-8,-9],[-7,-14],[-42,-99],[0,-5],[0,-5],[1,-3],[2,-4],[3,-3],[5,-5],[3,-3],[2,-3],[1,-5],[1,-5],[0,-6],[-1,-10],[-7,-44],[-1,-9],[0,-6],[1,-4],[3,-5],[1,-10],[2,-7],[-8,-59],[-13,-36],[1,-3],[2,-4],[5,-1],[5,-4],[7,-6],[3,-1],[3,0],[11,3],[5,-1],[2,-4],[3,-9],[3,-5],[3,-2],[3,-1],[8,-4],[3,-12],[8,-50],[4,-20],[2,-15],[-2,-10],[-5,-12],[-11,-17],[-3,-9],[-1,-5],[1,-5],[1,-4],[3,-9],[1,-12],[2,-24],[0,-13],[0,-11],[-3,-15],[-1,-6],[-2,-6],[-7,-15],[-6,-25],[-8,-61]],[[3296,3232],[-11,-57],[0,-5],[-2,-4],[-3,-3],[-12,-8],[-20,-25],[-2,-16],[-1,-7],[-1,-8],[-6,-18],[-1,-6],[-1,-12],[-1,-5],[-3,-4],[-6,-5],[-2,-2],[-2,-3],[2,-4],[3,-3],[3,-4],[0,-6],[-2,-9],[-5,-16],[-10,-50],[-4,-9],[-5,-4],[-11,-3],[-13,1],[-7,2],[-6,3],[-11,10],[-6,3],[-10,2],[-7,-2],[-6,-5],[-11,-12],[-13,-9],[-4,-2],[-4,-2],[-3,-5],[-4,-7],[-5,-12],[-6,-20],[0,-38],[-6,-39],[-4,-10],[-11,-16],[-31,-41],[-4,-8],[-13,-14],[-2,-3],[-1,-5],[-3,-9],[-13,-92],[0,-12],[2,-8],[6,-9],[5,-5],[5,-3],[1,-4],[1,-1],[-6,-15],[-11,-96],[-1,-6],[-11,-35],[-21,-107],[-10,-62],[-9,-171],[-3,-38],[-31,-547],[-9,-355],[-21,-212],[-90,-712],[-1,-6]],[[2785,202],[-15,0],[-187,-77],[-25,-17],[-15,-29],[-26,-68],[-19,-11],[-79,47],[-128,34],[-152,41],[-106,-14],[-34,-4],[-34,-5],[-34,-4],[-34,-5],[-34,-4],[-34,-4],[-34,-5],[-34,-4],[-34,-5],[-34,-4],[-34,-5],[-34,-4],[-34,-4],[-34,-5],[-34,-4],[-34,-5],[-20,-2]],[[1469,35],[82,538],[1,49],[-4,50],[1,10],[3,10],[18,34],[5,13],[2,16],[5,79],[-1,55],[2,11],[4,8],[5,5],[5,3],[6,3],[7,1],[6,2],[24,19],[28,38],[21,36],[29,63],[17,45],[10,33],[7,22],[9,15],[37,37],[11,16],[3,12],[1,10],[-2,9],[-3,9],[-4,7],[-9,16],[-4,10],[-3,7],[-1,19],[17,34],[0,5],[0,6],[-10,9],[-5,6],[-5,12],[0,8],[4,10],[7,8],[23,43],[7,9],[7,7],[13,10],[6,7],[2,7],[0,11],[-6,53],[-1,75],[-2,40],[9,14],[27,17],[9,8],[12,16],[6,10],[7,22],[29,75],[5,10],[7,8],[15,7],[12,21],[2,18],[0,10],[4,97],[-1,12],[-2,8],[-3,8],[-8,17],[-10,41],[2,18],[16,26],[7,20],[1,116],[37,357],[16,61],[28,31],[8,12],[11,21],[25,70],[4,16],[1,12],[-5,25],[0,9],[2,5],[10,15],[10,16],[3,10],[-1,7],[-9,13],[-2,4],[-1,6],[0,5],[0,6],[-2,6],[-6,11],[-1,4],[0,6],[0,9],[-3,16],[-3,39]],[[1469,35],[-87,-12],[-72,19],[-66,29],[-57,26],[-58,26],[-58,26],[-58,25],[-58,26],[-57,26],[-58,26],[-58,25],[-58,26],[-58,26],[-57,25],[-58,26],[-58,26],[-58,25],[-58,26],[-57,26],[-50,22],[-22,14],[40,64],[53,86],[108,176],[57,94],[39,64],[75,123],[57,93],[79,131],[88,145],[57,95],[12,17],[-2,6],[-1,1],[1,20],[2,8],[4,3],[-2,75],[-3,13],[13,36],[5,23],[0,21],[-4,22],[-8,36],[-12,35],[-2,12],[-1,32],[-6,25],[-18,41],[-7,23],[-1,22],[5,47],[-5,20],[-24,43],[-14,15],[-18,10],[-38,7]],[[4402,4285],[11,-35],[18,-4],[71,4],[11,-3],[4,-8],[4,-12],[2,-17],[-1,-10],[-1,-8],[-3,-3],[-11,-8],[-4,-4],[-3,-5],[-5,-12],[-4,-6],[-24,-24],[-3,-4],[-2,-4],[0,-3],[-2,-13],[0,-3],[-2,-16],[1,-31],[-1,-8],[-1,-6],[-1,-13],[0,-18],[3,-39],[3,-20],[5,-17],[5,-11],[7,-8],[8,-5],[34,-11],[8,-4]],[[4529,3896],[-3,-65],[-1,-8],[-2,-11],[-3,-6],[-5,-12],[-3,-4],[-4,-3],[-3,-2],[-5,-5],[-3,-1],[-5,-1],[-6,0],[-5,2],[-4,2],[-8,6],[-6,4],[-8,-1],[-12,-13],[-5,-4],[-4,-1],[-17,1],[-21,-2],[-10,-3],[-8,-6],[-5,-6],[-45,-38],[-12,-13],[-11,-15],[-11,-20],[-2,-5],[-1,-5],[0,-5],[1,-13],[0,-6],[-4,-9],[-8,-7],[-16,-10],[-9,-4],[-7,0],[-2,3],[-2,1],[-1,2],[-1,4],[0,5],[1,7],[16,64],[1,10],[1,6],[-1,3],[-2,3],[-11,1],[-31,-4],[-21,-53],[-11,-13],[-34,-7],[-33,-22],[-6,-7],[-8,-19],[-9,-17],[-34,-51],[-6,-12],[-1,-7],[1,-7],[-1,-10],[-1,-11],[-8,-22],[-2,-7],[1,-4],[2,-7],[2,-6],[6,-13]],[[4053,3417],[-16,-15],[-4,-5],[-7,-4],[-46,-10],[-8,-3],[-7,3],[-4,4],[-1,4],[-1,2],[-3,0],[-3,-2],[-4,-7],[-2,-6],[0,-7],[0,-11],[0,-3],[0,-4],[-2,-5],[-4,-5],[-23,-5],[-42,7],[-11,-2],[-7,1],[-6,3],[-6,8],[-7,13],[-1,4],[-2,8],[-1,4],[-9,4],[-32,4],[-36,6],[-12,4],[-5,2],[-16,-3],[-4,0],[-22,10],[-6,2],[-6,0],[-7,-3],[-6,-4],[-4,-2],[-2,-4],[-3,-4],[-8,-19],[-3,-5],[-3,-4],[-3,-2],[-4,-3],[-11,-3],[-3,0],[-2,0],[-1,4],[0,7],[1,31],[-4,63],[2,15],[2,9],[2,5],[0,3],[-1,4],[-2,1],[-2,0],[-12,-6],[-8,0],[-52,13],[-6,-1],[-4,-1],[-1,-1],[-3,-2],[-4,-6],[-25,-42],[-7,-16],[-3,-13],[-2,-17],[-3,-13],[-6,-16],[-5,-9],[-5,-6],[-3,-2],[-10,-5],[-12,-8],[-2,-3],[-2,-2],[-1,-7],[0,-11],[2,-23],[4,-23],[0,-5],[-4,-4],[-7,-5],[-2,-3],[-2,-2],[-1,-2],[-1,-4],[-3,-19],[-3,-6],[-2,-5],[-1,-3],[0,-5],[0,-5],[11,-29],[-4,-5],[-6,-2],[-10,-1],[-9,2],[-10,5],[-26,21],[-11,4],[-37,-2],[-8,1],[-6,5],[-10,17],[-7,2]],[[3374,4078],[22,-6],[20,-18],[6,-4],[4,0],[2,5],[1,7],[3,7],[4,5],[9,3],[8,-2],[7,-5],[10,-9],[3,0],[2,3],[-1,10],[-7,33],[-6,22],[-1,6],[2,5],[6,1],[56,-3],[7,-2],[7,-3],[7,-4],[40,-36],[5,-1],[5,1],[15,8],[7,2],[7,0],[7,0],[23,-7],[5,0],[4,3],[3,4],[9,20],[6,8],[7,2],[4,0],[6,-8],[27,-36],[18,-14],[86,-26],[21,-7],[11,2],[4,4],[3,6],[3,8],[0,8],[0,8],[-1,8],[0,8],[1,11],[9,51],[4,17],[5,8],[5,6],[20,14],[13,5],[21,14],[84,83],[13,10],[9,4],[6,1],[3,-1],[15,-12],[6,-3],[9,1],[10,3],[33,18],[10,3],[6,1],[4,-1],[3,-2],[2,-2],[10,-20],[1,-6],[2,-6],[0,-6],[1,-5],[3,-8],[7,-15],[9,-14],[19,-6],[49,35],[19,9],[14,1],[12,3],[7,6],[8,10],[14,22],[5,4],[2,0],[2,-5],[3,-21],[4,-19],[2,-4],[5,-3],[12,-2],[8,2],[23,10]],[[4762,5117],[13,-14],[1,-7],[0,-6],[-4,-12],[-7,-29],[-2,-5],[-3,-3],[-7,-9],[-4,-8],[-1,-6],[2,-4],[8,-7],[10,-6],[1,-2],[3,-7],[5,-16],[10,-40],[0,-8],[-3,-6],[-15,-10],[-5,-5],[-4,-7],[-24,-45],[-15,-18],[-44,-50],[-6,-10],[-8,-15],[-5,-14],[-11,-19],[-15,-14],[-14,-10],[-66,-26],[-3,-1],[-18,1],[-39,-11],[-61,-33],[-8,-6],[-3,-4],[-7,-11],[-10,-32],[-1,-6],[1,-21],[20,-80],[1,-30],[-3,-9],[-1,-9],[-2,-13],[-1,-46],[-1,-6],[-1,-4],[-2,-5],[-6,-17],[-5,-51]],[[4053,3417],[23,-12],[5,-1],[10,0],[4,3],[4,5],[15,30],[8,26],[3,7],[5,9],[3,3],[3,2],[2,-1],[2,-2],[3,-1],[3,0],[7,2],[5,-1],[3,-3],[2,-3],[3,-8],[1,-3],[2,-2],[8,-7],[5,-6],[3,-2],[6,-3],[5,-4],[4,-5],[1,-6],[0,-6],[-3,-11],[0,-5],[1,-19],[0,-6],[-1,-7],[-8,-50],[-1,-5],[-7,-18],[-9,-22],[-3,-3],[-6,-6],[-25,-17],[-8,-7],[-5,-8],[-9,-35],[-4,-11],[-8,-19],[-11,-19],[-16,-17],[-18,-24],[-3,-8],[-4,-10],[-3,-13],[0,-9],[2,-9],[3,-11],[1,-6],[1,-14],[1,-7],[1,-2],[0,-3],[1,-25],[4,-24],[-1,-6],[-1,-6],[-10,-22],[-9,-29],[-1,-7],[2,-5],[2,-4],[8,-7],[6,-6],[5,-24],[1,-28],[-2,-7],[-8,-28],[-15,-28],[-6,-10],[-3,-3],[-4,-3],[-25,-10],[-17,-12],[-10,-9],[-23,-30],[0,-27],[2,-9],[4,-10],[3,-6],[3,-3],[22,-20],[56,-79],[2,-1],[4,0],[28,26],[17,24],[8,9],[14,11],[13,8],[14,3],[3,0],[3,-1],[3,-3],[7,-1],[11,0],[31,9],[7,4],[88,99],[9,12],[3,1],[2,-1],[5,-9],[3,-4],[32,-37],[11,-15],[31,-21],[28,-12],[7,-4],[5,-7],[6,-7],[12,-14],[16,-12],[11,-11],[6,-4],[6,-2],[4,-1],[19,-5],[32,-10],[15,3],[49,19],[14,12],[30,15],[19,-43],[8,-33],[1,-4],[2,-1],[10,-1],[5,-2],[5,-3],[2,-2],[1,-2],[10,-28],[5,-8],[4,-6],[8,-5],[6,-3],[2,0],[1,0],[2,1],[2,4],[4,13],[2,4],[3,2],[11,-4],[31,-24],[15,-36],[3,-17],[-1,-5],[-6,-15],[-2,-8],[0,-5],[1,-3],[4,-2],[4,-2],[4,-1],[3,0],[4,1],[22,7],[4,0],[47,-3],[12,2],[10,3],[37,19],[17,1],[25,-4],[6,-2],[35,-23],[0,-1]],[[5040,2374],[-15,-14],[-21,-12],[-21,-3],[-45,14],[-22,-1],[-9,-19],[5,-17],[10,-16],[9,-19],[4,-43],[10,-17],[14,-11],[14,-6],[58,11],[25,-11],[3,-47],[-7,-20],[-11,-7],[-28,2],[-11,-5],[-10,-9],[-9,-12],[-44,-38],[-13,-7],[-37,-9],[-26,-15],[-41,-8],[-48,-28],[-13,-3],[-44,5],[-36,-2],[-12,2],[-14,7],[-25,19],[-14,6],[-14,-1],[-27,-9],[-14,0],[-16,4],[-8,4],[-6,6],[0,8],[2,7],[4,7],[2,9],[-2,24],[-4,15],[-11,8],[-40,-1],[-26,-10],[-47,-32],[-21,-24],[-16,-26],[-18,-18],[-27,-5],[-16,-16],[-24,-124],[-13,-25],[-65,-92],[-16,-10],[-94,-26],[-12,-8],[-6,-16],[-68,-353],[-2,-48],[11,-44],[17,-30],[6,-14],[3,-22],[2,-23],[-13,-145],[2,-67],[-3,-21],[-45,-125],[-10,-42],[-2,-17],[4,-15],[25,-24],[28,-40],[21,-22],[6,-11],[-2,-5],[-6,-3],[-4,-3],[-15,-34],[-18,-33],[-55,-55],[-60,-24],[-40,-16],[-40,-17],[-41,-16],[-40,-16],[-40,-16],[-40,-17],[-41,-16],[-40,-16],[-40,-17],[-41,-16],[-40,-16],[-40,-16],[-40,-17],[-41,-16],[-40,-16],[-40,-16],[-101,-41],[-35,2],[-115,28],[-95,2],[-128,1]],[[5251,2984],[12,-52],[5,-41],[0,-8],[0,-4],[-2,-10],[-8,-30],[-13,-38],[-20,-43],[-3,-9],[-1,-6],[0,-6],[1,-17],[2,-22],[2,-11],[2,-10],[3,-10],[4,-9],[5,-8],[13,-14],[25,-20],[5,-5]],[[5283,2611],[-3,-9],[-23,-28],[-3,-10],[-3,-23],[-4,-8],[-36,-28],[-12,-12],[-8,-15],[-7,-6],[-28,-2],[-21,5],[-10,-1],[-19,-13],[-43,-65],[-23,-22]],[[4529,3896],[21,0],[4,3],[4,4],[2,5],[1,6],[9,21],[12,22],[4,11],[2,8],[-1,4],[-1,5],[-10,19],[-3,9],[-2,8],[0,9],[1,6],[2,4],[4,2],[9,4],[19,2],[21,-6],[5,-3],[4,-4],[2,-4],[1,-5],[2,-22],[2,-10],[3,-10],[6,-15],[5,-6],[3,-2],[3,-1],[22,4],[7,0],[3,0],[2,-3],[2,-3],[1,-4],[0,-3],[-1,-9],[1,-4],[2,-3],[10,-4],[4,-4],[6,-7],[3,-2],[4,0],[5,2],[21,0],[5,1],[5,3],[3,3],[4,5],[6,10],[8,19],[11,18],[4,3],[4,3],[8,2],[3,-1],[2,-3],[-1,-3],[0,-4],[-1,-3],[-3,-6],[-1,-4],[-1,-3],[0,-2],[1,-1],[0,-2],[4,-6],[3,-5],[1,-2],[2,-5],[2,-7],[1,-7],[0,-6],[0,-6],[-2,-5],[-3,-4],[-3,-4],[-3,-4],[-27,-20],[-3,-4],[-2,-5],[1,-6],[4,-8],[4,-5],[24,-13],[6,-5],[3,-6],[2,-5],[1,-4],[0,-3],[-1,-3],[-3,-2],[-2,-1],[-10,-1],[-3,-1],[-2,-3],[-2,-4],[-2,-5],[-1,-5],[-1,-5],[0,-12],[3,-13],[18,-36],[18,-22],[2,-4],[1,-10],[2,-4],[106,-142],[7,-6],[23,-13],[2,-3],[-1,-4],[-47,-70],[44,-43],[11,-19],[6,-37],[2,-4],[2,-2],[26,-6],[5,-3],[23,-19],[6,-8],[4,-8],[0,-5],[-1,-7],[-1,-5],[-4,-7],[-9,-14],[-11,-14],[-13,-12],[-19,-12],[-3,-2],[-3,0],[-2,0],[-7,2],[-11,4],[-3,0],[-1,-1],[-3,-2],[-3,-4],[-4,-6],[-4,-10],[-3,-12],[-1,-16],[1,-9],[2,-7],[3,-2],[3,-1],[2,0],[20,8],[4,1],[3,0],[2,-1],[4,-2],[5,-4],[6,-7],[7,-14],[3,-9],[1,-10],[-5,-42],[-1,-10],[2,-6],[2,-3],[7,-7],[10,-9],[4,-3],[43,-8],[13,-5],[10,-6],[13,-15],[19,-17],[11,-12],[9,-9],[7,-4],[6,-1],[46,1],[4,3],[28,25]],[[5709,4845],[21,-13],[3,-4],[3,-8],[1,-7],[5,-22],[7,-19],[2,-9],[1,-5],[-2,-2],[-6,-2],[-2,-1],[-3,-4],[-3,-7],[-3,-9],[-1,-12],[1,-6],[3,-4],[4,-3],[3,-4],[1,-4],[0,-13],[0,-4],[5,-8],[2,-24],[0,-1]],[[5751,4650],[-2,-40],[1,-38],[2,-21],[2,-13],[9,-21],[6,-19],[1,-11],[0,-10],[-17,-49],[-4,-19]],[[5749,4409],[-2,-2],[-48,-57],[-8,-15],[-8,-31],[-3,-20],[-4,-18],[-7,-18],[-8,-17],[-41,-63],[-65,-64],[-8,-14],[-6,-14],[-31,-127],[-29,-41],[-5,-13],[-8,-19],[-48,-63],[-9,-9],[-7,-9],[-1,-4],[-1,-11],[-2,-17],[-5,-12],[-18,-25],[-28,-30],[-10,-7],[-18,-9],[-18,-6],[-42,-4],[-9,-3],[-6,1],[-7,4],[-28,24],[-60,79],[-34,-55],[-28,-66],[-2,-7],[0,-5],[0,-5],[15,-22],[64,-66],[5,-25],[7,-12],[20,-18],[31,-40],[4,-3],[14,-9],[2,-2],[3,-4],[3,-7],[13,-58],[5,-34],[3,-12],[1,-9],[0,-8],[-6,-20],[-2,-12],[0,-12],[5,-45],[-2,-40],[-6,-13],[-2,-7],[-2,-9],[2,-13],[9,-46],[1,-9],[0,-9],[-5,-31],[-18,-58]],[[4820,5229],[33,-6],[12,0],[21,10],[4,3],[1,4],[4,25],[3,6],[5,5],[8,10],[7,4],[5,2],[47,14],[18,1],[21,-7],[26,-13],[21,-19],[18,-22],[7,-5],[10,-3],[32,-3],[9,1],[11,2],[44,21],[20,14],[10,10],[3,2],[5,4],[3,2],[9,9],[16,-5],[10,-9],[21,-26],[6,-11],[3,-11],[7,-49],[0,-8],[-1,-16],[0,-9],[1,-10],[3,-12],[0,-8],[0,-8],[-1,-7],[1,-10],[1,-11],[6,-28],[1,-15],[5,-19],[7,-6],[9,-3],[43,-23],[3,-4],[8,-16],[33,-27],[10,-15],[3,-5],[59,-83],[5,-5],[4,-3],[3,0],[7,1],[6,2],[16,0],[6,-24],[0,-6],[-1,-9],[-5,-22],[-4,-18],[0,-10],[1,-6],[1,-3],[2,-3],[6,-5],[9,-6],[28,-9],[7,0],[12,2],[6,3],[58,46],[5,5],[29,48],[17,21]],[[6241,3989],[-66,31],[-26,4],[-3,27],[20,31],[21,39],[2,9],[0,12],[-3,26],[-2,11],[-3,9],[-1,3],[0,12],[8,42]],[[6188,4245],[3,23],[2,5],[10,14],[12,20],[3,13],[2,12],[3,8],[38,44],[16,13],[4,7],[7,14],[4,13],[16,70],[-12,17],[-1,13],[4,13],[12,29],[3,13],[22,24],[10,9],[11,6],[42,18],[48,6],[2,0],[1,-1],[12,-12],[20,42],[4,4],[7,6],[5,1],[16,8],[12,9],[16,10],[20,16],[17,7],[5,4],[11,17],[4,9],[2,8],[0,16]],[[6601,4793],[10,-2],[38,-22],[29,7],[7,-12],[6,-43],[4,-17],[3,-6],[7,-7],[11,-7],[5,-5],[3,-7],[0,-27],[-15,-70],[-1,-20],[3,-22],[6,-19],[9,-17],[6,-5],[19,-8],[5,-6],[5,-18],[4,-8],[37,-55],[11,-34],[-5,-36],[-118,-132],[-14,-10],[-15,2],[-16,7],[-8,-4],[-24,-59],[-5,-10],[-8,-5],[-21,2],[-6,-1],[-52,-43],[-30,-3],[-46,31],[-27,-6],[-33,-31],[-12,-4],[-7,1],[-6,4],[-6,3],[-23,-6],[-14,1],[-28,-5],[-23,-21],[-18,-31],[-7,-18]],[[6241,3989],[-7,-19],[13,-120],[-7,-32],[-4,-5],[-18,-18],[-17,-32],[-23,-23],[-8,-15],[2,-22],[3,-8],[5,-7],[6,-6],[6,-3],[5,-5],[2,-8],[1,-20],[7,-36],[-2,-14],[-9,-21],[-36,-74],[-12,-13],[-29,-14],[-14,-12],[-21,-36],[-13,-41],[-4,-46],[8,-47],[18,-62],[2,-23],[-1,-24],[-4,-47],[-1,-46],[-5,-47],[-1,-24],[14,-104],[22,-83],[2,-15],[-3,-6],[-1,-4],[-34,-34],[-19,-27],[-76,-159],[-9,-15],[-11,-9],[-9,-20],[-22,-27],[-25,-24],[-19,-11],[-25,3],[-23,-11],[-45,-30],[-27,-5],[-18,18],[-32,63],[-18,28],[-6,16],[-2,45],[-4,13],[-9,7],[-39,9],[-41,32],[-23,12],[-15,0],[-17,-8],[-30,-22],[-13,-14],[2,-11],[12,-7],[15,-3],[42,1],[13,-3],[7,-10],[-9,-13],[-15,-12],[-12,-6],[-26,6],[-73,35],[-27,3],[-28,-1],[-15,3],[-9,11],[-7,15],[-17,19],[-16,12],[-18,8],[-14,-1],[-9,-15],[-14,-47],[-5,-10]],[[5749,4409],[50,25],[18,4],[13,-10],[8,-2],[5,2],[5,3],[4,0],[3,0],[16,-10],[4,-4],[2,-4],[8,-19],[11,-20],[2,-6],[1,-8],[0,-11],[-2,-52],[0,-22],[6,-65],[0,-6],[-1,-5],[0,-9],[3,-13],[3,-25],[4,-7],[2,0],[2,0],[4,1],[11,5],[9,9],[19,23],[28,22],[34,21],[24,20],[6,8],[0,3],[0,3],[-1,3],[0,5],[0,7],[1,2],[2,2],[5,-1],[4,-1],[3,-2],[3,-3],[2,-2],[5,-6],[21,-22],[15,-4],[12,2],[32,15],[11,2],[5,-3],[3,-3],[14,-6]],[[7415,7311],[-10,-12],[-8,-11],[-7,-13],[-10,-24],[-6,-12],[-5,-8],[-9,-9],[-4,-9],[-3,-12],[-6,-41],[-1,-20],[-2,-12],[-4,-11],[-20,-40],[-6,-15],[-3,-6],[-4,-4],[-10,-7],[-10,-5],[-5,-3],[-3,-7],[-3,-10],[-2,-17],[2,-12],[3,-7],[16,-12],[5,-5],[4,-6],[3,-7],[0,-8],[-4,-8],[-20,-24],[-13,-30],[-26,-15],[-13,1],[-5,2],[-5,1],[-4,-3],[-4,-5],[-7,-18],[-2,-10],[1,-7],[1,-7],[1,-7],[-1,-12],[1,-6],[4,-11],[1,-6],[1,-14],[2,-14],[1,-8],[-1,-7],[-2,-6],[-8,-17],[-2,-5],[-5,-3],[-9,1],[-35,11],[-25,-4],[-19,9],[-11,15],[-14,24],[-5,5],[-6,-2],[-7,-7],[-12,-20],[-3,-11],[-1,-9],[1,-5],[0,-6],[-2,-6],[-1,-6],[-5,-7],[-7,-7],[-15,-10],[-18,-8],[-24,4],[-3,14],[-2,16],[0,9],[0,18],[1,10],[4,18],[7,23],[2,7],[0,9],[-1,8],[-3,9],[-5,9],[-30,43],[-2,8],[-2,7],[-1,16],[-2,6],[-2,7],[-5,6],[-7,5],[-32,14],[-19,13],[-8,2],[-9,-1],[-13,-8],[-7,-6],[-17,-20],[-17,-6],[-43,10]],[[6764,6914],[5,15],[0,12],[5,55],[3,18],[3,49],[13,49]],[[6793,7112],[7,8],[2,4],[3,6],[5,11],[2,4],[2,2],[16,8],[30,25],[8,10],[13,21],[4,4],[35,23],[4,7],[1,8],[-4,13],[-15,27],[-3,8],[-2,9],[0,9],[4,10],[6,11],[0,5],[0,10],[0,9],[7,32],[3,18],[2,7],[2,5],[8,16],[2,31],[-4,116],[-5,11],[-3,4],[-6,4],[-8,3],[-24,3],[-26,-3],[-5,1],[-45,18],[-23,6],[-5,0],[-15,-4],[-7,5],[-11,12],[-48,74],[-39,38],[-28,19],[-3,6],[-2,8],[2,39],[-1,11],[-2,11],[-9,29],[-4,27],[-5,17],[-3,26],[-1,40],[5,49],[-1,240],[-1,9],[3,5],[9,9],[5,3],[4,4],[2,4],[1,10],[0,6],[10,22],[19,9],[6,5],[3,4],[3,16],[16,35],[-16,36],[-11,17],[-26,25],[-6,11],[-4,13],[-1,22],[3,25],[-1,12],[-3,14],[-16,53],[-2,29],[5,63],[5,29],[3,8],[8,14],[4,5],[1,4],[-1,3],[-6,3],[-6,2],[-6,1],[-4,1],[-2,12],[-2,22],[-3,114],[4,21],[0,1]],[[6606,8984],[2,-3],[7,-3],[22,-5],[-5,8],[19,-4],[21,-9],[21,-5],[20,10],[24,38],[5,4],[1,9],[10,33],[2,0],[13,1],[2,-1],[4,4],[2,2],[3,9],[1,7],[-1,10],[0,9],[3,4],[3,3],[9,16],[2,13],[2,9],[2,10],[-1,16],[-7,32],[-2,16],[4,12],[-6,8],[-7,12],[-4,14],[-2,16],[-5,9],[-23,9],[-8,5],[-11,23],[-10,32],[-3,33],[8,28],[14,-14],[15,-4],[16,3],[17,8],[-6,9],[-2,9],[0,9],[2,11],[5,3],[8,2],[8,4],[4,10],[3,6],[3,2],[14,9],[6,5],[31,52],[31,40],[7,7],[24,12],[7,9],[8,19],[18,61],[21,50],[6,27],[8,6],[10,3],[7,4],[9,38],[0,9],[0,11],[0,12],[3,10],[6,4],[16,-1],[6,5],[25,22],[6,13],[-14,13],[0,8],[13,10],[40,5],[9,19],[4,8],[12,3],[22,0],[6,-2],[11,-4],[6,-1],[5,3],[3,5],[4,5],[8,1],[28,-17],[17,-5],[7,12],[-2,25],[5,7],[16,1],[9,-3],[8,-6],[7,-8],[7,-9],[4,-9],[6,-20],[5,-9],[7,-8],[5,1],[5,3],[9,0],[8,-2],[20,-13],[27,-24],[42,-56],[58,-30],[23,-19],[17,-33],[4,-49],[-3,-25],[-13,-47],[-4,-32],[-13,-32],[-10,-45],[-20,-48],[-5,-28],[-7,-25],[-1,-12],[3,-14],[3,-2],[6,2],[7,-2],[26,-27],[15,-8],[14,10],[13,12],[84,37],[25,-2],[21,-18],[21,-33],[-5,-8],[2,-13],[1,-24],[0,-26],[-3,-20],[-11,-19],[-25,-21],[-6,-20],[1,-10],[6,-24],[2,-12],[-1,-11],[-8,-34],[-3,-34],[-2,-11],[-4,-9],[-8,-15],[-3,-6],[-3,-48],[10,-89],[-7,-44],[-7,-25],[-3,-15],[6,-43],[1,-46],[-2,-23],[-4,-14],[-1,-31],[-25,-55],[2,-27],[-5,-10],[-4,-16],[-5,-45],[-1,-67],[1,-13],[4,-12],[12,-24],[3,-13],[0,-45],[2,-24],[6,-20],[39,-81],[7,-22],[5,-51],[5,-22],[8,-21],[9,-19],[23,-31],[30,-20],[32,-9],[34,0],[34,8],[27,14],[201,191],[19,26],[23,17],[6,8],[10,20],[7,10],[28,23],[70,37],[31,8],[48,-11],[24,15],[103,19],[6,11],[4,21],[29,57],[33,86],[20,36],[28,21],[32,8],[18,8],[15,23],[49,38],[50,6],[14,12],[8,15],[12,33],[11,16],[27,27],[6,2],[15,-7],[7,5],[34,46],[11,10],[14,6],[18,2],[16,-2],[12,-9],[11,-5],[43,31],[31,1],[84,-39],[48,-16],[30,1],[25,-4],[-5,-28],[-1,-9],[0,-46],[-4,-16],[-12,-18],[-12,-12],[-10,-7],[-27,-3],[-14,-7],[-15,-16],[-9,-21],[3,-24],[11,-8],[30,12],[14,-2],[5,-6],[10,-17],[5,-5],[7,1],[12,11],[6,3],[16,-2],[11,-3],[10,3],[26,31],[14,5],[30,5],[39,23],[14,4],[53,24],[77,20],[17,9],[13,19],[1,37],[11,15],[18,1],[21,-7],[17,3],[8,29],[3,-14],[8,7],[8,1],[7,-6],[10,-21],[7,-3],[8,-1],[20,-4],[12,3],[13,2],[15,-9],[26,-9],[5,-2],[6,0],[71,6],[20,14],[89,-69],[20,-27],[31,-68],[21,-15],[-55,-18],[-13,-1],[-8,6],[-27,76],[-5,8],[-11,2],[-8,-8],[-7,-11],[-16,-18],[-4,-3],[-14,-2],[-3,-5],[-2,-7],[-9,-11],[-2,-5],[-3,-4],[-5,-2],[-5,2],[-8,11],[-5,3],[-10,-1],[-30,-11],[-22,-1],[-9,-6],[-8,-17],[-6,-23],[-7,-13],[-11,-8],[-15,-3],[-26,5],[-10,-6],[-1,-21],[11,-23],[22,-21],[43,-27],[13,-18],[8,-22],[9,-18],[16,-10],[4,-6],[1,-8],[-1,-8],[-3,-8],[-4,-35],[-11,-4],[-14,15],[-13,24],[-2,3],[-3,3],[-13,5],[-15,-1],[-29,-10],[-18,-19],[-58,-47],[-34,-35],[-16,-8],[-46,7],[-11,-3],[-10,-10],[-5,-15],[-3,-38],[-7,-11],[-41,-17],[-20,0],[-21,10],[-20,6],[-57,46],[-22,12],[-42,10],[-42,2],[-1,0],[-1,0],[-48,3],[-91,-20],[-22,5],[-22,4],[-46,-8],[-33,3],[-35,-16],[-10,-1],[-10,1],[-20,7],[-22,3],[-104,-14],[-11,-5],[-17,-15],[-8,-5],[-10,1],[-21,11],[-17,-6],[-17,-11],[-20,-7],[-62,-4],[-58,11],[-46,-4],[-44,-14],[-34,-22],[-43,-47],[-15,-5],[-32,3],[-28,-12],[-31,-3],[-61,-18],[-31,-16],[-11,-10],[-3,-14],[11,-22],[5,-18],[-13,-9],[-40,-7],[-17,-7],[-9,-6],[-6,-9],[2,-9],[3,-10],[-1,-10],[-12,-13],[-28,-9],[-15,-10],[-11,-15],[-33,-24],[-9,-11],[-9,-11],[-9,-10],[-11,-5],[-45,-4],[-14,-12],[1,-34],[12,-30],[2,-15],[-8,-13],[-11,-5],[-11,-1],[-11,6],[-20,28],[-40,34],[-14,8],[-13,-2],[-7,-10],[-8,-33],[-6,-18],[-5,-12],[-18,-22],[-3,-17],[7,-17],[4,-14],[-14,-10],[-16,-4],[-14,-6],[-11,-10],[-53,-76],[-14,-14],[-44,-20],[-4,-7],[-3,-24],[-5,-10],[-7,-6],[-21,-13],[-27,-23],[-4,-8],[-3,-23],[-4,-11],[-22,-29],[-7,-17],[3,-16]],[[7709,6688],[-5,-12],[-4,-7],[-7,-8],[-15,-13],[-9,-6],[-14,-6],[-6,-5],[-5,-11],[-5,-7],[-16,-10],[-3,-5],[-3,-7],[-6,-31],[-6,-6],[-30,-4],[-12,4],[-11,12],[-9,-2],[-83,-41],[-18,-16],[-10,-19],[-8,-18],[-4,-18],[0,-39],[-15,-26],[-3,-8],[-5,-12],[-5,-39],[-7,-22],[-3,-9],[-7,-6],[-6,14],[-3,5],[-3,3],[-7,-4],[-6,-5],[-28,-45],[-21,8],[-6,3],[-10,3],[-10,0],[-47,-11],[-8,-3],[-8,-5],[-10,-1],[-7,0],[-39,17],[-31,7],[-11,5],[-14,8],[-20,17],[-24,15],[-16,-62],[-5,-15],[-33,-75]],[[7002,6170],[-13,-23],[-33,-36],[-8,-6],[-37,-20],[-36,-14],[-10,0],[-9,3],[-33,26],[-32,6],[-8,7],[-14,41],[-15,21],[-18,32],[-10,47],[-19,23],[-55,13],[-24,-2],[-6,7],[-7,19],[-2,43],[-3,11],[-4,12],[-18,37],[-4,19]],[[6584,6436],[2,59],[-4,11],[-6,16],[-28,32],[1,14],[6,12],[7,9],[12,10],[51,35],[16,29],[4,11],[11,27],[4,1],[4,-3],[7,-3],[10,0],[16,7],[11,11],[9,13],[6,14],[4,12],[0,8],[-1,5],[-3,5],[-1,5],[-1,13],[1,5],[5,5],[17,12],[5,10],[4,15],[3,51],[8,27]],[[7415,7311],[1,-4],[8,-9],[25,-18],[9,-10],[18,-24],[19,-10],[19,-6],[20,-11],[11,-16],[3,-36],[7,-16],[32,-29],[9,-17],[24,-54],[4,-16],[1,-11],[-1,-10],[0,-9],[3,-13],[4,-7],[11,-11],[4,-6],[9,-19],[3,-20],[-4,-20],[-12,-21],[-9,-22],[6,-19],[14,-14],[38,-24],[12,-11],[6,-17],[0,-21],[-5,-20],[-3,-21],[4,-24],[4,-7]],[[7286,5687],[-1,0],[-85,-8],[-26,5],[-36,-21],[-20,-2],[-7,26],[3,5],[4,7],[10,7],[3,4],[3,5],[0,4],[-3,5],[-6,4],[-14,5],[-8,1],[-6,-1],[-7,-6],[-3,-2],[-5,4],[-4,3],[-22,38],[-3,20],[0,17],[3,26],[3,17],[5,13],[1,9],[2,16],[0,6],[-1,7],[-3,13],[-3,8],[-11,21],[-19,14]],[[7030,5957],[3,34],[1,44],[-2,21],[-4,20],[-9,21],[-4,13],[0,11],[0,10],[-1,11],[-3,14],[-9,14]],[[7709,6688],[5,-10],[9,-14],[6,-15],[-1,-21],[-7,-16],[-33,-39],[-22,-35],[-1,-30],[13,-28],[38,-57],[21,-23],[3,-15],[-6,-21],[-17,-35],[-48,-44],[-18,-29],[-1,-48],[3,-11],[-1,-11],[-5,-9],[-7,-7],[-6,-11],[-6,-26],[-5,-12],[-6,-7],[-11,-6],[-83,-44],[-25,-25],[-13,-34],[-10,-37],[-37,-68],[-9,-13],[-27,-18],[-49,-52],[-7,-13],[-1,-17],[5,-24],[3,-23],[-3,-27],[-7,-22],[-13,-8],[-28,6],[-15,-1],[-1,-1]],[[6123,8506],[1,-4],[19,-28],[1,-5],[1,-6],[-13,-22],[-2,-4],[-5,-26],[0,-10],[1,-11],[3,-14],[0,-9],[-8,-155],[-9,-31],[-7,-11],[-3,-2],[-2,-1],[-31,-5],[-10,-13],[0,-4],[-1,-7],[3,-23],[-1,-23],[-1,-7],[-5,-8],[-1,-2],[0,-3],[0,-5],[1,-2],[6,-14],[3,-10],[1,-9],[0,-8],[-2,-10],[1,-4],[3,-2],[3,-1],[2,0],[1,-2],[2,-3],[5,-9],[8,-23],[0,-10],[0,-9],[-14,-37],[-5,-25],[-2,-7],[-3,-6],[-3,-5],[-20,-20],[-2,-3],[-1,-3],[-1,-3],[-1,-3],[-1,-2],[-3,-3],[-8,-4],[-11,-13],[-1,-4],[0,-4],[6,-11],[7,-15],[8,-40],[8,-19],[7,-10],[2,-9],[0,-10],[-1,-11],[1,-14],[2,-12],[7,-16],[3,-12],[1,-8],[0,-18]],[[6062,7604],[-9,18],[-3,6],[-3,6],[-6,5],[-8,5],[-27,9],[-12,2],[-28,13],[-14,11],[-20,23],[-8,14],[-5,7],[-8,8],[-1,1],[-1,2],[0,2],[-9,5],[-33,8],[-17,5],[-4,-1],[-4,-2],[-19,-16],[-5,-2],[-5,-2],[-6,2],[-7,6],[-31,31],[-44,71],[-8,24],[-43,-8],[-11,-5],[-7,-2],[-8,1],[-59,21],[-113,11],[-37,-3],[-7,3],[-17,13],[-34,10]],[[5381,7906],[-22,8],[-13,16]],[[5232,8295],[6,0],[8,5],[7,6],[46,50],[9,7],[12,6],[12,15],[12,14],[19,3],[28,-12],[17,0],[7,15],[-5,47],[0,22],[5,18],[13,12],[14,-1],[13,-7],[14,-4],[18,2],[14,9],[4,17],[-10,25],[43,4],[33,10],[8,1],[6,4],[9,22],[4,4],[14,3],[26,10],[12,2],[3,9],[4,17],[8,16],[16,3],[-4,14],[-2,5],[-4,4],[8,12],[13,0],[27,-4],[14,1],[9,-1],[8,-5],[26,-21],[8,0],[3,10],[-1,24],[-9,33],[3,12],[15,7],[15,-5],[7,-14],[7,-18],[9,-15],[10,-6],[8,3],[3,9],[-2,16],[-3,5],[-12,11],[-4,7],[-4,13],[2,4],[4,-2],[3,-1],[47,-7],[14,-10],[14,-16],[11,-20],[10,-40],[14,-16],[16,-13],[12,-13],[12,-39],[7,-9],[15,-14],[4,-2],[66,-56],[14,1],[13,9],[16,4]],[[7286,5687],[-10,-6],[-9,-19],[0,-24],[3,-25],[7,-21],[14,-28],[20,-32],[22,-27],[49,-36],[3,-27],[-20,-77],[0,-20],[6,-38],[2,-22],[-1,-27],[-4,-15],[-19,-29],[-8,-22],[1,-18],[2,-17],[-3,-21],[-11,-14],[-34,-9],[-15,-6],[-7,-15],[-9,-10],[-10,-5],[-12,2],[-19,8],[-7,-3],[-3,-14],[-12,-32],[-50,-13],[-93,2],[-93,-18],[-22,1],[-57,16],[-56,3],[-13,5],[-24,16],[-39,5],[-150,70],[-23,2],[-37,-8],[-7,-3]],[[6538,5116],[-6,10]],[[6532,5126],[-12,23],[-7,38],[-8,16],[-6,8],[-10,18],[-4,15],[-1,4],[-2,3],[-5,7],[-2,3],[-1,4],[-3,9],[-7,16],[-3,11],[-2,4],[-2,4],[-4,2],[-7,5],[-2,2],[-2,3],[-2,5],[-1,3],[-2,2],[-6,4],[-2,2],[-2,3],[-4,8],[-4,4],[-5,1],[-7,-1],[-14,-7],[-82,-50],[-51,-47],[-14,3]],[[6246,5251],[-4,40],[1,8],[2,4],[4,4],[11,9],[35,33],[43,59],[27,48],[6,11],[1,9],[0,6],[-3,16],[-1,5],[0,4],[1,2],[23,7],[81,13]],[[6473,5529],[21,-9],[74,11],[40,10],[40,-12],[12,4],[41,25],[73,16],[40,15],[35,23],[8,10],[20,19],[17,49],[2,15],[0,19],[-11,73],[17,19],[37,18],[8,7],[5,44],[4,13],[7,12],[22,22],[24,16],[21,9]],[[6793,7112],[-43,25],[-20,20],[-4,2],[0,-4],[1,-8],[0,-11],[-5,-12],[-7,-12],[-9,-14],[-9,-10],[-16,-10],[-47,-7],[-29,-15],[-12,-8],[-2,0],[-2,2],[0,7],[-1,3],[-1,2],[-2,2],[-9,4]],[[6576,7068],[-3,85],[-3,9],[-5,11],[-11,17],[-4,8],[-1,8],[0,8],[0,2],[-1,3],[-1,4],[-3,4],[-5,6],[-4,7],[-7,21],[-2,6],[0,3],[0,6],[-1,3],[-1,5],[-12,30],[-14,23],[-42,49],[-7,126],[-8,21],[-10,4],[-17,-2],[-3,0],[-2,1],[-3,2],[-3,4],[-3,7],[-2,10],[-2,17],[0,22],[0,11],[-3,13],[-11,40],[-7,4],[-17,-20],[-22,-16],[-42,-22],[-11,-2],[-11,-4],[-9,-7],[-46,-46],[-29,-11],[-24,1],[-6,-2],[-5,-3],[-3,-3],[-2,-1],[-1,0],[-2,2],[-3,6],[-4,3],[-5,0],[-4,-2],[-4,-3],[-5,-6],[-2,-2],[-3,2],[-3,5],[-7,14],[-3,10],[-4,16],[-3,5],[-4,3],[-9,2],[-11,4],[-9,15]],[[6123,8506],[3,1],[8,4],[7,8],[12,17],[28,23],[11,14],[24,51],[2,14],[-13,3],[-11,7],[5,24],[-6,10],[-4,38],[-6,16],[-4,8],[-2,9],[-1,11],[0,10],[1,3],[2,1],[1,1],[1,6],[-2,5],[-7,2],[-1,4],[-1,42],[2,21],[4,17],[4,6],[10,9],[5,6],[3,6],[4,13],[2,5],[31,29],[15,18],[12,47],[14,7],[95,-11],[15,4],[30,16],[17,3],[5,-1],[16,-6],[5,-5],[7,-5],[7,5],[7,8],[7,4],[14,5],[30,19],[16,-1],[11,-13],[7,-18],[7,-15],[15,-7],[9,-2],[4,-6],[2,-7],[4,-5]],[[6576,7068],[-8,-29],[-3,-4],[-5,-5],[-22,-13],[-5,-9],[-13,-34],[-6,-10],[-7,-6],[-10,-4],[-10,-1],[-10,0],[-19,-35],[-6,-23],[-3,-17],[-1,-23],[-9,-56],[-3,-14],[-7,-13],[-35,-13],[-87,-74],[-12,-6],[-37,6],[-32,-4],[-8,-4],[-4,-5],[-6,-14],[-19,-23],[-20,1],[-10,-4],[-8,-8],[-6,-4],[-22,1],[-31,-12]],[[6092,6609],[-11,21],[-5,4],[-4,-2],[-9,-1],[-25,8],[-17,-18],[-6,-12],[-6,-7],[-5,-3],[-4,-2],[-35,-21],[-8,-6],[-5,-7],[-12,-29],[-7,-13],[-4,-6],[-5,-4],[-30,-11],[-5,-5],[-4,-4],[-5,-14],[-31,-27],[-5,-2],[-7,-1],[-29,27],[-27,-11],[-4,-3],[-6,-6],[-7,-9],[-7,-15],[-11,-19],[-11,-26],[-5,-8],[-1,-1],[-52,-51],[-10,-7],[-31,-9],[-5,-3],[-1,-5],[0,-3],[1,-6],[4,-10],[1,-6],[0,-3],[-2,-13],[-19,-13],[-15,-4],[-35,-2],[-43,5],[-46,-9],[-10,2],[-51,18],[-5,0],[-2,-3],[0,-5],[-1,-5],[-3,-6],[-4,-6],[-8,-9],[-10,-8],[-19,-8],[-15,-10],[-5,-10]],[[5276,6684],[38,51],[3,7],[0,10],[1,10],[3,10],[16,26],[9,20],[4,34],[-9,14],[-3,4],[-18,13],[-1,10],[0,6],[1,7],[3,15],[5,15],[100,172],[3,8],[3,35],[3,13],[3,42],[0,7],[-1,15],[1,7],[1,7],[5,15],[3,7],[5,7],[21,13],[64,74],[14,20],[31,67],[-2,9],[-5,11],[-4,8],[-17,20],[-46,46],[-29,19],[-8,9],[-33,56],[-48,101],[-33,64],[-4,9],[-5,17],[-3,7],[-10,17],[-2,6],[0,7],[2,9],[5,15],[3,6],[4,5],[6,4],[16,6],[10,10]],[[6329,5791],[15,-11],[8,0],[36,12],[20,0],[5,7],[3,12],[3,15],[31,107],[13,13],[32,21],[9,4],[5,6],[2,5],[6,14],[15,20]],[[6532,6016],[22,-81],[0,-13],[-1,-16],[-4,-8],[-7,-10],[-28,-33],[-8,-15],[-5,-14],[-1,-10],[1,-17],[-1,-45],[-4,-9],[-2,-6],[-13,-19],[0,-25],[11,-36],[-2,-11],[-4,-16],[-6,-15],[-7,-23],[-2,-16],[-1,-15],[0,-9],[3,-25]],[[6246,5251],[-9,-14],[-2,-3],[-5,0],[-14,35],[-15,26],[-5,11],[-5,14],[-1,9],[-4,10],[-5,11],[-21,36],[-13,15],[-9,12],[-9,15],[-17,41],[-8,8],[-57,-51],[-3,-5],[-5,-3],[-4,-1],[-12,8],[-11,-3],[-12,-6],[-10,-1],[-102,46]],[[5888,5461],[-4,16],[-12,54],[-24,23],[-5,3],[-22,8],[-4,2],[-3,4],[-2,7],[-4,15],[-3,9],[-3,7],[-3,10],[-1,13],[1,30],[7,37],[-1,24],[9,38]],[[5814,5761],[9,43],[-3,47],[17,49],[9,10],[2,15],[20,78],[27,55],[2,4],[50,-17],[10,1],[64,-6],[20,7],[14,-3],[12,-7],[12,-12],[8,-10],[30,-23],[5,-29],[23,-48],[5,-14],[7,-9],[14,-3],[12,-14],[18,-53],[8,-50],[11,-45],[15,-3],[28,11],[9,9],[9,13],[3,11],[2,12],[4,13],[6,5],[8,0],[25,-7]],[[6462,6266],[11,-43],[24,-25],[4,-9],[4,-14],[3,-15],[5,-20],[21,-44],[4,-16],[7,-39],[-13,-25]],[[6329,5791],[5,35],[2,6],[0,8],[-7,6],[-4,4],[-5,7],[-4,10],[-4,6],[-4,8],[-4,14],[-3,15],[-1,19],[3,55],[0,23],[3,46],[-4,25],[-23,10],[-30,15],[-42,3],[-20,28],[-13,23],[-10,9],[-11,8],[-19,6],[-18,12],[-11,17],[-3,21],[2,21],[5,61],[-3,43]],[[6106,6355],[11,7],[6,15],[10,-5],[9,-8],[36,-4],[29,-14],[14,1],[15,5],[9,1],[14,-7],[34,1],[8,-2],[48,17],[31,-4],[22,-7],[12,-9],[10,-11],[23,-43],[15,-22]],[[6584,6436],[-5,-17],[-6,-13],[-26,-45],[-11,-13],[-21,-18],[-22,-14],[-6,-4],[-7,-5],[-4,-1],[-3,-3],[-2,-6],[-2,-12],[-7,-19]],[[6106,6355],[-26,-5],[-1,38],[2,20],[2,124],[8,49],[1,28]],[[6532,5126],[-42,33],[-5,2],[-4,1],[-4,1],[-4,-2],[-4,-3],[-24,-39],[-39,-32],[-7,-4],[-9,1],[-2,4],[0,7],[1,8],[0,7],[-1,5],[-2,4],[-6,4],[-6,3],[-24,8],[-31,3],[-8,-1],[-12,0],[-7,-2],[-6,-3],[-16,-12],[-4,-6],[-6,-22],[-10,-28],[-7,-14],[-12,-17],[-7,-9],[-9,-7],[-27,-31],[-4,-5],[-37,-52],[-5,-13],[-4,-7],[-22,-20],[-69,-43],[-68,-67],[-9,-9],[-9,-12],[-11,-30],[-7,-30],[-14,-32],[-9,-10],[-4,-4],[-8,-6],[-10,-4],[-11,-2],[-8,0],[-14,8],[-11,3],[-103,0]],[[5709,4845],[23,35],[3,7],[6,16],[4,39],[-1,9],[-2,10],[-7,12],[-2,3],[0,2],[2,2],[9,24],[8,14],[17,19],[9,7],[10,5],[34,9],[6,3],[3,3],[0,5],[0,2],[-1,6],[-10,33],[-3,4],[-7,9],[-9,7],[-16,19],[-7,13],[-3,12],[2,40],[7,37],[15,42],[12,22],[15,18],[9,8],[21,64],[13,28],[19,28]],[[5814,5761],[-9,-3],[-11,2],[-21,13],[-24,9],[-10,6],[-6,1],[-21,-1],[-9,1],[-10,5],[-13,13],[-3,2],[-3,2],[-12,4],[-10,6],[-51,16],[-7,0],[-10,-5],[-41,-35],[-21,-14],[-12,-5],[-3,-3],[-6,-8],[-4,-2],[-5,-1],[-13,3],[-4,1],[-3,5],[-2,5],[-5,32],[-1,17],[-2,8],[-3,11],[-36,47],[-3,9],[-3,13],[-1,21],[-5,21]],[[6538,5116],[-12,-5],[-11,-16],[-2,-17],[3,-17],[-2,-16],[-12,-17],[-9,-16],[4,-16],[20,-27],[7,-14],[9,-42],[6,-18],[17,-32],[6,-16],[5,-22],[7,-21],[10,-8],[17,-3]]],"transform":{"scale":[0.001440696966896691,0.0009087976873687463],"translate":[60.48677779100012,29.38660532600005]}};
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
  Datamap.prototype.nplTopo = '__NPL__';
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
        var color;
        var subunitData = data[subunit]
        if ( ! subunit ) {
          continue;
        }
        else if ( typeof subunitData === "string" ) {
          color = subunitData;
        }
        else if ( typeof subunitData.color === "string" ) {
          color = subunitData.color;
        }
        else if ( typeof subunitData.fillColor === "string" ) {
          color = subunitData.fillColor;
        }
        else {
          color = this.options.fills[ subunitData.fillKey ];
        }
        // If it's an object, overriding the previous data
        if ( subunitData === Object(subunitData) ) {
          this.options.data[subunit] = defaults(subunitData, this.options.data[subunit] || {});
          var geo = this.svg.select('.' + subunit).attr('data-info', JSON.stringify(this.options.data[subunit]));
        }
        svg
          .selectAll('.' + subunit)
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
