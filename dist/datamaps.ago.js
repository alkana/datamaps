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
  Datamap.prototype.afgTopo = '__AFG__';
  Datamap.prototype.agoTopo = {"type":"Topology","objects":{"ago":{"type":"GeometryCollection","geometries":[{"type":"Polygon","properties":{"name":"Lunda Norte"},"id":"AO.LN","arcs":[[0,1,2]]},{"type":"Polygon","properties":{"name":"Lunda Sul"},"id":"AO.LS","arcs":[[3,4,5,6,-1]]},{"type":"Polygon","properties":{"name":"Malanje"},"id":"AO.ML","arcs":[[7,-2,-7,8,9,10,11]]},{"type":"Polygon","properties":{"name":"Bengo"},"id":"AO.BO","arcs":[[12,13,14,15,16,17,18]]},{"type":"Polygon","properties":{"name":"Cuanza Norte"},"id":"AO.CN","arcs":[[-11,19,-13,20]]},{"type":"Polygon","properties":{"name":"Cuanza Sul"},"id":"AO.CS","arcs":[[-10,21,22,23,24,-14,-20]]},{"type":"Polygon","properties":{"name":"Luanda"},"id":"AO.LU","arcs":[[25,-16]]},{"type":"Polygon","properties":{"name":"Uíge"},"id":"AO.UI","arcs":[[-12,-21,-19,26,27]]},{"type":"Polygon","properties":{"name":"Zaire"},"id":"AO.ZA","arcs":[[-27,-18,28]]},{"type":"Polygon","properties":{"name":"Cabinda"},"id":"AO.CB","arcs":[[29]]},{"type":"Polygon","properties":{"name":"Bié"},"id":"AO.BI","arcs":[[-6,30,31,32,33,-22,-9]]},{"type":"Polygon","properties":{"name":"Benguela"},"id":"AO.BG","arcs":[[34,35,36,37,-24]]},{"type":"Polygon","properties":{"name":"Cuando Cubango"},"id":"AO.CC","arcs":[[38,39,40,-32,41]]},{"type":"Polygon","properties":{"name":"Cunene"},"id":"AO.CU","arcs":[[-40,42,43,44]]},{"type":"Polygon","properties":{"name":"Huambo"},"id":"AO.HM","arcs":[[45,-35,-23,-34]]},{"type":"Polygon","properties":{"name":"Huíla"},"id":"AO.HL","arcs":[[-33,-41,-45,46,-36,-46]]},{"type":"Polygon","properties":{"name":"Moxico"},"id":"AO.MX","arcs":[[47,-42,-31,-5]]},{"type":"MultiPolygon","properties":{"name":"Namibe"},"id":"AO.NA","arcs":[[[48]],[[-47,-44,49,-37]]]}]}},"arcs":[[[8265,7109],[0,1],[-3,0],[-44,-24],[-13,-15],[-17,-16],[-18,-12],[-65,-10],[-49,-15],[-26,-13],[-18,-13],[-5,-5],[-5,-7],[-12,-12],[-16,-11],[-104,-23],[-54,-1],[-42,8],[-37,3],[-46,-9],[-17,-1],[-22,-2],[-43,-15],[-22,-6],[-35,-4],[-15,-4],[-24,-10],[-33,-21],[-24,-28],[-59,-37],[-40,-44],[-26,-39],[-8,-18],[-12,-36],[-11,-20],[-18,-18],[-35,-17],[-55,-17],[-125,-51],[-12,-8],[-8,-14],[-8,-16],[-12,-33],[-7,-16],[-16,-13],[-25,-10],[-44,-7],[-27,-9],[-35,-20],[-123,-93],[-18,-14],[-8,-8],[-9,-10],[-6,-20],[-21,-145],[-6,-18],[-9,-20],[-26,-35],[-35,-36],[-54,-30],[-113,-25],[-28,-20],[-20,-12],[-25,-11],[-76,-12],[-30,-14],[-32,-24],[-41,-25],[-58,-16],[-19,-8],[-25,-16],[-41,-32],[-19,-12],[-22,-11],[-56,-17],[-81,-10],[-20,-4],[-22,-7],[-25,-15],[-36,-33],[-21,-15],[-70,-31],[-60,-10],[-146,6],[15,-5]],[[5487,5593],[-24,-6],[-14,-5],[-21,5],[-19,7],[-81,51],[-42,32],[-17,18],[-12,19],[-6,17],[2,18],[14,31],[9,14],[13,11],[21,31],[8,17],[-2,15],[-9,12],[-9,5],[-346,118],[-75,26],[-24,1],[-31,5],[-14,11],[-7,14],[-3,17],[-21,30],[-16,8],[-34,10],[-15,3],[-9,5],[-10,10],[-8,13],[-11,12],[-30,16],[-9,13],[-3,32],[-2,13],[-3,9],[-12,19],[-15,19],[-26,53],[-4,20],[3,18],[13,16],[18,11],[21,9],[96,30],[13,7],[12,14],[10,34],[17,39],[2,25],[-15,70],[-1,20],[2,15],[4,21],[13,55],[3,127],[-6,43],[-13,22],[-15,21],[-12,20],[-7,27],[-1,21],[4,19],[8,17],[10,14],[6,9],[11,12],[-8,8],[-8,18],[-4,19],[2,92],[-20,13],[-6,8],[4,9],[6,8],[1,8],[-1,8],[2,9]],[[4734,7298],[6,-7],[45,-10],[23,1],[69,21],[24,-1],[27,-10],[10,2],[50,25],[13,2],[27,-3],[24,-10],[41,-32],[22,-4],[72,1],[-5,19],[1,20],[7,17],[15,8],[13,3],[32,14],[13,2],[61,-2],[39,-2],[30,-10],[11,-1],[12,4],[18,8],[13,2],[50,1],[5,-1],[16,0],[-5,28],[2,14],[10,6],[58,0],[63,0],[58,0],[7,-4],[4,-20],[5,-9],[12,-18],[36,0],[103,0],[103,0],[103,0],[103,0],[22,0],[-18,57],[-2,19],[2,23],[12,33],[8,22],[16,45],[3,20],[-1,17],[-6,19],[-9,20],[-7,20],[2,19],[56,-4],[15,3],[12,11],[8,29],[11,13],[1,0],[1,1],[23,16],[0,23],[-21,49],[-6,25],[-3,23],[9,119],[8,23],[9,14],[23,25],[5,12],[-2,8],[-15,29],[42,0],[34,0],[34,0],[34,0],[34,0],[33,0],[34,0],[34,0],[34,0],[34,0],[9,0],[25,0],[34,0],[34,0],[34,0],[34,0],[33,0],[34,0],[39,0],[0,11],[4,24],[3,10],[7,12],[7,4],[9,2],[42,0],[68,0],[70,0],[46,0],[-19,-44],[-22,-52],[-12,-30],[-17,-40],[-5,-34],[1,-35],[1,-36],[37,0],[59,0],[59,0],[58,0],[59,0],[59,1],[58,0],[59,0],[59,0],[59,0],[58,0],[59,0],[59,1],[58,0],[59,0],[59,0],[58,0],[27,0],[17,0],[0,-3],[3,-3],[5,-2],[6,-3],[5,-6],[18,-35],[5,-5],[4,-7],[-2,-6],[-4,-5],[-1,-4],[4,-8],[6,-5],[5,-6],[2,-9],[-1,-4],[-4,-7],[-1,-4],[2,-4],[7,-7],[2,-4],[-1,-9],[-8,-15],[-2,-8],[-1,-10],[2,-4],[3,-4],[2,-7],[0,-28],[-3,-6],[-12,-10],[-2,-5],[-2,-13],[-3,-10],[-6,-14],[-10,-25],[-10,-27],[-6,-16],[-9,-24],[-5,-12],[-4,-32],[5,-19],[1,-8],[-3,-9],[-12,-15],[-2,-7],[2,-49],[4,-14],[7,-5],[26,-13],[5,-9],[2,-18],[5,-14],[9,-13],[20,-22],[5,-9],[3,-13],[1,-31],[9,-35],[7,-13],[23,-21],[8,-14],[-6,-3]],[[8265,7109],[-6,-3],[-4,-8],[9,-19],[20,-28],[6,-32],[-3,-32],[-19,-56],[4,-2],[2,-1],[4,-1],[6,-1],[-15,-23],[-9,-23],[-9,-53],[-8,-47],[-6,-5],[-6,-24],[-9,-18],[-6,-58],[2,-38],[-12,-84],[10,-74],[0,-30],[-9,-31],[-25,-45],[-5,-26],[-8,-15],[-1,-9],[3,-8],[14,-15],[5,-8],[10,-30],[9,-64],[9,-30],[20,-29],[51,-48],[11,-29],[5,3],[13,4],[5,3],[1,-24],[10,-21],[47,-48],[8,-4],[5,1],[6,6],[9,-4],[13,-11],[31,-18],[12,-11],[6,-17],[6,-25],[17,-41],[7,-30],[4,-10],[-6,-23],[15,-34],[20,-33],[14,-34],[19,-30],[7,-22],[12,-13],[2,-9],[-1,-8],[-4,-14],[-1,-8],[-4,-11],[-18,-26],[-5,-16],[2,-15],[8,-10],[10,-10],[7,-15],[3,-31],[-1,-15]],[[8584,5438],[-30,-9],[-24,-1],[-8,1],[-5,1],[-4,2],[-13,8],[-5,2],[-5,2],[-43,11],[-8,0],[-16,-1],[-7,0],[-6,2],[-5,0],[-3,-2],[-6,-5],[-6,-5],[-2,-3],[-14,-3],[-132,-12],[-49,3],[-14,-2],[-9,-2],[-6,-5],[-4,-6],[-15,-22],[-9,-22],[-3,-23],[-4,-11],[-1,-4],[-1,-9],[3,-28],[0,-4],[-3,-6],[-5,-5],[-24,-16],[-9,-8],[-17,-20],[-1,-3],[-1,-4],[0,-9],[0,-4],[-1,-4],[-2,-4],[-2,-8],[-1,-24],[0,-4],[-2,-3],[-5,-6],[-2,-3],[-2,-3],[0,-2],[0,-2],[0,-2],[2,-8],[2,-3],[2,-4],[2,-3],[6,-5],[2,-2],[1,-4],[1,-4],[2,-3],[3,-3],[3,-2],[9,0],[3,-1],[0,-3],[-2,-7],[-1,-4],[1,-4],[1,-4],[2,-2],[3,-4],[-5,-24],[-8,-6],[-4,0],[-21,-8],[-11,-5],[-38,-15],[-8,-2],[-21,0],[-12,2],[-3,2],[-3,3],[-3,3],[-4,1],[-3,-1],[-4,-3],[-5,0],[-12,1],[-4,-1],[-3,-3],[-2,-3],[-2,-4],[-7,-8],[-4,-4],[-52,-9],[-13,-7],[-5,-3],[-33,-7],[-42,-19],[-19,-4],[-25,-4],[-9,-3],[-5,-2],[-1,-2],[1,-2],[1,-2],[1,-1],[-1,-1],[-12,-16],[-6,-6],[-4,-3],[-9,-4],[-5,-3],[-4,-3],[-2,-3],[-7,-10],[-2,-3],[-1,-3],[-3,-4],[-4,-3],[-8,-3],[-3,-3],[-4,-1],[-5,-1],[-19,1],[-5,0],[-10,-6],[-14,-6],[-23,-13],[-3,-4],[-1,-5],[2,-4],[6,-12],[0,-6],[0,-3],[-1,-2],[-2,-2],[-36,-3],[-68,4],[-14,2],[-9,2],[-7,2],[-12,0],[-11,1],[-13,2],[-33,11],[-10,1],[-13,-1],[-6,-1],[-11,5],[-3,7],[-2,3],[-8,8],[-5,1],[-6,0],[-18,-2],[-8,3],[-4,2],[-24,14],[-6,2],[-38,10],[-7,2],[-5,3],[-2,2],[-3,8],[-3,2],[-5,2],[-5,0],[-10,-1],[-6,0],[-18,5],[-3,0],[-2,2],[-3,2],[-3,2],[-7,4],[-3,2],[-7,9],[-2,2],[-2,1],[-3,2],[-14,6],[-9,6],[-2,1],[-7,2],[-11,6],[-5,0],[-6,0],[-9,-4],[-10,-6],[-4,-1],[-5,0],[-14,5],[-4,1],[-15,2],[-3,2],[-3,2],[-2,3],[-4,5],[-2,2],[-3,2],[-5,2],[-23,8],[-14,2],[-7,3],[-5,3],[-3,2],[-3,2],[-4,2],[-13,3],[-4,2],[-2,3],[-3,3],[-4,1],[-7,0],[-12,-4],[-5,-4],[-4,-4],[-2,-3],[-6,-5],[-7,-9],[-8,-8],[-5,-5],[-3,-3],[-2,-3],[-3,-2],[-9,-6],[-3,0],[-18,3],[-5,2],[-4,2],[-3,2],[-10,3],[-4,2],[-3,3],[-5,1],[-8,1],[-15,-3],[-24,1],[-5,-1],[-4,-3],[-3,-3],[-2,-4],[-3,-7],[-2,-3],[-1,-1],[-3,-2],[-2,-2],[-6,-2],[-5,-1],[-6,1],[-12,2],[-6,3],[-4,4],[-4,10],[-2,3],[-1,2],[-4,1],[-5,2],[-10,2],[-9,4],[-3,2],[-5,-1],[-6,-3],[-25,-21],[-5,-3],[-5,-2],[-30,-9],[-14,-2],[-5,1],[-8,1],[-40,16],[-32,21],[-13,1],[-33,-7],[-10,-10],[-4,-8],[0,-4],[-1,-2],[-2,-2],[-4,-8],[-2,-3],[-26,-19],[-4,-4],[-4,-3],[-19,-13],[-8,-7],[-6,-4],[-45,-21],[-7,-1],[-8,-1],[-36,0],[-5,1],[-4,2],[-7,3],[-4,2],[-5,0],[-11,0],[-9,0],[-4,-2],[-5,-3],[-11,-9],[-4,-7],[-12,-6],[-39,-12]],[[6067,4820],[1,18],[6,29],[8,18],[6,18],[17,36],[-1,17],[-11,17],[-16,13],[-27,8],[-43,9],[-19,7],[-18,14],[-38,35],[-38,26],[-171,98]],[[5723,5183],[-7,19],[-10,16],[-13,13],[-14,12],[-30,24],[-13,14],[-12,17],[-9,21],[-4,19],[-3,40],[-3,5],[-4,2],[-3,3],[1,6],[6,5],[4,-2],[4,-4],[6,0],[15,7],[0,5],[-10,9],[4,1],[8,3],[5,0],[-3,8],[1,6],[5,4],[8,3],[-5,2],[-12,8],[4,2],[4,5],[3,3],[-11,2],[-7,5],[-4,8],[0,10],[-11,-10],[-18,7],[-8,6],[-7,7],[-5,-5],[-6,9],[-14,12],[-5,22],[-11,12],[-3,10],[-10,0],[-16,6],[-13,-1],[7,12],[4,4],[-21,18]],[[4380,7809],[0,-17],[5,-10],[11,-7],[7,10],[5,1],[5,-3],[6,-3],[17,-4],[8,-3],[3,-6],[-5,-4],[-9,-3],[-10,-4],[-4,-9],[2,-7],[5,-5],[7,-4],[8,-6],[10,-17],[14,-35],[12,-16],[39,-18],[16,-11],[-3,-13],[4,-12],[-1,-18],[2,-11],[12,5],[2,-6],[2,-1],[-4,-3],[14,-6],[0,-6],[-5,-7],[-3,-6],[4,-10],[15,-12],[3,-6],[3,-4],[19,-3],[8,-3],[1,-7],[0,-9],[4,-7],[15,0],[0,-5],[-8,-7],[6,-1],[11,0],[7,-2],[3,-8],[-1,-10],[3,-5],[12,3],[9,-9],[-3,-7],[-7,-7],[-5,-10],[3,-5],[8,-4],[17,-8],[-4,-6],[0,-2],[1,-2],[3,-5],[2,3],[5,4],[4,3],[7,-23],[5,-7],[8,-7],[17,-8],[7,-6],[3,-12],[-10,-21],[7,-11]],[[5723,5183],[1,-20],[-10,-35],[-2,-20],[5,-20],[23,-37],[5,-19],[-4,-20],[-7,-15],[0,-13],[17,-17],[7,-5],[7,-5],[6,-6],[6,-10],[3,-11],[1,-15],[2,-15],[-7,-12],[-14,-4],[-35,4],[-19,0],[-41,-8],[-85,-28],[-42,-20],[-16,-10],[-55,-50],[-16,-9],[-18,-5],[-20,0],[-39,2],[-41,8],[-21,-1],[-60,-15],[-8,-1],[-8,-2],[-7,0],[-5,0],[-13,4],[-19,2],[-3,0],[-7,2],[-7,0],[-8,-2],[-15,-6],[-8,-2],[-6,-1],[-3,2],[-2,1],[-4,4],[-3,4],[-1,3],[-2,3],[-2,3],[-3,3],[-3,2],[-3,1],[-2,1],[-3,1],[-10,-2],[-19,-4],[-6,-1],[-7,0],[-4,0],[-11,0],[-4,1],[-5,1],[-3,2],[-3,2],[-3,2],[-2,3],[-4,7],[0,2],[0,4],[3,26],[0,1],[-1,3],[-4,7],[-6,9],[-6,15],[-2,4],[-2,3],[-5,5],[-11,5],[-24,20],[10,-50],[2,-51],[-7,-23],[-15,-18],[-77,-72],[-19,-12],[-38,-28],[-14,-5],[-14,-3],[-23,-5],[-12,6],[-55,23],[-3,2],[3,5],[4,12],[1,12],[1,9],[-3,8],[-21,43],[-3,17],[8,17],[7,3],[21,8],[6,4],[-1,13],[-10,1],[-13,-4],[-10,-5],[2,10],[-2,17],[3,6],[12,7],[5,3],[2,5],[0,11],[0,5],[3,4],[-3,13],[-30,45],[-11,13],[-5,8],[0,9],[2,15],[-6,12],[-6,3],[-8,-1],[-13,1],[-17,7],[-6,12],[8,14],[20,12],[6,-5],[10,7],[5,10],[2,26],[-5,14],[-19,24],[-8,25],[-21,18],[-8,12],[-3,12],[1,26],[-4,12],[-15,11],[-42,23],[-9,14],[-7,3],[-43,-6],[-11,3],[-12,6],[-12,4],[-10,-3],[-9,26],[-9,6],[-14,-7],[-15,5],[-8,-9],[-9,-7],[-21,9],[-16,11],[-13,7],[-85,22],[-13,5],[-17,7],[-33,-11],[-14,2],[-17,-7],[-18,2],[-16,6],[-10,8],[-23,33],[-9,7],[-9,2],[-22,0],[-9,3],[-7,8],[-14,23],[-7,3],[-7,2],[-7,4],[-2,11],[2,6],[6,5],[15,9],[-10,7],[-12,6]],[[3988,5467],[-6,4],[-6,4],[-10,19],[-19,13],[-4,5],[-3,5],[-47,53],[-19,8],[-12,9],[-6,2],[-5,3],[-2,10],[6,25],[-1,8],[-35,40],[-4,2],[-4,3],[-6,3],[-8,2],[-10,0],[-6,2],[-5,3],[-4,5],[-7,10],[-3,13],[-1,30],[5,16],[11,9],[13,5],[9,8],[-30,110],[-12,5],[-7,14],[-7,46],[-3,5],[-7,6],[-6,1],[-18,3],[-3,3],[-5,5],[-9,8],[-10,10],[-4,12],[-2,16],[-6,13],[-7,11],[-7,8],[-15,9],[-15,5],[-34,1],[-18,3],[-13,4],[-11,1],[-11,-8],[-16,13],[-6,2],[-11,2],[-8,-2],[-7,-3],[-10,-2],[-4,3],[-4,5],[-6,3],[-8,-3],[-6,-5],[-7,-4],[-8,-3],[-10,-1],[-15,0],[-26,4],[-16,1],[-5,2],[-11,7],[-6,1],[-9,-1],[-2,-5],[-1,-6],[-2,-8],[-6,-10],[-7,-9],[-10,-8],[-13,-3],[-75,-6],[-16,1],[-18,5],[-10,1],[-24,-12],[-14,1],[-15,4],[-19,1],[-4,-2],[-3,-3],[-2,-4],[-2,-1],[-7,0],[-12,4],[-6,1],[-62,-7],[-18,-6],[-11,-2],[-13,1],[-12,3],[-12,1],[-12,-5],[-10,7],[-17,5],[-16,3],[-7,-3],[-4,3],[-9,0],[-18,0],[-4,2],[-11,13],[-4,5],[-7,2],[-15,2],[-6,1],[-4,4],[-4,5],[-4,4],[-15,5],[-1,10]],[[2776,6090],[20,20],[10,15],[7,19],[-3,25],[-5,20],[-18,33],[-3,12],[24,28],[20,22],[-10,30],[-41,34],[8,12],[11,3],[12,0],[35,-2],[31,12],[13,26],[9,30],[22,21],[17,4],[35,0],[17,5],[7,5],[12,12],[7,5],[7,1],[14,0],[7,1],[10,5],[10,7],[10,6],[11,2],[8,-2],[15,-9],[8,-2],[32,0],[32,5],[11,4],[6,3],[8,7],[4,49],[-3,23],[0,21],[1,13],[8,25],[12,68],[23,68],[17,33],[6,16],[-3,16],[-11,14],[-36,13],[-17,11],[-12,19],[-6,15],[10,24],[31,40],[5,15],[1,10],[4,11],[14,8],[82,25],[14,12],[1,15],[-3,12],[-4,41],[-8,39],[1,33]],[[3333,7198],[51,-6],[21,0],[24,5],[28,16],[63,19],[14,6],[34,31],[14,66],[15,27],[5,12],[1,16],[-1,17],[-6,37],[-50,141],[-5,17],[4,19],[10,17],[28,15],[24,7],[42,3],[22,7],[51,33],[51,65],[55,34],[125,46],[17,3],[14,-2],[16,-6],[16,-12],[11,-15],[18,-35],[80,-99],[16,-15],[18,-11],[17,-7],[18,-3],[19,0],[18,4],[18,9],[17,16],[10,21],[4,16],[3,27],[3,14],[9,14],[9,9],[30,19],[44,14],[2,0]],[[2414,7061],[-21,-7],[-8,-6],[-4,-2],[-4,0],[-4,3],[-3,6],[-2,2],[-3,1],[-4,1],[-34,6],[-4,1],[-21,0],[-10,1],[-7,0],[-35,-2],[-4,0],[-18,4],[-9,2],[-21,0],[-13,-2],[-26,-11],[-35,-20],[-31,-27],[-2,-22],[1,-6],[5,-12],[13,-16],[21,-18],[19,-22],[28,-71],[4,-17],[-2,-17],[-6,-16],[-10,-15],[-14,-15],[-17,-14],[-27,-13],[-36,-12],[-92,-24],[-28,-20],[-5,-14],[3,-10],[13,-11],[27,-18],[6,-7],[2,-8],[-1,-13],[-11,-20],[-16,-12],[-16,-8],[-12,-10],[0,-13],[20,-12],[42,-11],[14,-10],[7,-14],[-4,-15],[-2,-13],[12,-18],[13,-18],[-1,-6],[-4,-14],[-27,-29],[-9,-15],[-19,-57],[-33,-70],[8,1],[23,-19],[19,-43],[12,-14],[13,-4],[20,0],[19,3],[11,3],[8,-2],[15,-10],[2,-3],[2,-4],[4,-17],[5,-4],[27,-5],[6,-2],[6,-1],[27,8],[19,-1],[17,-4],[16,-7],[12,-8],[22,-20],[7,-5],[21,-10],[5,-4],[14,-13],[6,-3],[6,3],[5,5],[5,2],[6,0]],[[2337,6057],[7,-59],[2,-53],[-2,-25],[-7,-19],[-11,-14],[-10,-21],[2,-17],[16,-40],[6,-26],[-7,-18],[-5,-18],[1,-15],[10,-18],[12,-11],[24,-19],[4,-33],[-3,-14],[-6,-18],[-22,-32],[-24,-21],[-54,22],[-35,29],[-15,16],[-20,17],[-61,24],[-25,7],[-23,3],[-18,2],[-19,-1],[-19,-5],[-19,-8],[-19,-9],[-51,-40],[-30,-15],[-16,-14],[-5,-2],[-8,-2],[-4,1],[-3,1],[-3,2],[-5,5],[-8,5],[-12,6],[-22,6],[-15,1],[-13,0],[-47,-7],[-10,1],[-6,2],[-3,4],[-8,5],[-8,1],[-24,0],[-12,2],[-22,8],[-6,0],[-2,-2],[1,-3],[1,-3],[-2,-3],[-8,-2],[-5,1],[-3,2],[-7,11],[-24,29],[-5,8],[-4,5],[-10,7],[-38,20],[-8,2],[-9,1],[-5,1],[-3,3],[-3,5],[-5,6],[-12,8],[-10,3],[-6,1],[-5,-2],[-3,-2],[-2,-3],[-11,-21]],[[1468,5705],[-27,35],[-10,16],[-9,36],[-13,15],[-31,29],[-48,69],[2,11],[7,10],[5,15],[-6,30],[-18,32],[-22,30],[-64,68],[-6,14],[4,12],[18,18],[5,13],[-1,12],[-5,15],[-6,12],[-7,5],[1,9],[-26,68],[-2,14],[2,32],[-3,12],[-15,25],[-4,16]],[[1189,6378],[27,11],[7,5],[16,23],[14,27],[18,27],[29,23],[20,8],[14,1],[30,-4],[18,2],[12,3],[11,2],[17,-2],[35,-9],[6,16],[17,131],[31,36],[24,39],[16,13],[14,6],[23,5],[3,23],[-6,35],[-14,46],[-11,19],[-15,14],[-16,4],[-16,-4],[-13,0],[-9,1],[-38,27],[-18,9],[-16,6],[-46,6]],[[1373,6927],[-5,11],[-10,49],[-8,24],[10,2],[8,-1],[6,1],[6,8],[2,7],[1,55],[-4,16],[-7,17],[-75,106],[-10,7],[-11,33],[-7,13],[-6,8],[-10,20],[-5,7],[-15,28],[-7,33],[-53,87],[-23,47]],[[1150,7505],[1,1],[4,0],[39,4],[21,5],[15,6],[8,3],[6,4],[5,5],[21,14],[3,0],[4,-1],[4,-3],[4,-1],[5,-2],[8,-1],[4,2],[4,2],[1,3],[1,3],[2,3],[3,4],[10,6],[9,4],[19,6],[31,6],[8,0],[7,-1],[7,-3],[15,-13],[3,-2],[11,-5],[3,-2],[6,-2],[9,-2],[20,-1],[9,1],[93,25],[6,2],[6,5],[5,3],[7,4],[17,5],[10,1],[28,0],[8,2],[6,2],[3,3],[3,2],[3,1],[12,5],[6,4],[3,3],[4,2],[20,7],[7,3],[6,5]],[[1733,7632],[58,-7],[164,-2],[26,-7],[17,-13],[12,-16],[56,-49],[48,-52],[18,-15],[23,-13],[63,-26],[24,-7],[19,-3],[27,1],[114,21],[39,-9],[11,-12],[8,-16],[-6,-119],[-6,-17],[-35,-49],[-10,-20],[-7,-20],[-3,-31],[3,-27],[18,-63]],[[2776,6090],[-8,2],[-11,1],[-8,2],[-65,25],[-24,4],[-8,3],[-6,0],[-3,-7],[4,-16],[-3,-6],[-12,-6],[-63,5],[-29,-7],[-4,0],[-10,-6],[-8,1],[-9,3],[-9,-1],[-6,-4],[-5,-11],[-5,-5],[-6,-3],[-86,-12],[-9,1],[-17,3],[-29,1]],[[2414,7061],[24,5],[11,-2],[19,-5],[26,-4],[10,-1],[13,3],[22,6],[3,2],[6,4],[2,3],[13,12],[11,10],[4,7],[9,23],[5,7],[7,6],[11,9],[7,4],[6,2],[5,0],[4,-1],[7,-4],[5,-1],[6,1],[5,-1],[8,-3],[7,-3],[3,-3],[3,-2],[2,-3],[3,-3],[4,-2],[5,-2],[9,-1],[6,0],[6,2],[19,10],[7,3],[7,1],[15,0],[4,-1],[9,-3],[6,-1],[4,2],[2,3],[3,13],[2,4],[2,5],[6,4],[5,2],[7,0],[4,2],[3,2],[1,5],[6,8],[1,1],[4,0],[4,0],[3,1],[2,4],[4,10],[3,3],[3,7],[3,10],[2,24],[4,17],[6,7],[4,6],[1,5],[-1,5],[-6,9],[-4,4],[-5,3],[-4,0],[-7,-3],[-4,0],[-2,4],[0,8],[5,16],[7,13],[2,3],[1,11],[-6,23],[19,11],[52,12],[88,2],[14,1],[16,-18],[-1,-17],[-6,-16],[2,-19],[17,-13],[27,-6],[29,-1],[23,2],[19,5],[33,17],[17,7],[37,4],[20,0],[16,-2],[4,-2],[20,-14],[12,-11],[2,-4],[0,-1],[-13,-7],[-1,-13],[10,-12],[16,-3],[16,-12],[3,-36],[-1,-32]],[[3988,5467],[-23,-13],[-2,-4],[-1,-5],[2,-5],[2,-4],[2,-6],[0,-3],[-3,-5],[-21,-28],[-4,-4],[-3,-2],[-19,-4],[-17,-8],[-31,-36],[-19,-14],[-20,-13],[-46,-20],[-29,-17],[-19,-17],[-16,-17],[-46,-69],[-14,-14],[-16,-7],[-14,0],[-9,2],[-13,4],[-28,6],[-48,-4],[-20,1],[-15,6],[-43,26],[-33,-97],[-14,-31],[-16,-27],[-50,-65],[-21,-21],[2,-51],[-13,-37],[-19,-35]],[[3291,4829],[-22,-17],[-82,-19],[-61,-9],[-23,-7],[-27,-12],[-63,-20],[-30,-26],[-12,-49],[19,-29],[4,-14],[0,-6],[2,-10],[2,-6],[3,-4],[5,-2],[5,-5],[2,-4],[-1,-4],[-2,-3],[-2,-3],[-4,-7],[-1,-4],[-1,-4],[1,-14],[-1,-4],[-1,-3],[-4,-3],[-4,-1],[-4,-2],[-3,-4],[0,-4],[2,-3],[6,-6],[3,-4],[0,-4],[-3,-8],[-1,-6],[-5,-14],[-2,-19],[1,-8],[2,-4],[7,-8],[-39,0],[-18,-2],[-14,-9],[-11,-9],[-7,-4],[-11,-4],[-24,-4],[-91,-28],[-22,-19],[-15,-17],[-40,-80]],[[2704,4270],[-17,3],[-17,11],[-5,12],[-8,13],[-14,12],[-73,34],[-19,5],[-19,-1],[-35,-10],[-27,-1],[-48,13],[-25,30],[-22,40],[-77,93],[-28,18],[-15,2],[-21,-2],[-19,-7],[-38,-21],[-17,-12],[-39,-48],[-50,-34],[-39,43],[-20,16],[-37,20],[-11,13],[-6,16],[-7,35],[-9,14],[-16,7],[-18,3],[-47,-6],[-67,11],[-19,0],[-22,3],[-40,11]],[[1713,4606],[-12,117],[4,79],[3,16],[7,13],[-7,7],[1,8],[4,9],[2,9],[-1,40],[1,7],[4,8],[15,19],[3,8],[0,21],[20,104],[0,43],[1,54],[-4,26],[-12,24],[-72,95],[-6,14],[0,13],[6,12],[25,27],[1,12],[-5,11],[-10,12],[-33,25],[-5,7],[-4,8],[-76,83],[-52,38],[-12,14],[-4,14],[-1,50],[-3,16],[-7,15],[-16,21]],[[1189,6378],[-18,13],[-61,91],[-23,48],[-16,22],[-4,41],[31,57],[45,49],[41,16],[-18,-23],[-58,-44],[-29,-61],[-5,-19],[10,-9],[9,7],[45,69],[2,7],[4,8],[9,2],[11,1],[9,1],[12,10],[8,24],[10,15],[20,19],[5,8],[1,8],[-2,17],[4,8],[23,23],[15,10],[14,4],[-40,-36],[-10,-14],[12,6],[27,11],[14,9],[7,1],[5,3],[2,8],[0,5],[2,4],[3,2],[6,1],[50,-6],[19,6],[11,37],[12,28],[2,11],[-4,11],[-23,29],[-5,11]],[[1733,7632],[15,39],[9,10],[17,5],[4,1],[17,-1],[10,3],[6,2],[4,3],[13,12],[5,6],[10,3],[3,5],[-1,3],[-1,8],[-8,12],[-29,26],[-13,17],[-22,44],[0,26],[7,20],[39,51],[1,16],[-11,13],[-15,12],[-17,17],[-14,22],[-22,54],[-23,41],[15,7],[22,4],[7,0],[4,0],[8,-1],[44,0],[10,2],[6,2],[9,7],[5,6],[3,4],[5,2],[12,6],[4,3],[6,8],[2,2],[11,7],[27,11],[33,8],[46,11],[71,32],[8,6],[8,23],[3,6],[3,4],[8,8],[2,3],[2,4],[5,7],[9,12],[33,21],[7,4],[4,1],[5,1],[5,0],[9,-1],[4,0],[10,1],[5,-1],[14,-2],[5,0],[7,0],[52,18],[4,2],[4,2],[17,23],[11,13],[63,0],[48,8],[33,10],[50,22],[12,8],[4,13],[9,16],[32,41],[2,3],[35,48],[4,4],[19,13],[5,4],[29,36],[5,23],[-16,12],[-38,37],[-10,25],[-19,71],[-11,24],[-59,80],[-15,31]],[[2493,8907],[31,1],[73,1],[74,1],[74,1],[73,1],[74,1],[73,1],[74,2],[74,1],[73,1],[74,1],[73,1],[74,1],[74,1],[73,1],[22,1],[52,0],[74,2],[47,0],[21,-4],[14,-7],[12,-9],[18,-9],[13,-2],[12,2],[26,7],[16,2],[15,0],[14,-4],[30,-11],[6,-3],[30,-13],[-2,-6],[-11,-12],[0,-5],[8,-9],[4,-8],[1,-6],[3,-46],[3,-9],[4,1],[8,3],[7,1],[3,-7],[-17,-18],[16,-2],[10,-6],[14,-17],[9,-5],[11,-3],[9,-5],[3,-9],[14,-15],[8,-11],[-2,-10],[-6,-9],[-2,-12],[0,-54],[2,-6],[2,-7],[2,-7],[-1,-7],[-5,-3],[-7,0],[-7,-3],[-3,-7],[-1,-28],[2,-3],[4,-7],[6,-3],[5,1],[4,-1],[2,-9],[-5,-10],[-7,-10],[0,-7],[17,-1],[-5,-11],[1,-8],[5,-7],[8,-7],[7,-8],[0,-7],[-10,-15],[-3,-13],[2,-12],[12,-24],[4,-13],[2,-27],[4,-14],[6,-12],[44,-56],[3,-11],[2,-10],[3,-10],[10,-8],[8,-3],[20,-1],[9,-2],[20,-13],[9,-18],[6,-42],[-2,-3],[-2,-7],[0,-6],[7,-4],[9,-1],[5,-5],[3,-6],[5,-5],[6,-13],[-3,-12],[-5,-12],[-1,-16],[-26,6],[-2,-18],[17,-48],[-2,-39],[4,-7],[8,-4],[10,-10],[13,-16],[2,-12],[0,-11],[4,-9],[22,-6],[27,-17],[21,-9],[8,-8],[4,-11],[0,-8]],[[1150,7505],[-87,178],[-38,84],[-23,74],[-22,21],[-12,13],[-15,17],[4,25],[-5,19],[-13,146],[-8,23],[-2,12],[-1,3],[-2,3],[-1,3],[2,3],[5,6],[2,4],[2,7],[3,2],[0,3],[-4,6],[-23,-14],[-16,6],[-59,74],[-70,58],[-56,75],[-75,122],[-29,62],[-21,42],[-22,27],[-19,24],[-21,25],[-32,53],[-3,25],[12,13],[18,4],[17,9],[-5,-11],[-2,-21],[18,2],[28,7],[41,1],[52,10],[25,15],[17,5],[25,4],[42,20],[11,4],[19,0],[17,-6],[21,-5],[21,-4],[23,6],[37,7],[36,12],[17,11],[36,14],[15,19],[16,18],[6,13],[10,9],[21,4],[15,2],[13,5],[14,-1],[30,-3],[9,1],[14,5],[33,16],[11,4],[1,0],[68,-5],[34,-8],[25,-12],[9,6],[16,16],[6,3],[26,-1],[65,-1],[23,-6],[10,0],[15,6],[8,1],[63,-6],[134,10],[110,8],[31,-9],[20,-10],[12,-4],[96,7],[18,-2],[48,-15],[16,-2],[84,-2],[73,-1],[37,6],[51,-12],[25,-2],[102,17],[45,0]],[[898,9993],[15,-8],[11,-2],[13,2],[9,4],[10,1],[13,-6],[11,-15],[15,-35],[16,-16],[32,-24],[53,-57],[37,-17],[-7,-21],[-29,-9],[-158,-34],[-24,-13],[-14,-13],[-9,-16],[-5,-16],[-2,-17],[-7,-9],[-37,-19],[-12,-9],[-7,-16],[-2,-11],[-5,-9],[-20,-6],[-31,-2],[-7,-5],[-3,-15],[-13,-28],[-30,-17],[-68,-21],[-7,-1],[-6,1],[-5,-2],[-4,-7],[0,-6],[1,-8],[4,-7],[4,-4],[50,-16],[10,-6],[5,-25],[-2,-56],[-3,-62],[-4,-88],[-4,-91],[-2,-48],[-3,-68],[-59,1],[-73,1],[-69,-9],[-39,-20],[-1,0],[-39,60],[-11,47],[18,46],[10,9],[9,1],[9,1],[11,4],[8,8],[3,9],[0,23],[-2,9],[-12,27],[-15,25],[-20,49],[1,20],[-32,51],[-7,35],[-44,48],[-38,54],[1,8],[9,-2],[16,-3],[10,-3],[6,-4],[5,-18],[16,-3],[13,8],[8,12],[1,10],[8,3],[-1,15],[-3,6],[-8,3],[-8,0],[-6,-8],[-2,-10],[0,-16],[-4,-4],[-6,2],[-4,15],[-5,8],[-6,2],[-5,-7],[-7,0],[-10,4],[-12,-1],[-16,2],[6,8],[91,71],[22,31],[24,75],[4,3],[9,0],[8,-4],[7,-8],[11,-18],[7,6],[11,4],[13,3],[27,2],[12,4],[8,9],[34,61],[3,15],[-1,32],[8,10],[22,-3],[12,1],[55,17],[89,15],[13,4],[9,8],[18,30],[11,12],[13,9],[15,8],[10,12],[7,17],[9,17],[19,10],[11,-4],[6,-2]],[[6067,4820],[-18,-3],[-13,-9],[-11,-10],[-30,-35],[-8,-16],[-5,-17],[-6,-36],[-9,-23],[-15,-14],[-16,-8],[-26,-2],[-13,-3],[-9,-8],[-1,-14],[3,-15],[-7,-20],[-15,-11],[-21,-11],[-10,-14],[-19,-34],[-18,-22],[-8,-20],[0,-19],[15,-29],[3,-7],[-1,-9],[-5,-17],[-11,-16],[-33,-35],[-6,-4],[-22,-11],[-26,-24],[-13,-14],[-2,-9],[0,-8],[5,-8],[3,-10],[-5,-14],[-13,-12],[-43,-22],[-27,-20],[-23,-14],[-43,-17],[-19,-11],[-69,-61],[-13,-26],[3,-20],[-6,-13],[-10,-16],[-13,-17],[-51,-50],[-10,-19],[-1,-15],[-7,-22],[-14,-14],[-78,-58],[-20,-10],[-4,-15],[3,-16],[14,-37],[-4,-21],[-28,-33],[-13,-21],[-13,-11],[-21,-12],[-15,-13],[-1,-14],[-14,-33],[4,-17],[19,-42],[6,-31],[-5,-20],[-14,-12],[-36,-13],[-11,-5],[-15,-10],[-14,-13],[-10,-16],[3,-17],[7,-17],[4,-18],[-12,-31],[-3,-12],[3,-12],[3,-23]],[[5070,3269],[-9,-28],[-13,-27],[-26,-20],[-69,-14],[-9,-15],[1,-16],[6,-18],[1,-67],[-2,-7],[-3,-7],[-18,-21],[-6,-6],[-6,-4],[-4,-1],[-6,-4],[-7,-4],[-12,-12],[-12,-8],[-9,-2],[-4,-2],[-4,-2],[-35,-22],[-5,-2],[-4,-1],[-5,-1],[-19,3],[-5,-1],[-4,0],[-33,-13],[-4,0],[-4,-1],[-21,3],[-5,0],[-7,-1],[-8,-2],[-13,-6],[-6,-3],[-4,-4],[-25,-33],[-26,-26],[-5,-4],[-33,-20],[-4,-4],[-2,-3],[-2,-3],[-1,-9],[2,-27],[-1,-6],[0,-4],[-3,-8],[-3,-7],[-24,-29],[-1,-4],[0,-2],[0,-3],[2,-3],[6,-10],[-13,-1],[-14,2],[-20,5],[-22,9],[-48,30],[-27,10],[-43,23],[-35,28],[-8,16],[-10,35],[-6,16],[-26,36],[-12,13],[-10,6],[-18,6],[-18,1],[-23,-8],[-7,-4],[-15,-7],[-18,-6],[-18,2],[-16,7],[-27,16],[-17,6],[-21,3],[-27,-6],[-26,-10],[-36,-4],[-75,3],[-8,-1],[-17,-6]],[[3876,2948],[3,120],[-1,3],[-3,8],[0,5],[0,5],[1,6],[4,8],[7,12],[2,5],[1,7],[1,13],[5,20],[3,6],[3,12],[1,4],[10,17],[1,4],[10,82],[0,8],[-9,63],[-3,16],[0,14],[7,41]],[[3919,3427],[10,61],[-1,40],[-4,21],[2,9],[2,7],[1,4],[-1,7],[-15,65],[-7,95],[-1,20],[0,15],[-4,21],[-2,36],[3,37],[0,3],[-2,2],[-35,12],[-39,17],[-18,12],[-16,15],[-13,23],[-28,32],[-10,16],[-2,19],[4,11],[13,11],[26,15],[5,4],[7,10],[5,15],[3,20],[1,21],[-3,20],[-12,24],[-8,22],[-11,13],[-2,8],[0,8],[2,8],[1,4],[2,4],[5,4],[8,7],[23,13],[15,7],[46,34],[12,12],[23,32],[2,17],[7,21],[10,13],[25,33],[11,13],[2,4],[4,20],[-2,9],[-4,16],[-4,6],[-7,6],[-13,11],[-7,8],[-41,30],[-5,6],[-1,4],[0,10],[-4,21],[-3,7],[-2,3],[-8,6],[-42,26],[-10,9],[-5,7],[-3,5],[-7,7],[-18,12],[-14,16],[-11,10],[-4,4],[-2,4],[-6,36],[0,5],[-1,5],[-1,6],[-4,7],[-6,20],[-8,4],[-16,7],[-40,3],[-30,8],[-97,17],[-46,-15],[-12,-6],[-34,-3],[-30,-4],[-25,2],[-36,6],[-65,24]],[[2704,4270],[-3,-91],[2,-15],[25,-71],[0,-17],[15,-33],[-15,-19],[-34,-4],[-28,-6],[-19,-7],[-19,-11],[-16,-11],[-14,-18],[-39,-21],[-16,-12],[-12,-15],[3,-34],[-1,-19],[3,-20],[21,-53],[9,-36],[26,-44],[18,-23],[4,-10],[11,-46],[4,-38],[-6,-14],[-3,-13],[-3,-17],[5,-18],[9,-18],[26,-37],[19,-17],[42,-26],[26,-26],[33,-17]],[[2777,3393],[-18,-53],[-89,-36],[-17,1],[-36,4],[-40,-24],[-32,-31],[-19,-14],[-19,-10],[-78,-24],[-33,0],[-65,24],[-31,12],[-11,2],[-24,-6],[-2,-19],[-3,-12],[-13,-15],[-56,-99],[-25,-32],[-42,-13],[-177,19],[-28,-1],[-20,3],[-40,14],[-13,1],[-20,-2],[-60,-13],[-39,0],[-25,3],[-22,5],[-19,8],[-25,7],[-21,2],[-86,-26]],[[1529,3068],[-25,-2],[-12,2],[-30,10],[-25,4],[-39,-4],[-16,8],[-10,13],[-22,34],[-29,34],[-11,18],[-4,16],[2,17],[9,33],[-1,13],[-11,12],[-150,30],[-21,-3],[-12,-10],[-12,-12],[-15,-7],[-87,-31],[-22,-4],[-19,5],[-35,22],[-57,7],[-40,11],[-73,13],[-23,-3],[-16,-6],[-26,-15]],[[697,3273],[1,1],[-9,10],[-1,5],[2,3],[2,3],[0,23],[-2,12],[-8,23],[-2,11],[3,12],[5,11],[9,9],[11,3],[17,2],[6,4],[4,8],[12,11],[13,6],[10,2],[9,5],[6,13],[1,6],[-2,6],[-3,5],[-1,5],[2,5],[7,7],[2,6],[5,11],[24,11],[5,8],[2,8],[5,1],[5,-3],[4,-1],[15,9],[1,1],[15,6],[9,6],[53,61],[23,15],[8,8],[14,19],[50,51],[11,20],[0,19],[-7,20],[-12,21],[-6,23],[10,19],[37,34],[19,10],[53,45],[21,10],[7,5],[14,22],[5,6],[23,18],[14,7],[15,2],[1,-3],[18,-3],[9,-4],[26,22],[10,3],[14,-2],[14,-9],[14,-4],[28,5],[24,16],[36,34],[18,13],[7,9],[3,11],[2,30],[3,14],[6,14],[16,21],[50,44],[6,0],[0,-5],[-9,-3],[-5,-4],[-1,-6],[4,-7],[13,11],[16,23],[26,26],[8,11],[19,58],[24,44],[10,23],[8,51],[6,12],[11,11],[10,12],[8,14],[6,16],[13,73],[8,22],[2,15],[-2,16]],[[8322,1368],[22,-24],[28,-40],[-20,0],[-7,0],[9,-10],[2,-9],[2,-10],[3,-10],[4,-5],[10,-7],[2,-3],[2,-8],[0,-16],[2,-4],[26,-6],[14,-5],[-2,-9],[-7,-10],[-7,-12],[-4,-14],[-1,-12],[4,-10],[14,-20],[4,-10],[-1,-10],[-2,-8],[4,-6],[15,-1],[9,-5],[3,-11],[3,-12],[5,-10],[69,-50],[11,-3],[6,1],[13,4],[7,1],[3,3],[3,1],[4,-2],[6,-6],[3,-1],[22,-4],[8,-7],[5,-9],[13,-15],[5,-9],[4,-5],[5,-2],[13,-2],[7,-4],[7,-6],[58,-81],[9,-21],[7,-9],[11,-6],[26,-7],[10,-10],[2,-6],[0,-12],[3,-7],[5,-3],[10,0],[48,-17],[12,-7],[36,-35],[16,-19],[11,-19],[9,-34],[8,-11],[10,-8],[26,-12],[32,-25],[21,-13],[49,-18],[39,-9],[11,-6],[34,-32],[5,-8],[6,-20],[15,-22],[20,-20],[19,-13],[36,-13],[8,-7],[3,-12],[-2,-12],[1,-10],[9,-9],[14,-4],[14,2],[14,3],[14,1],[26,-1],[12,-3],[12,-5],[16,-11],[15,-16],[19,-14],[-6,-10],[1,-9],[4,-10],[-67,-11],[-165,-29],[-165,-28],[-164,-28],[-165,-29],[-203,-34],[-202,-33],[-203,-34],[-202,-34],[-58,-10],[-15,-4],[-5,2],[-13,15],[-24,10],[-46,14],[-37,18],[-13,3],[-33,-2],[-11,2],[-15,-2],[-14,-6],[-13,-3],[-13,5],[-75,-17],[-11,-3],[-63,-15],[-12,-19],[-26,-5],[-24,-7],[-21,-2],[-17,14],[-25,11],[-13,3],[-6,-7],[-6,-3],[-13,2],[-14,5],[-6,6],[-13,7],[-29,2],[-32,-1],[-20,-5],[-10,4],[-24,15],[-27,12],[-8,6],[-16,15],[-18,14],[-20,8],[-21,-5],[-32,23],[-9,3],[-27,-4],[-11,-1],[-9,5],[-28,-20],[-19,7],[-21,1],[-20,-5],[-12,-9],[-6,6],[-11,-4],[-10,-2],[-23,0],[-47,-4],[-7,1],[-29,9],[-30,15],[-128,0],[-5,-3],[-9,-14],[-4,-4],[-13,1],[-18,5],[-17,7],[-8,5],[-7,14],[-16,3],[-19,-1],[-46,-9],[-138,-2],[-128,33],[-13,8],[-36,-3],[-24,5],[-9,0],[-18,-3],[-27,-10],[-69,-3],[-105,17],[-72,31],[-31,7],[-11,8],[-16,19],[-47,42],[-7,5],[-15,6],[-8,7],[-4,7],[-4,13],[-3,5],[-42,30],[-11,6],[-2,8],[-28,47],[-19,5],[-3,1],[-1,8],[-13,27],[-6,4],[-5,3],[-3,7],[-1,4],[-6,1],[-43,0],[-208,0],[-109,0],[-98,0],[-207,0],[-206,0],[-71,0]],[[4526,471],[3,124],[-38,159],[-7,74],[1,48],[6,48],[9,26],[35,70],[16,60],[51,55],[15,22],[9,20],[12,44],[-4,89],[-21,142],[-2,92],[-7,23],[-13,21],[-13,14],[-38,29],[-104,164],[-22,18],[-44,27],[-10,10],[-4,7],[-11,35],[-4,-2],[-7,-2],[-4,-1],[-6,6],[-7,16],[-6,4],[-18,-1],[-9,1],[-7,4],[-30,25],[-7,3],[-9,3],[0,5],[3,2],[4,5],[4,3],[-8,3],[-20,13],[-8,7],[-22,12],[-8,2],[0,5],[5,8],[-3,20],[-6,7],[-27,6],[-12,7],[-9,9],[-4,9],[2,9],[3,9],[0,6],[-8,3],[-10,1],[-9,4]],[[4098,2103],[-35,36],[-7,12],[-2,12],[3,5],[11,8],[3,5],[-1,2],[-2,2],[-2,2],[-4,13],[-6,7],[-5,6],[-3,3],[-4,8],[-18,20],[-5,10],[-2,17],[8,41],[-4,17],[-8,15],[-31,35],[-3,7],[3,6],[3,5],[9,18],[9,2],[-3,4],[-7,5],[-8,4],[-7,2],[-26,3],[4,4],[7,11],[-21,4],[-20,10],[-16,15],[-5,9],[-3,6],[0,2],[0,61],[1,11],[2,7],[-1,12],[-2,17],[0,9],[0,7],[1,4],[1,7],[-1,10],[-5,19],[-13,23],[-4,9],[-12,67],[0,4],[1,4],[3,3],[3,2],[4,1],[2,2],[2,2],[1,3],[5,42],[6,18],[1,8],[-2,8],[-11,31],[-3,10],[0,8],[5,7],[1,5],[0,9],[-1,5],[-8,17]],[[5070,3269],[25,-8],[187,-92],[26,-6],[22,0],[18,3],[28,-5],[104,-43],[31,-10],[26,-4],[19,-7],[51,-37],[7,-3],[8,-1],[6,-3],[9,-8],[8,-15],[4,-3],[26,-15],[9,-7],[11,-13],[4,-6],[1,-2],[1,-2],[0,-9],[1,-4],[2,-4],[8,-7],[2,-3],[5,-12],[2,-4],[4,-3],[6,-5],[6,-7],[6,-11],[1,-4],[0,-3],[-2,-4],[-4,-7],[-1,-3],[0,-5],[1,-3],[5,-7],[4,-11],[4,-7],[1,-3],[-1,-8],[1,-4],[1,-4],[5,-6],[1,-3],[-1,-4],[-2,-3],[-2,-4],[-1,-4],[1,-4],[2,-7],[1,-12],[2,-4],[4,-6],[3,-4],[3,-7],[1,-4],[3,-7],[12,-14],[6,-17],[1,-3],[7,-6],[5,-3],[3,-4],[2,-3],[1,-4],[0,-4],[1,-4],[3,-4],[10,-10],[2,-5],[2,-3],[4,-3],[10,-3],[11,-6],[9,-3],[10,1],[57,18],[27,2],[32,-2],[55,-11],[16,6],[5,12],[-9,32],[0,16],[5,14],[14,10],[20,10],[23,1],[26,-6],[36,-14],[70,-13],[66,8],[26,-3],[13,-14],[8,-10],[6,-9],[6,-8],[21,-14],[8,-7],[6,-8],[6,-15],[6,-20],[4,-8],[7,-9],[12,-10],[13,-18],[2,-4],[6,-22],[5,-8],[8,-6],[23,-14],[7,-7],[6,-10],[7,-8],[11,-7],[9,-8],[10,-11],[28,-27],[46,-32],[7,-10],[7,-7],[14,-6],[8,-11],[19,-5],[28,-17],[21,-27],[8,-7],[24,-16],[7,-6],[5,-5],[11,-14],[4,-4],[4,-3],[63,-30],[40,-12],[17,-7],[11,-6],[5,-2],[5,-1],[7,0],[28,3],[29,-1],[34,-5],[5,-1],[9,0],[14,-4],[12,3],[11,4],[13,2],[58,0],[7,-1],[5,-2],[4,1],[12,9],[17,6],[7,2],[8,0],[15,-4],[8,-1],[6,2],[11,7],[7,1],[13,-3],[38,-20],[29,-8],[17,-3],[14,-1],[12,4],[7,8],[8,4],[18,-6],[24,-18],[14,-2],[16,10],[8,-11],[9,-9],[3,-10],[3,-4],[3,-1],[4,1],[4,-1],[67,-64],[17,-24],[21,-20],[5,-12],[13,5],[7,1],[6,-4],[8,-8],[1,-6],[5,-13],[10,-8],[14,5],[21,3],[19,-18],[24,-43],[1,-5],[-3,-4],[-1,-5],[3,-6],[22,-15],[25,-10],[10,-8],[3,-15],[5,3],[12,1],[14,-2],[11,-10],[16,-33],[3,-12],[6,-45],[12,-15],[27,-5],[8,-5],[15,-23],[16,-20],[4,-10],[6,-23],[7,-12],[17,-16],[10,-11],[5,-12],[8,-26],[6,-13],[21,-18],[23,-3],[25,2],[22,-6],[8,-11],[0,-10],[3,-7],[20,-2],[6,-6],[15,-30],[5,-15],[3,-4],[16,-15],[2,-3],[20,-47],[8,-11],[10,-7],[45,-15],[24,-14],[23,-17],[13,-14]],[[4526,471],[-137,0],[-207,0],[-207,0],[-207,0],[-206,0],[-208,0],[-207,0],[-8,0],[-198,0],[-207,0],[-208,0],[-207,0],[-207,1],[-55,0],[-9,0],[-1,-4],[-7,-15],[-18,-2],[-36,5],[-6,-2],[-12,-6],[-9,-2],[-10,0],[-13,3],[-17,2],[-15,4],[-9,1],[-7,-2],[-13,-7],[-10,-1],[-19,3],[-12,8],[-37,43],[-10,8],[-76,37],[-77,38],[-71,50],[-69,34],[8,21],[-7,12],[-12,10],[-10,28],[-12,11],[-17,6],[-19,2],[-15,4],[-28,17],[-15,4],[-14,-3]],[[1353,779],[-11,36],[-22,35],[-87,78],[-35,38],[-8,19],[2,19],[10,15],[16,13],[18,9],[18,14],[13,18],[6,24],[-3,16],[-4,8],[-6,5],[-8,6],[-16,15],[13,16],[6,9],[2,3],[4,2],[5,2],[9,2],[8,2],[7,3],[16,17],[5,3],[9,3],[5,0],[6,2],[5,2],[10,16],[3,-2],[2,-2],[3,-3],[3,0],[4,2],[26,14],[22,16],[53,53]],[[1462,1307],[51,-40],[19,-19],[39,-28],[18,1],[49,17],[31,14],[23,15],[17,16],[64,71],[22,21],[23,6],[19,-5],[16,-12],[14,-12],[12,-7],[11,-2],[15,4],[17,12],[27,30],[13,12],[13,6],[38,7],[72,23],[84,41],[16,10],[95,90],[10,8],[16,8],[36,-2],[18,-3],[38,1],[19,2],[38,-3],[110,-24],[90,-26],[35,-21],[11,-11],[9,-17],[9,-32],[71,-11],[17,4],[16,10],[22,33],[42,45],[67,120],[38,42],[66,102],[65,64],[58,30],[23,7],[57,25],[23,5],[67,5],[10,0],[27,-8],[19,-4],[138,-1],[32,6],[26,3],[63,-1],[17,9],[97,98],[19,23],[39,21],[74,23],[28,4],[25,-1],[39,-7],[94,-1]],[[3919,3427],[-53,-7],[-25,4],[-31,6],[-70,3],[-25,6],[-25,-1],[-21,-8],[-17,-11],[-36,-43],[-12,-9],[-31,-5],[-19,1],[-19,6],[-32,24],[-11,5],[-16,0],[-14,-3],[-36,-27],[-137,-131],[-66,-33],[-27,-30],[-14,-13],[-64,-33],[-11,2],[-9,5],[-3,15],[0,36],[-2,15],[-6,15],[-15,5],[-17,2],[-37,1],[-16,8],[-10,16],[-12,89],[-6,17],[-11,21],[-23,27],[-22,2],[-105,-19],[-36,8]],[[1462,1307],[15,9],[3,2],[5,5],[14,30],[-4,24],[-20,44],[-3,16],[1,17],[6,21],[7,18],[56,90],[7,19],[1,19],[-32,63],[-4,149],[-28,39],[-27,11],[-17,12],[-15,13],[-9,18],[-5,44],[-4,14],[-13,11],[-18,-6],[-18,-11],[-17,0],[-14,11],[-4,16],[-8,17],[-16,6],[-37,3],[-12,10],[0,13],[12,12],[30,16],[7,10],[0,13],[-32,47],[0,15],[5,11],[19,27],[2,12],[-6,53],[9,20],[15,15],[18,8],[15,4],[17,11],[149,92],[23,21],[15,19],[16,34],[5,17],[2,17],[10,40],[40,66],[-12,118],[-14,14],[-16,7],[-16,19],[-3,14],[5,25],[-21,64],[10,41],[13,21],[4,10],[5,20],[-5,16],[-12,15],[-13,13],[-8,12],[-11,25]],[[8584,5438],[0,-15],[2,-26],[13,-19],[-4,-4],[-2,-2],[3,-29],[-3,-14],[-8,-6],[-15,-2],[-20,-5],[-34,-13],[-14,-9],[-19,-15],[-14,-16],[0,-12],[8,-12],[17,-51],[0,-28],[2,-4],[12,-7],[3,-4],[2,-13],[14,-21],[5,-14],[10,-65],[-3,-31],[-12,-30],[21,1],[15,9],[35,34],[12,7],[81,25],[23,18],[26,58],[29,4],[62,-22],[30,-11],[30,-8],[32,-3],[29,5],[17,9],[18,11],[18,8],[19,-1],[16,-7],[31,-18],[16,-7],[31,-4],[36,0],[81,13],[66,10],[89,44],[54,27],[34,8],[32,2],[32,-2],[50,-13],[68,-17],[27,-2],[32,3],[30,-4],[34,-9],[32,-5],[27,8],[6,7],[6,17],[5,7],[7,6],[18,9],[7,6],[7,15],[3,18],[7,14],[15,7],[5,-36],[6,-12],[15,-22],[3,-11],[-5,-14],[-3,-13],[1,-41],[-4,-28],[5,-10],[16,-2],[-4,-105],[5,-18],[36,-71],[0,-9],[-8,-10],[-25,-17],[-9,-11],[-2,-9],[0,-9],[2,-17],[0,-12],[-3,-9],[-23,-31],[-14,-29],[-4,-14],[0,-19],[6,-14],[8,-14],[7,-18],[4,-55],[3,-18],[-1,-7],[-17,-36],[-5,-94],[-6,-103],[5,-33],[17,-23],[21,-19],[8,-18],[3,-45],[8,-33],[-2,-12],[-7,-13],[-27,-35],[-37,-48],[-9,-21],[-15,-51],[-15,-55],[-16,-33],[-5,-29],[7,-23],[17,-21],[44,-40],[17,-21],[14,-23],[10,-27],[-26,0],[-101,0],[-100,0],[-100,0],[-100,0],[-101,0],[-100,0],[-100,0],[-101,0],[-100,0],[-100,0],[-100,0],[-101,0],[-100,0],[-100,0],[-100,0],[-101,0],[0,-110],[0,-111],[0,-110],[1,-111],[0,-66],[0,-44],[0,-111],[0,-110],[0,-110],[0,-111],[0,-110],[0,-111],[0,-110],[0,-111],[0,-110],[0,-111],[1,-110],[0,-29],[0,-16],[0,-22],[0,-32],[-1,-75],[0,-75],[0,-75],[0,-75],[0,-33],[1,-2],[0,-46],[0,-45],[0,-12],[1,-15]],[[55,981],[1,-9],[-19,15],[-11,21],[-26,73],[2,20],[8,9],[16,12],[15,-4],[1,-36],[3,-16],[0,-30],[1,-28],[9,-27]],[[1353,779],[-20,-5],[-5,1],[-6,3],[-12,-3],[-21,-8],[0,5],[-8,-2],[-9,0],[-19,2],[-8,4],[-6,7],[-5,4],[-11,-5],[-15,10],[-18,-1],[-18,-5],[-87,-14],[-42,-21],[-25,-5],[-16,-7],[-19,-5],[-4,-7],[-2,-8],[-3,-7],[-7,-4],[-14,-4],[-7,-2],[-7,-6],[-7,-11],[-5,-6],[-27,-7],[-36,-15],[-29,-21],[-15,-7],[-20,-3],[-20,-6],[-36,-27],[-20,-9],[-10,-1],[-28,6],[-48,4],[-15,4],[-19,10],[-8,-1],[-11,-7],[-12,-4],[-52,1],[-58,-5],[-3,3],[-2,7],[-4,7],[-8,3],[-8,2],[-9,4],[-8,5],[-5,4],[-3,6],[-1,6],[-2,5],[-5,4],[-8,2],[-4,-2],[-4,-4],[-9,-1],[-28,7],[-8,5],[-6,0],[-5,-2],[-6,-1],[-37,-4],[-37,-10],[-33,-13],[-38,-25],[-33,-14],[-15,-9],[-5,-6],[-1,-5],[-5,-3],[-11,-1],[-9,2],[-14,6],[-11,2],[0,5],[-7,5],[-4,7],[-1,9],[0,10],[6,28],[1,97],[10,63],[6,57],[-9,52],[0,22],[14,3],[4,-31],[10,-13],[14,31],[-2,57],[4,18],[-7,70],[6,77],[-34,278],[0,14],[4,12],[18,33],[-18,34],[-39,53],[-1,32],[13,42],[10,7],[17,9],[16,6],[8,-4],[3,-13],[9,-4],[12,3],[41,35],[7,11],[2,10],[1,20],[2,10],[17,18],[49,26],[11,17],[3,21],[16,55],[9,20],[-8,19],[3,22],[10,41],[8,86],[5,11],[7,10],[27,24],[7,1],[12,-6],[6,0],[8,8],[4,12],[-1,13],[-5,10],[-12,5],[-9,-2],[-3,1],[2,15],[7,24],[22,44],[4,25],[3,10],[8,8],[9,8],[8,7],[4,10],[7,40],[1,10],[1,5],[6,7],[6,0],[5,-1],[6,2],[7,9],[7,21],[16,23],[-1,13],[-3,13],[-1,14],[2,9],[6,17],[13,54],[5,58],[4,10],[13,19],[9,25],[9,49],[2,47],[-2,24],[-9,25],[-6,12],[-1,5],[-1,8],[-1,4],[-4,6],[-1,5],[1,5],[3,0],[4,-2],[7,3],[10,2],[3,2],[4,5],[1,7],[1,7],[-1,6],[-6,10],[-10,10],[-5,11],[13,18],[4,16],[16,17],[4,11],[2,11],[5,11],[13,19],[3,7],[1,26],[2,11],[7,9],[19,6],[5,3],[4,3],[6,-1],[11,-8],[6,-2],[6,0],[13,16],[5,26],[6,77],[-3,72],[3,9],[12,19],[2,9]]],"transform":{"scale":[0.0012393559527952751,0.0013641565165516492],"translate":[11.669394143000147,-18.03140472399987]}};
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
