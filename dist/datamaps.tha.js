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
    zoomScale: [1, 2],
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

    // define the user ratio if required
    if (options.width && options.height && options.width > 0 && options.height > 0) {
      this.options.aspectRatio = height / width;
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
      .extent([[0, 0], [this.svg.attr('data-width'), this.svg.attr('data-height')]])
      .translateExtent([[0, 0], [this.svg.attr('data-width'), this.svg.attr('data-height')]])

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

    if (options.responsive) {
      var svg = d3.select(options.element).select('svg'),
          newWidth = options.element.clientWidth,
          srcWidth = svg.attr('data-width'),
          srcHeight = svg.attr('data-height'),
          newScale = (newWidth / srcWidth);

      svg
        .attr('width', newWidth)
        .attr('height', (srcHeight * newScale));
      
      // redefine limits
      this.zoom
        .extent([[0, 0], [newWidth, srcHeight * newScale]])
        .scaleExtent([newScale, options.zoomScale[1] + newScale - options.zoomScale[0]]);
      
      // resize
      svg.call(this.zoom.transform, d3.zoomIdentity.scale(newScale));
    }
  }
  
  Datamap.prototype.zoomed = function () {
    d3.select(this)
      .selectAll('g.datamaps-subunits').attr('transform', d3.event.transform);
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
  Datamap.prototype.thaTopo = {"type":"Topology","objects":{"THA":{"type":"GeometryCollection","geometries":[{"type":"MultiPolygon","properties":{"name":null},"id":"-99","arcs":[[[0]],[[1]],[[2]],[[3]],[[4]],[[5]],[[6]],[[7]],[[8]],[[9]],[[10]]]},{"type":"Polygon","properties":{"name":"Mae Hong Son"},"id":"TH.MH","arcs":[[11,12,13]]},{"type":"Polygon","properties":{"name":"Chumphon"},"id":"TH.CP","arcs":[[14,15,16,17,18]]},{"type":"Polygon","properties":{"name":"Nakhon Si Thammarat"},"id":"TH.NT","arcs":[[19,20,21,22,23,24]]},{"type":"Polygon","properties":{"name":"Phuket"},"id":"TH.PU","arcs":[[25]]},{"type":"MultiPolygon","properties":{"name":"Phangnga"},"id":"TH.PG","arcs":[[[26]],[[27]],[[28]],[[29]],[[30,31,32,33]],[[34]],[[35]]]},{"type":"MultiPolygon","properties":{"name":"Ranong"},"id":"TH.RN","arcs":[[[36]],[[37,-33,38,-17]]]},{"type":"MultiPolygon","properties":{"name":"Surat Thani"},"id":"TH.ST","arcs":[[[39]],[[40]],[[41]],[[-24,42,-34,-38,-16,43]],[[44]]]},{"type":"MultiPolygon","properties":{"name":"Krabi"},"id":"TH.KR","arcs":[[[45]],[[46]],[[-23,47,48,-31,-43]]]},{"type":"Polygon","properties":{"name":"Phatthalung"},"id":"TH.PL","arcs":[[49,50,51,52,-21]]},{"type":"MultiPolygon","properties":{"name":"Satun"},"id":"TH.SA","arcs":[[[53]],[[54]],[[55,56,57]]]},{"type":"MultiPolygon","properties":{"name":"Songkhla"},"id":"TH.SG","arcs":[[[58,59,60,-56,61,-52,62]],[[-50,-20,63]]]},{"type":"MultiPolygon","properties":{"name":"Trang"},"id":"TH.TG","arcs":[[[64]],[[-53,-62,-58,65,-48,-22]]]},{"type":"Polygon","properties":{"name":"Yala"},"id":"TH.YL","arcs":[[66,67,-60,68]]},{"type":"Polygon","properties":{"name":"Chiang Rai"},"id":"TH.CR","arcs":[[69,70,71,72]]},{"type":"Polygon","properties":{"name":"Chiang Mai"},"id":"TH.CM","arcs":[[73,74,75,-12,76,-72]]},{"type":"Polygon","properties":{"name":"Lampang"},"id":"TH.LG","arcs":[[77,78,79,80,81,-74,-71]]},{"type":"Polygon","properties":{"name":"Lamphun"},"id":"TH.LN","arcs":[[-82,82,-75]]},{"type":"Polygon","properties":{"name":"Nan"},"id":"TH.NA","arcs":[[83,84,85,86]]},{"type":"Polygon","properties":{"name":"Phayao"},"id":"TH.PY","arcs":[[-86,87,-78,-70,88]]},{"type":"Polygon","properties":{"name":"Phrae"},"id":"TH.PR","arcs":[[-85,89,90,-79,-88]]},{"type":"Polygon","properties":{"name":"Phitsanulok"},"id":"TH.PS","arcs":[[91,92,93,94,95,96,97]]},{"type":"Polygon","properties":{"name":"Sukhothai"},"id":"TH.SO","arcs":[[98,-97,99,100,-80,-91]]},{"type":"Polygon","properties":{"name":"Uttaradit"},"id":"TH.UD","arcs":[[-98,-99,-90,-84,101]]},{"type":"Polygon","properties":{"name":"Kanchanaburi"},"id":"TH.KN","arcs":[[102,103,104,105,106,107]]},{"type":"Polygon","properties":{"name":"Kamphaeng Phet"},"id":"TH.KP","arcs":[[-96,108,109,110,-100]]},{"type":"Polygon","properties":{"name":"Phichit"},"id":"TH.PC","arcs":[[111,112,-109,-95]]},{"type":"Polygon","properties":{"name":"Phetchabun"},"id":"TH.PH","arcs":[[113,114,115,116,-112,-94,117]]},{"type":"Polygon","properties":{"name":"Suphan Buri"},"id":"TH.SH","arcs":[[118,119,120,121,122,-104,123]]},{"type":"Polygon","properties":{"name":"Tak"},"id":"TH.TK","arcs":[[-81,-101,-111,124,125,-108,126,-13,-76,-83]]},{"type":"Polygon","properties":{"name":"Uthai Thani"},"id":"TH.UT","arcs":[[127,-124,-103,-126,128]]},{"type":"Polygon","properties":{"name":"Ang Thong"},"id":"TH.AT","arcs":[[129,130,-121,131]]},{"type":"Polygon","properties":{"name":"Chai Nat"},"id":"TH.CN","arcs":[[132,-119,-128,133]]},{"type":"Polygon","properties":{"name":"Lop Buri"},"id":"TH.LB","arcs":[[134,135,136,-130,137,138,-116]]},{"type":"Polygon","properties":{"name":"Nakhon Nayok"},"id":"TH.NN","arcs":[[139,140,141,142,143]]},{"type":"Polygon","properties":{"name":"Prachin Buri"},"id":"TH.PB","arcs":[[144,145,-140,146]]},{"type":"Polygon","properties":{"name":"Nakhon Sawan"},"id":"TH.NS","arcs":[[-117,-139,147,-134,-129,-125,-110,-113]]},{"type":"Polygon","properties":{"name":"Phra Nakhon Si Ayutthaya"},"id":"TH.PA","arcs":[[148,149,150,151,-122,-131,-137]]},{"type":"Polygon","properties":{"name":"Pathum Thani"},"id":"TH.PT","arcs":[[-142,152,153,154,-150,155]]},{"type":"Polygon","properties":{"name":"Sing Buri"},"id":"TH.SB","arcs":[[-138,-132,-120,-133,-148]]},{"type":"Polygon","properties":{"name":"Saraburi"},"id":"TH.SR","arcs":[[156,-143,-156,-149,-136]]},{"type":"Polygon","properties":{"name":"Bangkok Metropolis"},"id":"TH.BM","arcs":[[157,158,159,160,161,-154,162]]},{"type":"Polygon","properties":{"name":"Nonthaburi"},"id":"TH.NO","arcs":[[-155,-162,163,-151]]},{"type":"Polygon","properties":{"name":"Nakhon Pathom"},"id":"TH.NP","arcs":[[-164,-161,164,165,-105,-123,-152]]},{"type":"Polygon","properties":{"name":"Phetchaburi"},"id":"TH.PE","arcs":[[166,167,168,169,170]]},{"type":"Polygon","properties":{"name":"Prachuap Khiri Khan"},"id":"TH.PK","arcs":[[-19,171,-169,172]]},{"type":"Polygon","properties":{"name":"Ratchaburi"},"id":"TH.RT","arcs":[[173,174,-171,175,-106,-166]]},{"type":"Polygon","properties":{"name":"Samut Prakan"},"id":"TH.SP","arcs":[[176,177,-158]]},{"type":"Polygon","properties":{"name":"Samut Sakhon"},"id":"TH.SS","arcs":[[178,179,-174,-165,-160]]},{"type":"Polygon","properties":{"name":"Samut Songkhram"},"id":"TH.SM","arcs":[[-180,180,-167,-175]]},{"type":"Polygon","properties":{"name":"Si Sa Ket"},"id":"TH.SI","arcs":[[181,182,183,184,185]]},{"type":"Polygon","properties":{"name":"Ubon Ratchathani"},"id":"TH.UR","arcs":[[-182,186,187,188]]},{"type":"Polygon","properties":{"name":"Amnat Charoen"},"id":"TH.AC","arcs":[[-188,189,190,191]]},{"type":"Polygon","properties":{"name":"Yasothon"},"id":"TH.YS","arcs":[[-190,-187,-186,192,193]]},{"type":"Polygon","properties":{"name":"Chon Buri"},"id":"TH.CB","arcs":[[194,195,196,197]]},{"type":"Polygon","properties":{"name":"Chachoengsao"},"id":"TH.CC","arcs":[[-146,198,199,-198,200,-177,-163,-153,-141]]},{"type":"Polygon","properties":{"name":"Chanthaburi"},"id":"TH.CT","arcs":[[201,202,203,204,-195,-200,205]]},{"type":"Polygon","properties":{"name":"Sa Kaeo"},"id":"TH.SK","arcs":[[206,207,-206,-199,-145,208]]},{"type":"Polygon","properties":{"name":"Rayong"},"id":"TH.RY","arcs":[[-205,209,-196]]},{"type":"MultiPolygon","properties":{"name":"Trat"},"id":"TH.TT","arcs":[[[210]],[[211]],[[-203,212]]]},{"type":"Polygon","properties":{"name":"Buri Ram"},"id":"TH.BR","arcs":[[213,214,-207,215,216,217]]},{"type":"Polygon","properties":{"name":"Chaiyaphum"},"id":"TH.CY","arcs":[[218,219,-115]]},{"type":"Polygon","properties":{"name":"Khon Kaen"},"id":"TH.KK","arcs":[[220,221,-217,222,-219,-114,223,224,225]]},{"type":"Polygon","properties":{"name":"Kalasin"},"id":"TH.KL","arcs":[[226,227,228,229,-221,230]]},{"type":"Polygon","properties":{"name":"Maha Sarakham"},"id":"TH.MS","arcs":[[231,232,-218,-222,-230]]},{"type":"Polygon","properties":{"name":"Nakhon Ratchasima"},"id":"TH.NR","arcs":[[-223,-216,-209,-147,-144,-157,-135,-220]]},{"type":"Polygon","properties":{"name":"Roi Et"},"id":"TH.RE","arcs":[[-193,-185,233,-232,-229,234]]},{"type":"Polygon","properties":{"name":"Surin"},"id":"TH.SU","arcs":[[-234,-184,235,-214,-233]]},{"type":"Polygon","properties":{"name":"Loei"},"id":"TH.LE","arcs":[[236,237,238,-224,-118,-93,239]]},{"type":"Polygon","properties":{"name":"Nong Khai"},"id":"TH.NK","arcs":[[240,241,-237,242,243]]},{"type":"Polygon","properties":{"name":"Sakon Nakhon"},"id":"TH.SN","arcs":[[244,245,-227,246,-241,247]]},{"type":"Polygon","properties":{"name":"Udon Thani"},"id":"TH.UN","arcs":[[-247,-231,-226,248,-238,-242]]},{"type":"Polygon","properties":{"name":"Nong Bua Lam Phu"},"id":"TH.NB","arcs":[[-225,-239,-249]]},{"type":"Polygon","properties":{"name":"Nakhon Phanom"},"id":"TH.NF","arcs":[[249,-245,250,251]]},{"type":"Polygon","properties":{"name":"Mukdahan"},"id":"TH.MD","arcs":[[252,-191,-194,-235,-228,-246,-250]]},{"type":"Polygon","properties":{"name":"Narathiwat"},"id":"TH.NW","arcs":[[253,-67,254]]},{"type":"Polygon","properties":{"name":"Pattani"},"id":"TH.PI","arcs":[[-255,-69,-59,255]]},{"type":"Polygon","properties":{"name":"Bueng Kan"},"id":"TH.BK","arcs":[[-251,-248,-244,256]]}]}},"arcs":[[[2358,594],[-14,-1],[-12,5],[-16,34],[7,5],[12,-1],[30,-4],[0,-2],[2,-2],[7,-3],[4,-3],[0,-10],[-3,-8],[-8,-7],[-9,-3]],[[3031,729],[-18,-2],[-12,3],[3,11],[15,6],[6,-7],[6,-11]],[[2729,982],[-7,-4],[-27,6],[-17,2],[-8,7],[-9,6],[-3,6],[11,1],[11,-5],[10,-1],[12,-3],[2,-2],[5,0],[10,-6],[10,-7]],[[1220,1320],[-6,0],[2,13],[6,4],[3,1],[9,0],[4,2],[2,-6],[-5,-5],[-5,-3],[-10,-6]],[[1962,1489],[4,0],[9,1],[6,-2],[2,-2],[-1,-7],[-3,-3],[-6,-1],[-3,-3],[0,-4],[5,-5],[1,-7],[-6,-2],[-50,34],[-4,1],[-5,1],[0,3],[4,4],[5,3],[3,0],[5,2],[17,-2],[15,-6],[2,-5]],[[353,2033],[4,-18],[-18,16],[-5,10],[7,2],[9,4],[4,-2],[-1,-12]],[[1120,2393],[-14,-5],[-5,5],[1,14],[6,4],[42,37],[10,0],[5,-5],[-12,-13],[-14,-9],[-4,-6],[1,-4],[4,-3],[-4,-4],[-16,-11]],[[1338,2855],[7,-2],[8,1],[-10,-13],[4,-8],[0,-6],[-4,-4],[-6,2],[-5,-19],[-8,7],[-10,-1],[-6,4],[-3,8],[1,6],[2,3],[3,0],[5,2],[2,9],[-4,4],[-2,3],[6,5],[3,0],[5,6],[12,-7]],[[3008,3031],[-1,-2],[2,-2],[4,-3],[-2,-5],[5,-1],[3,-1],[-2,-4],[3,-3],[0,-2],[-4,-1],[-3,-2],[-2,-4],[-3,-3],[-5,-4],[-3,-2],[-8,-2],[-3,-3],[-2,7],[-5,-2],[-6,1],[-3,7],[7,4],[7,11],[-2,3],[-5,3],[-1,3],[2,9],[16,-2],[5,3],[6,-3]],[[6219,4182],[-2,-8],[-2,-3],[-5,1],[-18,-5],[3,-6],[-3,-6],[-3,2],[-1,3],[-9,4],[-8,5],[-9,2],[-17,-1],[-3,-2],[-3,1],[0,4],[5,4],[6,-1],[4,0],[17,5],[-3,6],[6,1],[13,-5],[23,-1],[9,0]],[[4160,4783],[1,-11],[3,-4],[-12,-5],[-6,-8],[-14,-4],[-2,4],[-4,6],[-13,13],[3,4],[5,-4],[5,6],[6,3],[10,0],[18,0]],[[1357,9500],[-2,-8],[4,-14],[4,-6],[10,-7],[10,-6],[2,-1],[2,-1],[12,-6],[10,-4],[29,-10],[3,-1],[3,-2],[2,-2],[2,-17],[2,-5],[6,-9],[1,-2],[3,-2],[9,-4],[3,-2],[2,-2],[1,-2],[1,-14],[1,-2],[2,-2],[3,-2],[8,-2],[6,-2],[9,-5],[4,-4],[4,-5],[1,-2],[0,-4],[-1,-4],[-6,-11],[-2,-8],[-1,-13],[1,-6],[0,-4],[-2,-3],[-5,-4],[-2,-4],[-1,-3],[3,-7],[3,-4],[3,-2],[3,-2],[2,-2],[2,-3],[0,-4],[0,-6],[2,-7],[3,-5],[1,-5],[0,-13],[1,-6],[-2,-7],[-14,-30],[-10,-13],[-1,-3],[0,-3],[3,-3],[3,-3],[3,-2],[25,-11],[9,-5],[30,-27],[1,-2],[6,-16],[-5,-12],[-8,-11],[-5,-5],[-5,-3],[-17,-6],[-7,-2],[-4,-1],[-10,-1],[-21,-1],[-5,0],[-12,-3],[-15,-4],[-4,-1],[-5,-1],[-9,-1],[-5,0],[-10,1],[-35,6],[-15,2],[-6,0],[-4,0],[-4,-1],[-3,-1],[-3,-2],[-12,-14],[-5,-2],[-4,0],[-4,1],[-12,5],[-12,4],[-18,3],[-19,2],[-21,1],[-38,-1],[-10,1],[-4,0],[-8,2],[-3,1],[-7,4],[-2,1],[-6,6],[-4,4],[-14,8],[-4,4],[-5,4],[-6,3],[-17,6],[-3,2],[-3,1],[-3,2],[-11,15],[-3,2],[-17,9],[-6,3],[-4,1],[-4,1],[-10,1],[-5,1],[-3,1],[-3,2],[-5,3],[-3,2],[-4,0],[-5,1],[-16,0],[-5,-1],[-4,-1],[-4,-1],[-8,-4],[-4,-2],[-5,0],[-4,0],[-5,-1],[-3,-3],[-3,-14],[-4,-8],[-3,-2],[-3,-3],[-6,-3],[-15,-5],[-7,-3],[-2,-2],[-2,-2],[0,-3],[17,-19],[0,-3],[-1,-3],[-26,-27],[-1,-1],[-1,-2],[0,-4],[2,-4],[11,-17],[4,-7],[1,-3],[0,-5],[-3,-12],[-10,-20],[-35,-41],[0,-4],[2,-7],[13,-21],[3,-4],[3,-1],[5,-1],[9,1],[4,0],[4,-1],[2,-3],[0,-3],[-2,-6],[-4,-6],[-3,-2],[-4,-7],[-2,-5],[0,-6],[0,-8],[0,-3],[0,-10],[2,-11],[0,-6],[-1,-3],[-2,-2],[-5,-4],[-3,-2],[-1,-2],[0,-3],[2,-4],[5,-6],[10,-7],[2,-4],[2,-5],[1,-23],[-3,-5],[-2,-5],[-1,-3],[3,-4],[17,-15],[34,-22],[3,-1],[8,-2],[5,-1],[4,-1],[9,-1],[4,-1],[13,-5],[7,-3],[7,-2],[2,-3],[0,-2],[-4,-5],[-4,-2],[-4,-2],[-5,-1],[-4,0],[-5,0],[-5,1],[-7,2],[-4,0],[-3,-1],[-3,-1],[-2,-2],[-4,-5],[-3,-8],[-3,-4],[-8,-8],[-5,-4],[-50,-22],[-3,-2],[-2,-2],[-3,-2],[-1,-2],[0,-2],[0,-3],[1,-4],[1,-4],[3,-3],[6,-3],[9,-3],[2,-2],[1,-3],[-2,-4],[-8,-7],[-7,-9],[-16,-28],[0,-3],[3,-3],[11,-6],[3,-4],[3,-4],[2,-9],[-1,-16],[0,-2],[-5,-10],[1,-4],[4,-6],[16,-13],[3,-4],[2,-4],[1,-7],[-1,-4],[-2,-3],[-4,-1],[-12,-3],[-7,-2],[-3,-2],[-5,-3],[-4,-4],[-2,-2],[-6,-16],[-1,-2],[-4,-4],[-2,-2],[0,-4],[0,-3],[4,-12],[9,-12],[4,-4],[6,-4],[24,-12],[37,-12],[4,-1],[30,-21],[6,-3],[25,-18],[9,-4],[6,-2],[5,-1],[4,-1],[5,-3],[6,-4],[5,-4],[3,-5],[1,-5],[-3,-3],[-2,-2],[-4,-1],[-10,-4],[-2,-2],[-2,-3],[0,-3],[1,-6],[-3,-2],[-4,-1],[-4,-1],[-4,-2],[-1,-2],[1,-3],[4,-6],[13,-9],[7,-9],[1,-6],[15,-7],[68,-15]],[[1146,8144],[-65,-8],[-6,-1],[-8,-2],[-13,-5],[-11,-5],[-12,-9],[-6,-4],[-5,-1],[-6,0],[-34,1],[-44,0],[-11,-2],[-17,-3],[-131,-34],[-18,-7],[-2,-2],[-15,-3],[-52,-1],[-19,-10]],[[671,8048],[-168,84],[-12,9],[-7,9],[-2,9],[0,7],[-2,7],[-11,7],[-29,13],[-7,8],[-5,9],[-12,8],[-15,7],[-10,9],[28,2],[-16,32],[7,10],[34,32],[33,12],[4,2],[4,4],[-3,8],[-5,8],[-4,3],[-5,4],[-18,23],[-3,8],[-3,3],[-16,4],[-5,2],[-6,-1],[-4,0],[-2,6],[1,4],[6,6],[1,4],[-3,7],[-11,13],[-3,8],[0,5],[-1,4],[-5,5],[-62,46],[-13,14],[3,6],[19,5],[9,10],[0,12],[-7,11],[-16,4],[-61,14],[-14,-2],[-2,-2],[-22,-32],[-6,-5],[-11,-5],[-24,7],[-26,11],[-24,13],[-17,15],[-7,17],[0,15],[-5,15],[-30,26],[-28,31],[-5,10],[-14,12],[-26,13],[-7,8],[26,-2],[9,0],[10,-4],[25,-21],[3,-6],[6,-4],[13,-5],[12,-1],[30,3],[57,-1],[46,12],[84,30],[24,4],[63,-1],[58,9],[6,-1],[3,1],[7,8],[10,27],[-9,28],[-13,26],[-6,26],[-1,15],[-4,12],[-14,25],[-2,5],[5,18],[-5,8],[-13,8],[-29,11],[-27,15],[-5,8],[13,6],[25,10],[17,10],[9,10],[7,26],[13,13],[75,30],[17,11],[8,9],[6,53],[-3,12],[-9,13],[-11,6],[-32,14],[-7,7],[5,7],[11,1],[14,-1],[11,3],[10,13],[-11,12],[-17,12],[-8,16],[-1,7],[-9,13],[-1,5],[40,29],[40,19],[10,7],[8,10],[-1,4],[-4,3],[-4,9],[-3,13],[1,13],[11,8],[25,2],[20,1],[75,20],[10,5],[17,11],[11,5],[13,2],[12,0],[9,2],[7,9],[0,12],[-10,24],[-1,12],[16,45],[8,9],[25,3],[18,-9],[15,-12],[16,-2],[31,2],[25,-7],[48,-24],[40,-6],[9,-3],[6,-6],[-2,-14],[3,-7],[23,-9],[30,4],[54,13],[48,1],[57,-3],[54,1],[42,12],[4,0]],[[2593,3622],[-6,-8],[-6,-12],[3,-15],[18,-28],[5,-15],[-5,-10],[-10,1],[-8,4],[-3,3],[-22,1],[-17,-1],[-12,-2],[-10,-3],[-4,-6],[0,-28],[-6,-12],[-72,-61],[-4,-6],[2,-7],[4,-5],[-3,-3],[-16,0],[-21,-4],[-20,-8],[-17,-11],[-12,-11],[-8,-13],[-10,-33],[-12,-11],[-13,-3],[-15,-1],[-12,-3],[-5,-9],[3,-5],[7,-3],[11,-2],[12,0],[-8,-9],[-12,-7],[-9,-8],[-4,-10],[7,-9],[38,-14],[13,-7],[2,-9],[-1,-12],[-5,-12],[-9,-4],[-17,0],[-9,-1],[-27,-9],[-4,9],[-9,6],[-12,5],[-16,4],[-18,-5],[-16,-1],[-13,-1],[-11,-7],[0,-8],[8,-29],[13,-10],[45,-23],[22,-15],[14,-2],[22,4],[-16,-14],[-48,-2],[-11,-10],[-7,-16],[-32,-30],[-10,-17],[2,-18],[12,-13],[13,-10],[6,-11],[-4,-8],[-17,-7],[-4,-9],[8,-30],[0,-53],[2,-2],[4,-2],[3,-3],[0,-5],[-5,-3],[-15,-7],[-5,-4],[-4,-7],[-3,-6],[-1,-12]],[[2161,2809],[-1,0],[-19,-1],[-18,-2],[-10,0],[-4,0],[-5,-2],[-14,-7],[-25,-8],[-13,-3],[-10,-5],[-4,-3],[-5,-4],[-4,-4],[-5,-1],[-8,-2],[-14,0],[-8,0],[-4,1],[-3,1],[-2,1],[-3,0],[-42,-7],[-12,-1],[-20,-1],[-5,1],[-5,0],[-4,1],[-11,3],[-4,1],[-5,0],[-6,0],[-16,-3],[-22,-5],[-21,-7],[-18,-5],[-8,-2],[-11,-3],[-4,-1],[-14,-5],[-3,-1],[-4,0],[-3,1],[-3,1],[-3,1],[-4,0],[-5,-2],[-5,-4],[-7,-24],[-7,-8],[-25,-20]],[[1685,2680],[-27,17],[-40,13],[-13,4],[-21,3],[-4,2],[-3,2],[1,2],[2,2],[1,3],[0,3],[-6,8],[-1,3],[0,2],[-1,3],[-2,3],[-7,6],[-2,3],[0,3],[-5,10],[-8,12],[-2,6],[0,4],[7,11],[2,2],[2,2],[5,3],[13,5],[5,3],[3,2],[14,8],[3,1],[4,1],[4,1],[5,0],[4,1],[3,1],[4,2],[8,7],[3,2],[14,7],[3,4],[3,5],[4,10],[2,5],[3,4],[5,3],[3,2],[4,1],[3,1],[9,4],[5,3],[11,10],[5,3],[3,1],[11,4],[4,0],[4,1],[3,-1],[4,-1],[4,0],[9,0],[9,-2],[5,2],[7,2],[19,17],[9,7],[5,3],[2,2],[3,2],[13,5],[1,0],[6,2],[20,1],[4,1],[15,7],[7,6],[3,5],[2,6],[1,4],[4,3],[11,8],[4,3],[9,27],[1,7],[0,4],[-34,27],[-4,4],[-7,6],[-6,5],[-2,3],[-1,4],[0,7],[7,13],[3,4],[3,3],[3,2],[7,5],[5,5],[1,4],[-1,3],[-3,6],[-1,8],[1,3],[3,3],[5,0],[4,1],[3,3],[8,9],[13,10],[8,8],[2,4],[0,4],[-1,2],[-2,2],[-4,5],[-1,6],[0,3],[-3,2],[-2,2],[-2,2],[-4,1],[-13,2],[-4,1],[-4,1],[-3,2],[-1,3],[-2,3],[-3,1],[-6,3],[-2,2],[-1,2],[-1,3],[0,21],[1,5],[2,4],[2,2],[5,8],[2,1],[2,1],[9,4],[3,1],[7,6],[2,2],[3,1],[13,2],[3,1],[3,2],[8,8],[11,7],[1,2],[-1,2],[-2,2],[-6,4],[-3,2],[-3,4],[0,3],[2,2],[3,1],[5,3],[5,4],[8,10],[2,5],[-1,4],[-7,3],[-3,2],[-4,11],[-2,3],[-5,4],[-3,1],[-8,2],[-3,1],[-2,2],[-2,2],[-1,8],[-2,2],[-3,2],[-8,1],[-5,0],[-4,1],[-2,2],[-1,2],[-2,3],[-2,1],[-8,-1],[-3,1],[-4,4],[0,3],[1,3],[1,3],[2,2],[4,4],[15,19],[0,3],[-3,2],[-12,2],[-3,2],[-3,1],[-2,2],[-5,6],[-5,4],[-21,8]],[[1841,3481],[5,8],[10,6],[16,4],[11,-1],[11,-3],[13,0],[43,10],[5,1],[9,5],[5,6],[5,13],[0,10],[-10,14],[-2,8],[0,7],[3,7],[5,7],[7,6],[11,7],[5,1],[6,-2],[15,-1],[14,-3],[13,-3],[12,-1],[10,9],[11,20],[5,6],[19,11],[49,14],[9,4]],[[2156,3651],[4,-6],[4,-12],[3,-3],[5,-3],[17,-5],[19,-3],[51,-16],[12,-2],[11,-2],[8,-1],[16,-2],[9,0],[6,1],[6,2],[3,1],[30,1],[14,-1],[8,-1],[8,-3],[5,-1],[5,0],[4,1],[5,1],[8,0],[56,-3],[9,1],[3,1],[5,4],[6,2],[9,2],[4,0],[8,2],[7,2],[3,2],[3,1],[2,2],[3,2],[3,1],[3,1],[5,1],[12,1],[5,1],[30,2]],[[3604,1558],[-6,0],[-27,-2],[-31,-4],[-13,-2],[-39,-12],[-19,-4],[-39,-6],[-44,-12],[-4,0],[-4,-1],[-10,-10],[-21,-39]],[[3347,1466],[-24,4],[-59,7],[-12,2],[-7,2],[-10,8],[-5,2],[-14,5],[-3,2],[-2,1],[-1,3],[-1,2],[0,3],[-1,3],[-1,2],[-3,4],[-3,2],[-8,4],[-9,4],[-23,4],[-19,5],[-158,-13],[-8,0],[-8,0],[-5,-1],[-8,-5],[-7,-5],[-2,-2],[-8,-1],[-47,-5],[-8,-4]],[[2883,1499],[-10,8],[-5,20],[0,7],[1,5],[3,5],[5,19],[10,15],[1,3],[-1,4],[-2,1],[-9,5],[-3,1],[-5,1],[-5,1],[-5,0],[-17,-3],[-5,0],[-13,0],[-26,1],[-4,0],[-22,-3],[-11,-1],[-29,1],[-4,0],[-4,-1],[-3,-1],[-3,-1],[-2,-3],[-1,-2],[-1,-2],[-3,-2],[-2,-2],[-6,-6],[-9,-4],[-9,-4],[-3,-1],[-4,-1],[-3,-2],[-2,-2],[-3,-4],[-3,-4],[-3,-2],[-6,-3],[-3,-1],[-3,-1],[-3,-2],[-3,-2],[-2,-2],[-5,-6],[0,-3],[-1,-5],[-1,-2],[-3,-1],[-4,-1],[-27,-3],[-8,0],[-6,0],[-7,2],[-11,4],[-17,5],[-8,1],[-6,0],[-49,-1],[-12,1],[-9,0],[-3,2],[-3,1],[-5,4],[-6,3],[-3,1],[-3,4],[-5,4],[-1,2],[-9,6],[-38,9]],[[2393,1561],[-15,10],[1,2],[2,2],[3,1],[4,1],[2,2],[3,3],[8,11],[1,3],[-1,2],[-3,3],[-11,18],[-2,1],[-2,2],[-4,2],[-6,2],[-12,6],[-5,4],[-20,23],[-4,6],[0,4],[7,3],[4,2],[1,4],[1,7],[-4,9],[-3,10],[1,2],[2,2],[5,4],[2,2],[3,7],[1,2],[1,1],[3,2],[10,7],[3,3],[2,43],[-2,11],[-2,7],[-3,3],[-11,5],[-28,11],[-4,2],[-14,12]],[[2307,1830],[-25,18],[-6,8],[0,6],[1,3],[2,3],[4,4],[12,20],[3,3],[7,5],[9,5],[5,4],[5,4],[6,7],[2,5],[1,3],[-3,6],[-5,25],[1,4],[3,3],[4,0],[4,-1],[4,-1],[7,-2],[19,-9],[3,-1],[4,-1],[4,0],[4,0],[4,0],[4,2],[14,7],[27,9],[19,5],[17,3],[4,0],[7,3],[24,16],[2,1],[21,8],[3,3],[1,3],[-1,3],[-2,2],[-1,3],[0,4],[2,6],[3,3],[4,1],[6,1],[7,3],[28,14],[3,2],[2,3],[-1,7],[1,5],[2,3],[3,2],[23,13],[5,3],[2,3],[1,3],[6,13],[0,2],[-3,7],[-2,5],[0,11],[4,11],[0,3],[-2,11],[1,4],[2,6],[3,3],[3,2],[5,0],[5,0],[5,0],[6,0],[11,6],[31,35],[6,4],[4,1],[9,2],[4,0],[4,0],[3,-1],[3,-2],[1,-2],[2,-2],[3,-2],[3,-1],[5,0],[4,0],[4,1],[3,1],[9,5],[4,1],[4,0],[4,0],[4,0],[5,-1],[4,1],[4,0],[10,4],[16,3],[8,3],[4,2],[2,3],[0,2],[-2,3],[-1,2],[-3,2],[-2,2],[-1,3],[2,2],[3,1],[4,1],[5,0],[11,1],[7,1],[11,2],[4,3],[3,3],[0,2],[0,3],[0,2],[4,8],[7,7],[3,5],[1,8],[1,4],[2,9],[2,2],[4,1],[4,0],[4,-2],[6,-3],[3,-1],[5,0],[6,1],[8,2],[4,3],[2,2],[0,4],[-2,8],[1,5],[1,8],[0,3],[0,3],[-2,2],[-1,2],[-3,2],[-3,1],[-3,1],[-4,1],[-14,0],[-4,1],[-5,1],[-4,1],[-2,1],[-2,2],[-4,8],[-2,1],[-3,1],[-8,2],[-2,2],[-1,3],[9,13],[1,3],[6,11],[8,12],[3,6],[2,5],[-6,24],[0,7],[1,7],[2,3],[4,4],[19,12]],[[2916,2485],[12,-2],[6,3],[13,3],[7,3],[15,-7],[45,-12],[2,-6],[-2,-8],[8,-10],[22,-22],[10,5],[0,-51],[6,-13],[10,-9],[11,-7],[9,-9],[4,-10],[0,-33],[3,-6],[11,-11],[2,-8],[-2,-1],[-6,-3],[-5,-5],[-3,-5],[0,-16],[14,-52],[-6,-11],[16,-21],[24,-131],[9,-22],[21,-17],[68,-23],[11,-10],[5,-12],[26,-29],[20,-16],[8,-14],[7,-5],[9,-4],[26,-6],[6,-2],[7,-8],[16,-2],[19,2],[15,6],[-11,19],[-2,27],[-13,24],[-40,9],[23,6],[37,-15],[33,-21],[15,-15],[61,-88],[38,-134],[48,-122]],[[1286,1535],[4,3],[7,3],[4,3],[10,-11],[0,-10],[-9,-8],[-39,-7],[-5,-9],[3,-24],[-43,12],[-22,0],[-10,-15],[-4,-17],[-11,-10],[-17,-2],[-21,6],[-6,10],[-7,43],[-4,5],[-6,5],[-4,6],[-2,7],[5,3],[10,2],[6,5],[-5,9],[-6,2],[-22,4],[-4,1],[5,7],[11,5],[8,5],[-4,6],[-6,8],[5,7],[9,6],[4,7],[-1,7],[-5,13],[-2,24],[1,5],[3,5],[9,10],[4,7],[2,14],[-2,15],[-9,27],[6,0],[4,-1],[8,-4],[8,3],[11,-2],[11,-4],[11,-6],[7,-10],[9,-32],[8,0],[12,7],[17,-6],[18,-10],[20,-9],[9,8],[12,4],[11,-3],[8,-9],[0,-11],[-8,-11],[-16,-15],[-1,-5],[2,-13],[-1,-5],[-5,-3],[-8,-2],[-7,-3],[-5,-6],[-1,-12],[5,-13],[9,-12],[12,-9]],[[1428,1677],[5,-7],[-1,1],[57,-18],[18,-11],[10,-19],[2,-73],[-10,-15],[-19,0],[-13,10],[-8,14],[-4,16],[-6,10],[1,5],[6,5],[8,1],[7,1],[3,7],[-1,6],[-3,6],[-7,5],[-10,2],[-13,2],[-5,3],[-1,5],[-16,15],[-7,11],[-3,13],[0,11],[6,-3],[4,-3]],[[1530,1669],[-1,-9],[-40,8],[-9,3],[-12,9],[6,4],[26,4],[-5,11],[11,10],[17,10],[10,10],[10,-1],[4,-3],[2,-4],[0,-6],[-19,-46]],[[1136,2230],[-29,-38],[-10,1],[-11,13],[-2,14],[5,14],[1,18],[-5,21],[11,10],[22,-2],[11,-3],[13,-5],[14,-13],[-5,-14],[-15,-16]],[[1136,2303],[-24,-4],[-24,0],[-17,9],[0,9],[10,54],[-1,5],[4,3],[12,2],[15,2],[10,-3],[17,-7],[14,-9],[12,-10],[6,-13],[1,-15],[-26,-14],[9,-4],[-18,-5]],[[1641,2022],[-1,-17],[-4,-10],[-7,-7],[-4,-3],[-4,-2],[-7,-3],[-8,-1],[-19,-2],[-4,-1],[-3,-1],[-2,-7],[-1,-11],[5,-37],[3,-7],[2,-2],[6,-3],[2,-2],[2,-2],[-1,-4],[-4,-6],[-11,-13],[-3,-6],[1,-7],[4,-6],[1,-3],[-1,-2],[-12,-8],[-7,0],[0,-1]],[[1564,1848],[7,8],[-16,4],[-26,3],[-20,5],[-6,-15],[-17,-4],[-21,-1],[-19,-5],[-12,-8],[-19,-8],[-19,-4],[-12,8],[-8,0],[-2,-8],[-6,-4],[-9,0],[-8,7],[-8,0],[0,-9],[-25,2],[-21,-5],[-7,-8],[37,-8],[5,-11],[-1,-13],[8,-10],[0,-18],[-20,-28],[-26,-18],[-16,11],[-7,0],[-1,-7],[-3,-4],[-13,-8],[-19,9],[-23,23],[-31,7],[-3,5],[-5,5],[-14,2],[-13,1],[-10,1],[-8,3],[-7,4],[-4,10],[0,29],[-8,10],[-10,10],[-25,63],[-51,86],[-2,15],[6,12],[8,5],[4,-6],[3,-13],[9,-9],[29,-17],[7,13],[-10,9],[-17,6],[-13,9],[0,4],[3,4],[4,2],[2,3],[-1,11],[1,3],[13,21],[3,7],[-2,15],[-19,26],[-4,10],[5,6],[9,4],[10,3],[9,5],[4,5],[3,4],[4,42],[7,15],[26,23],[11,27],[24,18],[15,16],[10,3],[4,-2],[18,-2],[15,0],[-4,6],[-3,9],[12,9],[28,17],[-36,-8],[-23,-3],[-12,5],[-3,18],[14,7],[29,1],[20,5],[-14,21],[-35,26],[-16,15],[-6,17],[-1,14],[5,-4],[16,-3],[9,2],[10,5],[18,11],[-22,7],[-1,10],[11,12],[4,9],[14,11],[9,12],[8,19]],[[1251,2507],[15,2],[10,2],[10,3],[6,1],[3,1],[5,0],[7,-3],[10,-4],[37,-21],[43,-7]],[[1397,2481],[20,-6],[4,-3],[2,-5],[3,-25],[-1,-3],[-2,-4],[-2,-2],[-10,-7],[-9,-5],[-2,-1],[-2,-2],[-2,-3],[-1,-2],[-1,-5],[-2,-3],[-2,-2],[-1,-2],[-1,-3],[1,-5],[-1,-3],[1,-6],[3,-3],[-2,-4],[-4,-2],[-8,-2],[-3,-1],[-2,-2],[0,-6],[-2,-5],[0,-4],[9,-24],[0,-5],[-2,-2],[-3,-1],[-4,-2],[-4,0],[-3,-2],[-2,-2],[0,-2],[1,-3],[26,-39],[3,-8],[0,-5],[-5,0],[-4,1],[-4,-1],[-3,-1],[-4,-1],[-6,-3],[-14,-4],[-11,-3],[-4,-1],[-2,-1],[-3,-2],[-3,-5],[-1,-2],[1,-4],[2,-6],[6,-8],[1,-5],[-1,-3],[-6,-6],[-1,-2],[1,-2],[3,-3],[14,-2],[25,-2],[9,-1],[4,-1],[45,-20],[4,-3],[8,-8],[16,-15],[6,-4],[6,-2],[8,-1],[16,0],[5,-1],[4,0],[4,-2],[2,-3],[2,-5],[1,-4],[-5,-19],[-1,-6],[2,-14],[-1,-3],[0,-2],[-2,-2],[-2,-2],[-3,-2],[-13,-5],[-3,-1],[-2,-2],[-9,-11],[-3,-1],[-3,-2],[-4,-1],[-14,0],[-4,-1],[-3,-1],[-2,-2],[-2,-2],[1,-3],[4,-3],[38,-16],[3,-1],[8,-1],[10,1],[32,2],[12,2],[8,1],[7,2],[7,3],[2,1],[4,1],[4,0],[11,-3],[12,-2],[23,-3],[16,-4]],[[632,2538],[-5,-7],[-38,16],[-6,6],[3,5],[7,3],[9,3],[7,0],[14,-6],[7,-10],[2,-10]],[[659,2575],[-4,-4],[-10,-1],[-12,3],[-8,-1],[0,-10],[-25,11],[5,13],[22,8],[28,-4],[5,-4],[1,-6],[-2,-5]],[[1283,2770],[-22,-19],[-16,15],[6,10],[15,9],[11,12],[0,-4],[8,-14],[-2,-9]],[[1685,2680],[0,-7],[2,-6],[2,-2],[2,-1],[4,-1],[8,-2],[2,-2],[1,-2],[-1,-4],[1,-2],[2,-2],[3,-2],[3,-1],[1,-2],[-1,-3],[-4,-3],[-16,-5],[-8,-4],[-45,-29],[-15,-8],[-9,-2],[-11,-1],[-4,-1],[-3,-2],[-2,-2],[-1,-4],[2,-2],[3,-2],[3,-1],[3,-2],[1,-2],[-1,-2],[-7,-9],[-3,-1],[-6,0],[-4,1],[-8,2],[-3,0],[-3,-2],[-2,-4],[1,-3],[1,-3],[1,-5],[-1,-8],[1,-3],[2,-1],[4,-1],[4,1],[5,0],[4,0],[3,0],[2,-2],[-1,-3],[-2,-8],[-3,-4],[-4,-2],[-7,-1],[-27,-2],[-29,-3],[-9,0],[-6,0],[-5,4],[-6,6],[-2,1],[-3,1],[-7,-1],[-44,-7],[-10,-3],[-7,-3],[-14,-10],[-15,-15]],[[1251,2507],[9,23],[9,12],[25,24],[21,60],[17,19],[36,-14],[40,17],[13,9],[-3,6],[-9,1],[-23,-1],[-10,0],[-5,3],[-4,9],[-3,2],[-24,6],[10,11],[22,9],[12,0],[3,2],[11,8],[3,3],[-3,5],[-22,16],[20,1],[4,6],[-8,7],[-16,5],[8,4],[19,-6],[19,-4],[15,1],[6,12],[5,1],[10,5],[5,7],[-8,3],[-25,0],[-10,1],[-11,4],[-5,-5],[-2,-2],[-1,-3],[-8,0],[2,6],[-1,15],[-1,2],[11,6],[9,1],[10,1],[11,2],[17,6],[13,8],[10,10],[10,12],[-10,-4],[-20,-14],[-11,-4],[-11,1],[-6,5],[-6,5],[-21,7],[10,12],[19,13],[15,7],[5,-5],[8,-2],[9,0],[11,3],[-7,4],[18,8],[5,7],[-4,2],[-9,2],[-9,2],[2,4],[13,6],[10,9],[9,3],[27,0],[10,4],[3,6],[-11,3],[-14,0],[-2,-4],[-13,9],[0,4],[5,9],[53,51],[17,11],[33,52],[28,29],[9,15],[6,16],[2,14],[5,13],[18,26],[2,14],[23,41],[12,34],[17,26],[1,14],[-17,42],[-8,7],[-23,11],[-5,9],[11,29],[12,15],[53,39],[23,12],[12,2],[26,1],[8,1],[9,6],[5,6]],[[2834,2626],[-27,-5],[-16,4],[37,16],[6,-15]],[[3294,2662],[6,-9],[-13,-7],[-10,-19],[-3,-22],[-10,-17],[-35,-10],[-2,-4],[-1,-5],[-4,-5],[-8,-2],[-9,0],[-10,0],[-57,-3],[-11,-2],[-7,13],[-5,25],[-13,13],[18,12],[-2,12],[-10,13],[-6,12],[12,7],[28,3],[31,-2],[71,-10],[22,2],[9,13],[7,-1],[12,-7]],[[2806,2688],[-3,-1],[-1,2],[-2,7],[3,0],[3,-1],[2,-1],[3,-1],[-5,-5]],[[2307,1830],[-36,-6],[-16,-4],[-14,-2],[-12,-1],[-25,0],[-6,1],[-43,7],[-3,1],[-5,3],[-10,2],[-52,6],[-15,0],[-11,0],[-15,-7],[-3,-1],[-9,-8],[-4,-1],[-7,-2],[-33,-6],[-4,0],[-12,2],[-12,2],[-43,2],[-9,0],[-4,-1],[-18,-6],[-5,0],[-3,2],[-4,4],[-3,4],[-5,9],[-3,11],[0,11],[1,11],[-2,5],[-1,2],[-5,4],[-1,2],[-1,3],[0,2],[2,8],[2,2],[2,2],[5,3],[4,4],[6,10],[1,2],[0,3],[0,3],[-2,2],[-2,3],[-3,2],[-7,4],[-6,5],[-8,8],[-1,2],[0,3],[2,2],[15,12],[15,8],[6,3],[6,2],[4,2],[2,1],[3,1],[0,2],[-2,2],[-2,2],[-8,10],[-24,14],[-6,2],[-6,2],[-17,3],[-5,2],[-4,2],[-6,6],[-7,5],[-5,2],[-6,1],[-44,1],[-9,1],[-6,1],[-4,1],[-3,2],[-16,11],[-6,2],[-5,2],[-4,1],[-5,0],[-4,0],[-4,-1],[-4,-1],[-2,-2],[-5,-4],[-12,-18],[-1,-2],[-2,-2],[-3,-1],[-9,-2],[-13,0]],[[2161,2809],[0,-2],[3,-15],[17,-27],[7,-26],[6,-15],[11,-15],[37,-31],[7,-11],[2,-15],[4,-11],[51,-52],[70,-50],[-10,-2],[-5,1],[-6,0],[-9,1],[-10,-1],[0,-3],[1,-3],[-3,-3],[-30,-9],[-11,-5],[-23,-13],[-6,-12],[4,-28],[25,-31],[57,-6],[59,-3],[33,-17],[39,2],[40,0],[37,3],[33,13],[9,10],[6,12],[8,12],[18,8],[15,1],[54,-6],[20,2],[16,5],[13,4],[9,2],[37,6],[20,7],[1,2],[45,-2],[8,-1],[7,6],[16,-1],[23,-5]],[[3188,2813],[12,-1],[22,1],[12,-1],[38,-14],[14,-22],[13,-52],[-13,5],[-30,10],[-66,15],[-14,6],[7,8],[-4,8],[-24,15],[1,4],[15,14],[5,7],[12,-3]],[[2128,1248],[-21,-8],[-28,9],[-24,16],[-31,39],[-4,7],[1,23],[-2,11],[-8,10],[3,1],[2,1],[1,0],[3,3],[8,0],[37,-20],[13,-4],[0,-24],[12,-25],[18,-22],[20,-17]],[[2128,1327],[-11,-1],[-11,1],[-8,4],[-3,3],[-3,4],[-7,2],[-8,3],[-7,2],[-30,27],[27,8],[45,-4],[24,-8],[4,-8],[0,-13],[-4,-13],[-8,-7]],[[2393,1561],[6,-8],[4,-8],[-2,-4],[-2,-4],[-13,-13],[-5,-3],[-17,-8],[-22,-13],[-1,-3],[0,-3],[3,-5],[3,-2],[3,-2],[3,-2],[3,-1],[2,-2],[4,-4],[1,-2],[1,-3],[2,-11],[3,-4],[27,-25],[1,-2],[-2,-4],[-4,-6],[-29,-26],[-14,-6],[-49,-20],[-3,0]],[[2296,1367],[-2,1],[-14,10],[-16,4],[-20,2],[-9,4],[-17,13],[-24,9],[-23,8],[-19,9],[-9,16],[-7,0],[-3,-24],[-12,-18],[-25,-9],[-42,4],[-28,17],[-6,44],[-16,18],[50,22],[7,8],[2,12],[8,20],[-1,12],[-23,-13],[-12,-3],[-15,2],[-6,4],[-19,17],[-9,5],[-19,3],[-20,6],[-8,14],[1,7],[2,4],[1,3],[-4,6],[-9,6],[-19,6],[-10,5],[-7,7],[-2,4],[-5,2],[-15,-2],[-8,-4],[-8,-12],[-5,-2],[-18,-3],[-18,-6],[-17,-3],[-17,2],[-6,5],[-8,15],[-6,6],[-15,5],[-7,-3],[-3,-5],[-5,-4],[-15,-8],[-7,1],[-2,9],[-3,6],[-16,9],[-6,6],[-3,13],[3,33],[-4,9],[4,21],[0,12],[-4,11],[-21,26],[-17,-19],[-7,0],[-4,49],[-9,7],[-23,-4],[-35,-12],[-13,2],[-8,0],[0,-5],[-8,0],[-2,8],[5,36],[6,6],[20,8],[2,1]],[[3347,1466],[39,-4],[5,-1],[5,-2],[7,-5],[10,-4],[20,-4]],[[3433,1446],[-54,-26],[-14,-10],[-2,-13],[14,-57],[22,-32],[8,-25],[7,-11],[14,-5],[3,-2],[26,-12],[5,-5],[3,-3],[40,-55],[22,-21],[29,-13],[26,-2],[30,0],[25,-5],[10,-14],[0,-1]],[[3647,1134],[-2,-1],[-21,-14],[-7,-3],[-4,-3],[-2,-2],[-1,-2],[-5,-13],[-2,-2],[-5,-3],[-8,-2],[-34,-6],[-6,-1],[-6,-4],[-3,-3],[-5,-8],[-3,-2],[-5,-1],[-23,-3],[-4,1],[-20,-2],[-10,-1],[-47,-9],[-14,-2],[-10,-1],[-4,0],[-5,0],[-14,-1],[-91,-28],[-8,-1],[-13,-6],[-37,-24]],[[3228,987],[-65,44],[-14,13],[-15,22],[-6,11],[-9,12],[-1,3],[0,2],[1,2],[2,2],[5,3],[2,4],[0,5],[-4,10],[-2,5],[-4,3],[-7,3],[-4,2],[-21,16],[-3,3],[-3,4],[-2,11],[-2,3],[-3,2],[-9,5],[-9,4],[-3,3],[-2,3],[0,3],[-32,50],[-3,7],[2,3],[-1,2],[-2,2],[-26,15],[-4,3],[-2,4],[2,6],[0,10],[-1,3],[-2,3],[-30,25],[-4,5],[-2,4],[2,5],[1,3],[-2,11],[1,2],[0,3],[3,2],[3,1],[12,3],[3,1],[3,1],[2,3],[2,3],[1,6],[-1,3],[-2,3],[-2,1],[-23,13],[-3,3],[-2,3],[-6,23],[-6,13],[-48,61]],[[2285,638],[15,-6],[-4,-4],[-12,-2],[-36,-14],[-27,-2],[-25,4],[-19,10],[22,-3],[11,6],[12,8],[22,3],[-9,0],[39,1],[11,-1]],[[2789,585],[-9,-3],[-15,12],[-15,28],[-41,22],[4,9],[13,8],[12,9],[2,7],[-3,12],[1,5],[6,4],[9,2],[7,3],[3,6],[2,13],[5,12],[8,4],[28,-34],[0,-33],[19,-25],[10,-19],[-2,-10],[-4,-7],[-8,-4],[-11,-1],[-10,-1],[-4,-6],[0,-6],[-2,-4],[-5,-3]],[[3247,968],[11,-6],[11,-7],[2,-3],[3,-5],[2,-10],[1,-9],[-1,-3],[0,-1],[3,-4],[4,-4],[12,-10],[12,-7],[5,-2],[5,-4],[19,-14],[2,-2],[3,-1],[7,-2],[4,-1],[15,-1],[4,0],[4,-1],[11,-3],[4,-1],[19,-2],[4,-1],[7,-2],[7,-2],[19,-11],[2,-2],[1,-4],[0,-7],[-5,-15],[-4,-6],[-3,-4],[-2,-2],[-2,-3],[-3,-8],[-4,-6],[-1,-3],[0,-4],[10,-19],[2,-2],[5,-4],[2,-8],[-7,-23],[-6,-7]],[[3431,722],[-3,2],[-11,4],[-17,-3],[-8,-6],[-3,-8],[-2,-15],[-8,-27],[1,-12],[10,-16],[2,-9],[-7,-6],[-10,-5],[-9,-7],[-1,-6],[4,-12],[1,-6],[-5,-17],[-11,-14],[-10,-11],[-9,14],[-14,11],[-22,4],[15,22],[2,11],[-12,4],[-16,-2],[-9,-5],[-12,-15],[-40,19],[-34,22],[-5,6],[-3,7],[-5,7],[-8,3],[-15,-4],[-9,-1],[-4,3],[3,5],[10,8],[3,3],[-3,7],[-11,11],[-2,8],[-5,2],[-12,0],[-12,0],[-5,7],[-5,12],[-13,9],[-32,13],[-29,25],[-19,10],[-21,-4],[-11,-1],[-9,9],[-9,17],[-9,7],[-6,2],[-105,22],[-30,16],[1,27],[5,12],[6,2],[18,0],[4,3],[-1,6],[-7,6],[-13,3],[-18,6],[1,13],[5,14],[-9,9],[20,22],[12,11],[14,4],[4,4],[33,26],[-3,2]],[[2884,1012],[1,0],[29,-1],[15,1],[7,2],[7,2],[24,5],[7,0],[5,0],[1,-3],[0,-2],[-2,-5],[-1,-2],[1,-3],[1,-2],[5,-7],[4,-4],[7,-5],[6,-3],[32,-11],[11,-2],[7,-1],[3,1],[6,3],[5,3],[4,4],[15,17],[2,4],[3,6],[1,3],[3,2],[7,3],[4,1],[4,-1],[3,-1],[5,-4],[29,-23],[10,-7],[22,-11],[21,-6],[8,-2],[6,-1],[35,6]],[[4478,829],[-1,-8],[-22,-19],[-6,-8],[-4,-5],[-4,-34],[0,-6],[1,-5],[17,-15],[10,-33],[2,-5],[3,-1],[3,-2],[8,-2],[33,-6]],[[4518,680],[5,-28],[-3,-8],[-6,-4],[-5,-3],[-14,-15],[-3,-2],[-3,-1],[-19,-13],[-33,-30],[-6,-4],[-11,-2],[-55,-7],[-36,-8],[-16,-6],[-8,-6],[-3,-7],[-4,-13],[-2,-16],[4,-22],[0,-6],[-4,-9],[-7,-5],[-8,-4],[-19,-6],[-7,-2],[-7,-1],[-6,0],[-13,-1],[-16,0],[-30,0]],[[4183,451],[4,6],[3,6],[-3,6],[-14,14],[-5,7],[-3,8],[-4,32],[-11,13],[-27,9],[-14,1],[-13,0],[-11,1],[-10,4],[-3,5],[0,15],[-2,5],[-20,0],[-78,-31],[-21,-2],[-22,3],[-41,10],[-74,12],[-22,6],[-38,15],[-18,3],[-31,-2],[-21,1],[-26,4],[-12,3],[-35,10],[-23,11],[-14,13],[-45,76],[-8,5],[-13,2],[-14,1],[-11,-1],[-18,-6],[0,-1],[-18,0],[-11,3],[-5,4]],[[3247,968],[-19,19]],[[3647,1134],[1,-15],[2,-8],[5,-7],[10,-5],[17,0],[12,-3],[11,-6],[-19,-5],[-11,-3],[-8,-3],[-3,-4],[3,-8],[9,-5],[10,-3],[16,-19],[15,-7],[17,-3],[19,1],[14,-8],[9,-4],[11,-2],[30,-1],[14,2],[30,4],[30,16],[9,8],[-3,19],[-1,11],[31,-21],[186,-142],[23,-10],[32,-7],[20,-4],[27,7],[20,-10],[36,-19],[62,-26],[60,-16],[35,0],[50,1]],[[3604,1558],[30,-76],[87,-235],[73,-97],[65,-57],[15,-13],[9,-14],[-1,-10],[-31,2],[-15,8],[-43,22],[-24,8],[-9,3],[-34,0],[-22,6],[16,18],[-12,22],[-8,29],[-17,6],[2,54],[-5,47],[-20,26],[-37,8],[-40,-3],[-27,-22],[-9,-12],[-7,-4],[-13,4],[-8,5],[-3,4],[-1,6],[0,8],[8,13],[41,14],[17,13],[4,26],[-8,36],[-16,33],[-22,21],[-23,5],[-23,-3],[-24,-5],[-24,-2],[-12,-6]],[[2523,1094],[10,-8],[-16,1],[-15,-1],[-13,-2],[-10,-4],[-18,-17],[-13,-7],[-6,5],[-1,34],[10,16],[24,-7],[16,-6],[32,-4]],[[2884,1012],[-6,5],[-20,-3],[-23,-7],[-14,-4],[-19,5],[-6,8],[0,24],[-42,-13],[-20,-10],[-8,0],[-4,10],[-9,0],[-23,3],[-32,28],[-21,31],[6,15],[26,8],[22,20],[16,24],[6,23],[-7,0],[-34,-37],[-24,-14],[-30,7],[-5,10],[6,29],[-5,10],[-16,1],[-12,-10],[-8,-13],[-4,-11],[5,-24],[-5,-9],[-21,-4],[-12,2],[-19,4],[-16,6],[-7,4],[-6,2],[-34,3],[-17,6],[-15,11],[-35,32],[11,11],[2,16],[-4,30],[-3,5],[-12,11],[-2,7],[-6,1],[-26,0],[-10,2],[16,14],[-2,15],[-8,17],[-9,31],[-8,0],[-11,-3],[-11,0],[-10,3],[-12,4],[-4,5],[14,2],[5,4],[-6,8]],[[5121,625],[14,-10],[-1,-5],[-2,-2],[-11,-6],[-8,-5],[-10,-8],[-21,-13],[-22,-17],[-10,-7],[-8,-3],[-40,-3],[-22,-2],[-49,-9],[-5,-2],[-4,-3],[-1,-2],[-35,-100],[-2,-18],[-2,-8],[-2,-3],[-3,-2],[-10,-4],[-9,-5],[-2,-3],[0,-3],[8,-8],[8,-13],[4,-4],[2,-2],[2,-1],[35,-12],[5,-3],[9,-8],[1,-1],[3,-5],[3,-13],[1,-3],[2,-2],[8,-4],[7,-3],[12,-2],[3,-2],[3,-1],[5,-4],[5,-6],[2,-5],[-5,-41],[1,-6],[1,-2],[7,-8],[5,-3],[1,-4],[1,-5],[-3,-23],[0,-2],[1,-3],[5,-5],[0,-1]],[[4998,177],[-129,-28],[-43,-15],[-46,-12],[-47,-5],[-37,-11],[-15,-31],[-4,-15],[-10,-13],[-16,-12],[-18,-10],[-57,-19],[-33,-6],[-20,5],[-14,17],[-18,17],[-23,15],[-27,10],[-12,1],[-23,0],[-12,2],[-8,6],[-14,15],[-10,8],[-6,6],[-2,8],[3,8],[8,7],[49,56],[20,7],[25,3],[22,5],[10,12],[2,13],[8,22],[2,38],[6,27],[-8,13],[-23,9],[-19,11],[1,15],[16,11],[16,5],[11,5],[2,17],[-3,13],[-8,9],[-15,3],[-56,-7],[-20,4],[-38,18],[-23,-3],[-32,-19],[-23,-3],[-50,7],[-16,1],[-15,-3],[-6,-4],[-6,0],[-10,10],[-3,5],[0,20],[2,6]],[[4518,680],[24,-7],[28,-13],[9,-4],[8,-1],[9,0],[6,1],[7,-1],[17,-3],[8,-1],[12,0],[12,1],[20,4],[13,6],[20,10],[2,1],[3,2],[2,2],[5,3],[16,20],[4,2],[7,4],[5,0],[2,-1],[1,-3],[-1,-8],[1,-5],[8,-17],[0,-2],[0,-3],[0,-2],[-3,-5],[-1,-2],[0,-3],[0,-2],[1,-1],[1,-2],[4,-4],[4,-2],[3,-3],[12,-13],[3,-2],[7,-4],[6,-1],[5,0],[4,0],[14,4],[21,4],[20,1],[40,6],[21,0],[13,-2],[7,0],[5,0],[9,4],[8,2],[9,4],[20,6],[10,2],[6,0],[5,0],[3,-2],[2,-1],[18,-15],[8,-8],[3,-2],[4,-3],[10,-3],[6,-1],[6,-1],[13,2],[28,7]],[[3661,9513],[-9,-4],[-45,-29],[-10,-4],[-5,-1],[-9,-2],[-33,-2],[-6,-1],[-7,-2],[-9,-4],[-4,-2],[-2,-2],[-1,-2],[-2,-2],[-4,-2],[-6,-1],[-12,0],[-30,1],[-4,0],[-8,-2],[-9,-2],[-31,-11],[-3,-2],[-2,-2],[-6,-5],[-10,-13],[-3,-4],[-2,-4],[0,-2],[1,-3],[3,-4],[0,-2],[-1,-2],[-1,-2],[-2,-1],[-3,-2],[-5,-2],[-3,-1],[-1,-2],[0,-2],[1,-3],[1,-2],[1,-2],[-1,-2],[-2,-1],[-9,-6],[-7,-4],[-2,-2],[-1,-1],[2,-9],[-1,-3],[0,-2],[-1,-2],[-2,-2],[-6,-2],[-48,-10],[-3,-1],[-3,-1],[-2,-1],[-1,-2],[0,-4],[0,-3],[-1,-2],[-1,-2],[-2,-1],[-5,-1],[-7,0],[-14,3],[-12,3],[-4,0],[-7,0],[-10,0],[-19,-3],[-9,-1],[-6,-2],[-41,-21],[-13,-5],[-8,-2],[-8,-2],[-7,0],[-8,1],[-15,4],[-7,2],[-4,3],[-2,5],[0,6],[1,5],[13,24],[0,3],[0,3],[-1,2],[-2,3],[-2,1],[-3,2],[-7,2],[-197,-18],[-7,-1],[-9,-3],[-15,-6],[-17,-6],[-23,-1]],[[2814,9314],[-4,13],[-12,8],[-23,6],[-8,6],[-3,5],[-2,5],[-3,5],[-7,3],[-6,2],[-5,0],[-5,-1],[-4,0],[-3,-2],[-3,-1],[-4,-2],[-18,-14],[-7,-5],[-3,-2],[-1,-3],[1,-2],[1,-3],[0,-2],[-1,-3],[-1,-2],[-14,-11],[-2,-2],[-1,-3],[-3,-11],[0,-2],[1,-6],[4,-4],[7,-5],[2,-3],[1,-2],[1,-5],[1,-8],[-2,-11],[-1,-10],[-1,-4],[-1,-4],[1,-3],[1,-2],[-1,-4],[-1,-3],[-25,-28],[-4,-6],[-2,-5],[1,-5],[-1,-4],[-7,-16],[0,-11],[-6,-12],[0,-3],[1,-2],[3,-1],[5,-1],[4,0],[5,0],[3,-1],[3,-1],[1,-4],[0,-4],[-1,-7],[-2,-3],[-4,-3],[-6,-3],[-8,-6],[-4,-6],[-5,-10],[-3,-4],[-4,-3],[-4,-1],[-5,0],[-16,0],[-9,-1],[-7,-1],[-3,0],[-7,-3],[-4,-2],[-55,-34],[-6,-3],[-4,-1],[-4,-1],[-4,-1],[-33,-2]],[[2468,9023],[-13,30],[-6,8],[-10,6],[-56,35],[-4,5],[-19,37],[-1,5],[12,28],[2,2],[3,2],[17,9],[2,3],[2,4],[2,8],[-1,4],[-22,42],[-2,6],[2,2],[8,7],[3,4],[0,3],[-8,19],[-16,20],[-2,4],[0,4],[4,9],[0,4],[-1,3],[-3,7],[-2,2],[-2,3],[-14,8],[-2,3],[0,2],[1,1],[8,5],[17,10],[3,2],[3,3],[3,5],[0,3],[-2,3],[-6,3],[-4,1],[-2,2],[-4,3],[-3,4],[-8,14],[-2,4],[-3,2],[-4,1],[-10,0],[-5,0],[-5,3],[-5,5],[-9,11],[-2,6],[-1,5],[1,2],[1,3],[2,2],[2,2],[5,4],[12,5],[26,8],[4,1],[2,2],[3,2],[3,4],[2,2],[3,2],[3,1],[7,3],[4,1],[5,0],[5,0],[4,-1],[4,1],[4,1],[3,4],[4,2],[8,8],[9,24],[2,4],[3,2],[8,5],[2,3],[4,6],[1,3],[3,1],[3,2],[3,1],[4,2],[4,0],[15,1],[5,1],[5,2],[1,2],[-2,3],[-2,4],[-2,6],[-2,4],[-3,2],[-11,3],[-4,2],[-5,3],[-3,3],[-5,15],[0,4],[2,3],[5,4],[2,2],[3,1],[4,1],[4,1],[4,4],[5,5],[9,21],[3,4],[3,1],[11,4],[9,4],[4,1],[4,1],[4,1],[5,0],[5,0],[17,-3],[10,-1],[23,3],[2,0],[4,-1],[6,-2],[4,-2],[13,-2],[3,-1],[3,-2],[4,-4],[2,-5],[0,-3],[0,-2],[2,-3],[4,-3],[3,-2],[12,-6],[4,-1],[4,1],[6,3],[10,15],[3,3],[9,5],[9,13],[3,22],[-1,4],[-3,2],[-4,1],[-4,1],[-29,2],[-5,1],[-7,2],[-6,3],[-7,6],[-3,1],[-20,5],[-7,3],[-4,2],[-3,4],[-2,6],[0,3],[2,3],[3,2],[4,1],[27,4],[3,1],[25,9],[5,3],[5,4],[1,3],[-1,2],[-3,2],[-8,1],[-19,3],[-9,2],[-7,2],[-12,5],[-9,5]],[[2599,9802],[2,0],[12,12],[7,17],[-9,11],[-39,22],[-14,40],[-10,12],[-44,25],[-11,11],[23,5],[17,-4],[59,-21],[93,-17],[11,0],[22,2],[13,-1],[11,-2],[18,-7],[12,-1],[23,2],[45,10],[25,2],[48,0],[22,4],[20,10],[11,11],[16,25],[13,10],[22,8],[27,4],[66,5],[5,2],[6,-1],[13,-5],[7,-6],[3,-6],[4,-7],[12,-5],[14,-9],[13,-2],[14,0],[18,-2],[15,-6],[8,-5],[6,-7],[10,-7],[53,-18],[-3,-23],[7,-13],[16,-11],[22,-6],[22,0],[18,10],[-1,26],[11,6],[4,1],[27,5],[7,1],[2,1],[14,24],[24,16],[35,13],[44,5],[46,-6],[24,-14],[69,-80],[31,-22],[6,-5],[6,-10],[4,-4],[10,-3],[20,-5],[4,-3],[9,-6],[20,-7],[20,-3],[8,2],[7,9],[5,1],[3,-7],[2,-34],[-8,-27],[-30,-48],[-32,-43],[-5,-24],[-5,-11],[-12,-10],[-10,-4],[-23,-5],[-10,-3],[-8,-6],[-13,-19],[-16,-11],[-29,-21],[-5,-12],[5,-9],[8,-5]],[[2468,9023],[-28,-10],[-6,-6],[0,-2],[6,-9],[3,-5],[0,-5],[-6,-21],[-3,-6],[-4,-5],[-3,-1],[-8,-2],[-15,-3],[-6,-2],[-7,-4],[-11,-7],[-3,-4],[-1,-3],[2,-2],[3,-1],[4,-1],[5,0],[8,2],[3,0],[4,-3],[1,-14],[3,-5],[4,-10],[3,-5],[4,-4],[3,-1],[1,-4],[2,-5],[0,-10],[-1,-5],[-2,-3],[-2,-2],[-11,-7],[-5,-4],[-16,-25],[-3,-7],[-1,-5],[9,-10],[2,-3],[-1,-3],[-3,-1],[-5,-2],[-4,-3],[-6,-7],[-2,-5],[1,-2],[3,-2],[8,-2],[4,-1],[4,0],[6,-1],[5,0],[4,-2],[3,-5],[-2,-5],[-3,-8],[-3,-4],[-4,-2],[-9,-2],[-5,-2],[-5,-4],[-2,-5],[0,-7],[-1,-4],[-3,-4],[-2,-1],[-9,-4]],[[2365,8706],[-6,3],[-17,4],[-7,2],[-34,16],[-19,6],[-31,11],[-3,2],[-2,1],[-2,3],[0,2],[1,3],[3,2],[5,1],[4,2],[3,2],[2,3],[-1,5],[-1,3],[-6,10],[-2,2],[-3,1],[-4,1],[-8,2],[-4,1],[-3,2],[-2,2],[-2,2],[-16,10],[-2,2],[0,2],[2,4],[1,2],[-2,2],[-2,2],[-4,1],[-4,1],[-13,-2],[-27,0],[-9,-1],[-4,-1],[-5,-3],[-15,-8],[-6,-3],[-5,-1],[-6,0],[-21,0],[-4,-1],[-5,0],[-5,-1],[-4,-2],[-21,-11],[-5,-1],[-4,-1],[-2,1],[-2,1],[-3,2],[-5,3],[-3,2],[-3,1],[-4,1],[-3,0],[-3,0],[-5,0],[-4,0],[-4,-2],[-6,-4],[-33,-36],[-14,-4],[-10,-13],[-31,-25],[-7,-11],[-111,-30],[-49,-21],[-23,-7],[-71,-8],[-19,-6],[9,-7],[1,-7],[-5,-8],[-9,-8],[-7,-8],[6,-7],[8,-6],[5,-7],[-5,-2],[-23,-15],[-3,-7],[12,-3],[30,-5],[78,-24],[7,-3],[5,-4],[3,-4],[1,-2],[2,-8],[3,-28],[2,-6],[2,-3],[9,-5],[3,-2],[2,-2],[3,-4],[1,-3],[1,-31],[2,-5],[-1,-8],[-17,-53],[6,-13],[3,-5],[2,-2],[3,-1],[4,-1],[5,0],[4,0],[16,2],[7,0],[5,-1],[4,-1],[3,-2],[2,-2],[9,-19],[12,-18],[2,-3],[3,-7],[3,-5],[7,-8],[1,-3],[4,-10],[3,-4],[2,-2],[2,-2],[9,-5],[3,-1],[2,-2],[2,-2],[0,-3],[0,-3],[-9,-22],[-1,-2],[-3,-5],[-2,-8],[0,-12],[-2,-2],[-2,-1],[-7,-3],[-3,-1],[-2,-2],[-4,-2],[-7,-2],[-15,-1],[-7,-1],[-5,-2],[-4,-1],[-3,-1],[-5,-1],[-5,0],[-6,1],[-8,1],[-26,10],[-47,12],[-19,4],[-49,-1]],[[1637,8184],[-13,-4],[-13,-3],[-30,-6],[-3,-1],[-4,-1],[-3,-2],[-2,-1],[-4,-5],[-2,-2],[-1,-2],[1,-3],[2,-4],[0,-3],[-2,-2],[-2,-2],[-6,-3],[-4,-1],[-6,-3],[-3,-1],[-13,-6],[-2,-1],[-3,-2],[-6,-3],[-2,-2],[-1,-3],[1,-2],[1,-2],[2,-2],[1,-3],[1,-2],[0,-6],[1,-2],[1,-2],[8,-5],[2,-2],[2,-2],[2,-5],[-1,-3],[-1,-3],[-1,-2],[-5,-4],[-4,-4],[-6,-6],[-4,-1],[-5,-2],[-28,-2],[-4,0],[-21,-5],[-3,-1],[-3,-1],[-3,-2],[-3,-2],[-6,-6],[-12,-18],[-3,-10],[-2,-9],[2,-12],[2,-5],[1,-2],[3,-2],[2,-1],[22,-10],[5,-4],[3,-4],[2,-3],[1,-5],[0,-3],[-2,-6],[-2,-5],[-6,-9],[-9,-7],[-1,-3],[-1,-2],[0,-2],[2,-2],[3,-2],[4,-1],[9,-1],[4,-1],[2,-2],[2,-2],[0,-2],[0,-3],[-1,-2],[0,-3],[2,-7],[1,-3],[-5,-12],[-2,-2],[-2,-2],[-4,-2],[-9,-2],[-16,-2],[-13,-3],[-31,-4],[-15,-1],[-22,1],[-5,-1],[-4,-1],[-37,-11],[-4,-1],[-6,0],[-7,-1],[-8,1],[-6,1],[-4,1],[-6,3],[-5,3],[-3,1],[-4,2],[-12,2],[-4,2],[-3,1],[-8,5],[-3,1],[-4,2],[-20,4],[-7,3],[-3,1],[-2,2],[-2,2],[-1,3],[0,3],[2,5],[3,4],[0,5],[0,5],[-11,23],[-2,2],[-2,2],[-14,8],[-1,2],[0,3],[4,4],[5,2],[11,4],[3,1],[2,2],[0,3],[-1,3],[-4,3],[-5,2],[-9,2],[-4,1],[-2,3],[0,4],[10,23],[3,15],[-1,5],[-2,6],[-18,28],[-2,2],[-3,2],[-4,1],[-13,2],[-4,1],[-4,0],[-5,-1],[-4,-1],[-4,0],[-5,-1],[-4,1],[-4,2],[-2,3],[-2,9],[0,26],[1,5],[2,6],[4,3],[6,4],[21,8],[10,5],[10,12]],[[1357,9500],[13,1],[11,-4],[9,-7],[12,-5],[21,-5],[5,1],[2,4],[12,6],[24,5],[27,3],[9,3],[21,14],[10,5],[21,6],[107,8],[23,4],[71,29],[36,-9],[17,-6],[15,-7],[23,-19],[19,2],[43,17],[47,10],[16,7],[16,15],[10,17],[-2,12],[-6,13],[-4,16],[3,7],[6,5],[5,4],[3,3],[0,6],[-7,12],[-2,7],[13,46],[24,23],[45,18],[53,11],[49,4],[23,-1],[50,-8],[21,-5],[47,-21],[24,-6],[31,2],[145,24],[40,18],[15,9],[15,4],[11,4]],[[2814,9314],[2,-17],[11,-22],[1,-2],[-2,-8],[1,-4],[4,-5],[9,-9],[2,-5],[0,-4],[-6,-5],[-2,-3],[-1,-2],[-1,-6],[3,-23],[1,-3],[0,-2],[1,-3],[0,-3],[4,-10],[3,-4],[7,-8],[5,-7],[8,-11],[2,-2],[1,-3],[0,-3],[2,-3],[4,-5],[30,-25],[4,-5],[2,-4],[1,-2],[7,-15],[7,-9],[4,-4],[4,-2],[6,-2],[14,-3],[8,-1],[7,0],[5,-1],[5,-1],[20,-16],[3,-3],[0,-3],[0,-2],[-2,-5],[1,-2],[1,-2],[2,-1],[3,-1],[4,-1],[12,-1],[8,-1],[6,0],[9,1],[5,1],[5,-1],[18,-5],[8,-1],[6,0],[10,0],[7,-1],[5,0],[8,-2],[4,-2],[5,-3],[8,-6],[3,-4],[4,-6],[5,-6],[3,-2],[17,-7],[59,-19],[10,-3],[12,-4],[18,-8],[11,-10],[4,-5],[0,-4],[-2,-5],[-1,-3],[0,-2],[1,-3],[1,-2],[2,-2],[3,-2],[4,-1],[8,1],[13,1],[29,-8]],[[3337,8897],[12,-14],[-1,-10],[-3,-5],[-2,-2],[-6,-6],[-7,-4],[-1,-1],[-6,-7],[-1,-3],[-1,-3],[3,-5],[1,-2],[3,-5],[5,-18],[1,-11],[-3,-7],[-6,-12],[-1,-5],[0,-3],[2,-3],[3,-4],[9,-6],[3,-5],[-1,-6],[-4,-11],[-4,-5],[-3,-3],[-3,-1],[-5,-1],[-4,1],[-8,1],[-4,0],[-3,-1],[-7,-2],[-5,-1],[-9,-1],[-6,-1],[-5,-2],[-6,-6],[-3,-4],[-1,-4],[2,-12],[-1,-4],[-1,-4],[-6,-9],[-19,-16],[-40,-42],[-4,-3],[-6,-2],[-8,-3],[-16,-3],[-4,-1],[-3,-2],[-3,-1],[-16,-18],[-4,-3],[-6,-3],[-3,-2],[-35,-34],[-5,-3],[-6,-3],[-7,-2],[-9,-2],[-20,-1],[-9,-2],[-3,-1],[-4,-3],[-15,-12],[-10,-7],[-27,-10],[-2,-2],[-4,-2],[-18,-17],[-38,-28],[-6,-5],[-3,-4],[2,-9],[-1,-5],[-2,-2],[-42,-30],[-7,-4],[-5,0],[-6,-1],[-6,-2],[-19,-8],[-8,-2],[-4,-1],[-9,-2],[-5,-1],[-5,-2],[-13,-7],[-5,-2],[-4,-1],[-5,0],[-4,1],[-4,1],[-5,3],[-3,1],[-4,1],[-9,2],[-4,0],[-5,0],[-6,-1],[-8,-3],[-4,-3],[-2,-3],[0,-4],[-3,-6],[-2,-3],[-1,-1],[-2,-1],[-27,-16],[-57,-23],[-131,-80],[-10,-8],[-13,-13],[-4,-2],[-11,-6],[-4,-2],[-3,-1],[-4,-1],[-5,0],[-14,1],[-4,0],[-14,-2],[-17,0],[-7,-2],[-4,-2],[-1,-2],[-1,-6],[1,-5],[2,-5],[3,-5],[16,-13],[18,-12],[9,-8],[2,-1],[4,-1],[4,-1],[5,-1],[10,0],[11,0],[8,1],[15,5],[18,9],[4,1],[4,1],[4,1],[5,0],[14,-2],[6,1],[6,3],[17,12],[10,3]],[[2556,8166],[8,-11],[0,-3],[-5,-13],[0,-4],[1,-3],[0,-4],[-3,-3],[-8,-6],[-4,-3],[-8,-4],[-3,-3],[-2,-4],[-2,-9],[0,-4],[1,-4],[3,-4],[0,-3],[-2,-2],[-6,-1],[-5,0],[-5,1],[-4,1],[-5,0],[-4,0],[-4,-1],[-3,-2],[-2,-3],[-1,-3],[-2,-16],[2,-2],[3,-1],[8,-2],[3,-1],[2,-2],[1,-6],[0,-2],[5,-7],[0,-3],[-2,-2],[-6,-3],[-10,-3],[-3,-1],[-2,-2],[-2,-3],[0,-12],[-5,-17],[2,-3],[2,-3],[2,-1],[8,-8],[3,-2],[3,-1],[8,-2],[3,-2],[1,-3],[-2,-5],[-7,-9],[-1,-5],[0,-3],[2,-2],[4,-2],[8,-2],[2,-1],[7,-5],[4,-2],[3,-1],[13,-2],[4,-1],[3,-2],[3,-2],[1,-2],[4,-9],[1,-4],[-2,-7],[-3,-4],[-3,-2],[-3,-2],[-4,-1],[-6,-3],[-5,-4],[-2,-2],[-1,-2],[-3,-5],[0,-6],[4,-13],[-1,-3],[-1,-3],[-3,-2],[-3,-2],[-4,-1],[-3,-2],[-1,-2],[-1,-5],[-2,-3],[-3,-1],[-13,-2],[-3,-1],[-6,-3],[-8,-2],[-10,-1],[-4,-1],[-3,-1],[-2,-2],[-4,-1],[-6,-1],[-10,2],[-7,2],[-5,5],[-6,9],[-5,4],[-18,11],[-6,2],[-4,1],[-27,2]],[[2369,7850],[-45,38],[-3,5],[-5,11],[-3,4],[-2,7],[4,11],[0,5],[-1,3],[-3,5],[-3,2],[-5,1],[-10,2],[-28,1],[-4,-1],[-5,-1],[-7,-2],[-6,-3],[-2,-1],[-5,-4],[-2,-2],[-2,-3],[-3,-7],[-1,-2],[-3,-2],[-18,-9],[-10,-7],[-3,-1],[-3,0],[-4,1],[-27,8],[-5,2],[-4,1],[-8,2],[-5,0],[-6,0],[-10,0],[-5,0],[-6,2],[-7,3],[-5,2],[-5,2],[-5,0],[-5,0],[-6,0],[-10,1],[-4,1],[-4,1],[-11,4],[-8,1],[-5,2],[-4,3],[-6,5],[-4,3],[-4,3],[-12,2],[-3,4],[-2,6],[5,21],[13,24],[6,7],[1,2],[0,6],[-6,26],[-4,10],[-7,9],[-8,6],[-2,6],[2,10]],[[2001,8086],[10,0],[10,-1],[10,0],[4,0],[8,3],[3,1],[3,2],[2,2],[4,9],[5,24],[0,3],[0,3],[2,3],[7,4],[4,1],[6,2],[3,3],[2,3],[0,12],[1,4],[6,5],[4,2],[5,1],[7,3],[3,1],[3,2],[10,11],[5,2],[3,2],[2,2],[-2,4],[-2,3],[-13,11],[-1,3],[2,3],[5,2],[5,2],[5,1],[5,0],[10,1],[9,-1],[14,-1],[10,-1],[5,0],[3,2],[0,2],[-4,7],[-2,2],[-2,3],[-1,2],[0,2],[2,2],[5,0],[9,0],[4,1],[3,2],[1,2],[-2,4],[-3,3],[-16,10],[-7,6],[-2,1],[-6,3],[-4,2],[-3,1],[-3,2],[-2,2],[-3,1],[-3,2],[-3,1],[-19,2],[-4,1],[-3,2],[-1,2],[0,11],[-1,2],[-2,2],[-3,2],[-11,3],[-2,2],[-2,2],[-1,2],[3,19],[0,3],[-1,3],[-3,6],[-6,8],[-3,2],[-2,1],[-4,4],[-5,6],[-11,10],[-2,3],[-1,2],[-3,22],[2,10],[-1,6],[-2,5],[-1,5],[-2,5],[-4,4],[-7,5],[-2,3],[-1,2],[0,8],[0,3],[-1,2],[-4,4],[-17,13],[-1,2],[-7,12],[-1,5],[-5,9],[1,4],[6,3],[15,5],[23,5],[4,1],[5,0],[5,-1],[4,0],[5,1],[15,3],[5,1],[4,-1],[4,-1],[4,-1],[4,0],[3,2],[3,6],[2,4],[1,2],[2,3],[7,4],[4,3],[5,2],[17,3],[6,2],[4,3],[8,11],[7,6],[3,4],[2,2],[0,3],[0,3],[0,2],[4,4],[18,14],[10,9],[38,28],[13,12],[2,3],[3,4],[5,3],[8,3],[19,4],[10,1],[8,0],[14,-1],[5,0],[5,1],[6,1],[8,4],[2,1],[2,4],[2,15]],[[2001,8086],[-40,17],[-16,4],[-5,0],[-11,0],[-6,0],[-13,1],[-5,1],[-6,-1],[-7,-1],[-8,-1],[-10,-3],[-5,-3],[-11,-9],[-2,-2],[-1,-3],[-2,-5],[-1,-6],[1,-8],[-1,-3],[-3,-2],[-8,-4],[-3,-2],[-2,-2],[-7,-15],[-4,-4],[-2,-2],[-44,-19],[-7,-2],[-1,0],[-9,-2],[-50,-9],[-10,-1],[-22,0],[-30,1],[-10,11],[0,42],[-4,11],[-8,10],[-3,10],[8,12],[-9,8],[0,9],[7,8],[14,4],[25,2],[10,8],[0,9],[-6,9],[-37,30]],[[4485,8600],[-8,-6],[-76,-33],[-45,-15],[-57,-28],[-16,-14],[-1,-2],[-1,-2],[2,-2],[3,-1],[3,-2],[2,-3],[-3,-6],[-4,-3],[-6,-3],[-21,-8],[-5,-3],[-1,-3],[3,-1],[8,-3],[3,-1],[2,-3],[0,-4],[-2,-2],[-3,-2],[-22,-7],[-5,-2],[-3,-3],[-5,-7],[-14,-16],[-4,-5],[-3,-3],[-4,-2],[-5,0],[-4,-1],[-27,-10],[-49,-24],[-10,-4],[-5,0],[-21,0],[-20,2],[-5,0],[-25,-1],[-10,0],[-5,1],[-6,3],[-3,1],[-4,1],[-4,1],[-19,0],[-9,1],[-4,0],[-18,0],[-5,1],[-14,-1],[-34,8],[-10,0],[-6,-1],[-10,-6],[-16,-7],[-6,-1],[-7,0],[-15,1],[-6,-1],[-4,-2],[-4,-5],[-28,-1],[-14,-1],[-5,0],[-19,2],[-5,-1],[-7,0],[-7,-2],[-6,-1],[-6,-1],[-5,1],[-4,0],[-7,3]],[[3699,8360],[3,7],[-22,63],[-1,7],[4,2],[4,1],[8,2],[7,2],[10,4],[4,1],[14,1],[6,4],[6,5],[10,15],[4,9],[4,15],[2,4],[10,13],[4,3],[12,9],[9,8],[2,4],[0,3],[-2,2],[-7,5],[-2,4],[0,4],[2,15],[-1,6],[2,2],[1,2],[2,1],[6,2],[10,4],[3,2],[2,2],[23,30],[4,8],[2,6],[-1,5],[0,10],[-1,4],[-1,4],[-5,7],[-3,1],[-3,2],[-5,0],[-20,0],[-4,0],[-2,1],[-3,0],[-2,1],[-2,1],[-4,4],[-2,2],[-3,1],[-3,2],[-4,0],[-5,1],[-11,-1],[-14,-1],[-5,0],[-15,2],[-4,0],[-5,-1],[-4,-1],[-12,-3],[-4,-1],[-4,1],[-4,1],[-2,1],[-2,2],[-2,2],[-10,36],[-1,2],[-2,2],[-12,9],[-1,4],[-1,3],[6,23],[2,2],[2,2],[2,2],[8,3],[3,2],[1,2],[-2,2],[-3,1],[-4,1],[-5,1],[-15,1],[-4,1],[-4,2],[-4,4],[-5,8],[-1,6],[0,4],[0,3],[3,6],[2,4],[4,4],[5,4],[8,5],[4,1],[7,5],[4,6],[0,3],[-3,2],[-5,1],[-10,0],[-6,2],[-4,2],[-6,6],[-2,5],[1,7],[0,3],[-3,3],[-9,1],[-5,2],[-7,4],[-1,3],[1,3],[5,7]],[[3616,8899],[10,17],[70,64],[7,3],[4,1],[4,1],[5,0],[27,0],[9,1],[10,3],[19,7],[8,4],[4,3],[2,4],[0,2],[-1,3],[-1,2],[-2,2],[-3,1],[-9,2],[-5,1],[-10,0],[-16,0],[-3,4],[0,6],[11,17],[6,7],[5,4],[4,1],[5,0],[11,0],[7,0],[9,-1],[9,-1],[8,-2],[22,-7],[10,-4],[4,-1],[5,-1],[5,0],[5,0],[7,1],[2,2],[0,2],[-19,12],[-2,2],[-2,2],[-1,2],[0,2],[2,4],[3,5],[8,9],[6,2],[5,2],[5,0],[4,0],[14,3],[4,0],[4,1],[8,2],[9,3],[17,9],[6,5],[2,3],[-3,2],[-3,1],[-4,1],[-3,2],[-2,1],[-2,5],[-2,8],[-1,3],[-2,2],[-2,2],[-1,2],[-1,3],[0,2],[1,9],[0,5],[-1,3],[-1,3],[-1,2],[-9,7],[-4,7],[-3,5],[-1,3],[11,25],[2,11],[3,8],[0,3],[-1,2],[-3,4],[-3,2],[-4,1],[-5,0],[-9,0],[-4,1],[-4,1],[-5,6],[-3,2],[-4,0],[-5,0],[-4,0],[-3,-2],[-2,-2],[-3,-2],[-4,0],[-5,0],[-9,1],[-8,2],[-7,2],[-3,2],[-9,7],[-6,6],[-1,3],[-2,10],[1,4],[2,3],[5,3],[33,14],[8,8],[8,10],[5,5],[4,3],[6,3],[8,2],[5,1],[4,1],[5,2],[2,2],[-1,3],[-1,2],[-6,5],[-13,10]],[[3883,9367],[14,12],[25,10],[32,1],[98,-20],[17,-6],[11,-6],[9,-7],[9,-2],[12,9],[55,28],[49,31],[14,13],[5,4],[12,3],[6,1],[7,-1],[107,1],[34,-2],[26,-5],[53,-18],[33,-6],[35,-2],[34,2],[29,5],[14,4],[10,4],[13,2],[21,-3],[16,-5],[9,-5],[6,-7],[5,-9],[2,-16],[-6,-20],[-16,-14],[-28,-5],[-27,-9],[-18,-24],[-7,-27],[8,-20],[8,-3],[20,-3],[7,-2],[4,-6],[0,-4],[-2,-3],[0,-4],[25,-57],[-4,-39],[3,-16],[8,-11],[14,-8],[52,-25],[33,-19],[10,-20],[-51,-27],[-9,-9],[-11,-22],[-12,-11],[-30,-18],[-9,-12],[-2,-13],[6,-40],[-5,-12],[-18,-21],[-4,-11],[6,-13],[29,-15],[6,-11],[-7,-10],[-15,-11],[-33,-17],[-11,-3],[-21,-4],[-8,-4],[-4,-7],[1,-15],[-4,-7],[-16,-9],[-77,-23],[-5,-3],[-3,-7],[-8,-13],[-35,-19],[-7,-13],[8,-12],[17,-12],[28,-14]],[[3616,8899],[-134,5],[-32,-3],[-12,0],[-8,1],[-9,2],[-26,5],[-8,1],[-5,-1],[-8,-2],[-17,-3],[-4,-1],[-16,-6]],[[3661,9513],[12,-9],[9,-8],[3,-10],[3,-23],[8,-11],[9,-9],[25,-16],[10,-9],[4,-11],[0,-11],[3,-10],[15,-8],[21,-7],[35,-8],[35,-5],[21,0],[9,9]],[[3699,8360],[-27,-6],[-14,-4],[-2,-1],[-20,-11],[-4,-4],[-2,-3],[-2,-12],[1,-2],[1,-3],[-1,-5],[-4,-7],[-14,-16],[-8,-6],[-7,-2],[-2,2],[-4,4],[-2,2],[-15,11],[-6,5],[-2,2],[-10,4],[-2,2],[-3,2],[-3,4],[-3,2],[-2,2],[-4,1],[-7,1],[-11,-1],[-32,-4],[-7,-1],[-3,-2],[-5,-4],[-8,-8],[-6,-3],[-25,-12],[-40,-14],[-29,-15],[-9,-3],[-9,-3],[-64,-13],[-9,-1],[-5,0],[-5,0],[-4,1],[-3,1],[-6,1],[-7,0],[-21,-4],[-7,-1],[-24,-1],[-4,-2],[-2,-2],[1,-2],[-2,-4],[-6,-3],[-22,-8],[-5,-3],[-9,-7],[-6,-2],[-5,0],[-8,2],[-18,8],[-8,3],[-10,2],[-22,-1]],[[3066,8216],[-92,-3],[-6,-1],[-7,-1],[-15,-5],[-14,-3],[-5,-2],[-3,-1],[-6,-6],[-13,-9],[-2,-2],[-6,-9],[-2,-2],[-14,-9],[-3,-1],[-4,-1],[-6,0],[-9,3],[-4,2],[-4,2],[-2,2],[-2,2],[-2,2],[-3,4],[-2,2],[-3,2],[-10,4],[-30,18],[-7,5],[-3,2],[-3,1],[-51,10],[-14,2],[-9,1],[-7,0],[-6,-1],[-18,-2],[-12,-1],[-4,0],[-5,-1],[-5,-1],[-4,-1],[-25,-8],[-18,-9],[-50,-35]],[[4343,8151],[-3,-5],[-25,-30],[-40,-26],[-17,-14],[0,-15],[20,-8],[43,-4]],[[4321,8049],[-6,-8],[-4,-4],[-3,-1],[-3,-2],[-3,-1],[-11,-3],[-6,-3],[-3,-2],[-2,-2],[-1,-3],[0,-11],[-2,-4],[-2,-3],[-16,-9],[-3,-2],[-2,-2],[1,-3],[2,-4],[7,-5],[6,-2],[4,-3],[3,-5],[9,-28],[0,-4],[-6,-9],[-2,-5],[-1,-6],[0,-6],[2,-4],[3,-4],[9,-4],[7,-1],[5,0],[4,1],[8,1],[5,0],[4,-1],[9,-1],[4,-1],[5,0],[5,0],[20,1],[5,0],[5,0],[4,-1],[4,-2],[4,-2],[11,-11],[6,-2],[6,-2],[4,0],[4,-1],[3,-1],[3,-2],[9,-10],[3,-2],[3,-1],[4,-2],[4,0],[6,0],[11,-1],[5,0],[4,-1],[3,-1],[4,-2],[3,-3],[5,-7],[16,-13],[2,-2],[0,-3],[0,-5],[-7,-11],[-3,-4],[-13,-8],[-4,-4],[-5,-7],[-11,-37],[-11,-19],[-6,-6],[-1,-5],[-1,-22],[-2,-6],[-2,-5],[-9,-8],[-2,-1],[-3,-1],[-3,-1],[1,-2],[2,-3],[8,-6],[4,-4],[3,-4],[-1,-7],[-3,-3],[-4,-2],[-4,-1],[-2,-2],[0,-3],[4,-3],[13,-4],[15,-4],[4,-1],[7,-3],[3,-11]],[[4475,7611],[-29,0],[-4,0],[-4,-1],[-36,-25],[-10,-5],[-7,-4],[-13,-2],[-5,-2],[-15,-10],[-11,-4],[-2,-1],[-3,-1],[-25,-15],[-8,-2],[-5,-1],[-5,1],[-4,0],[-5,0],[-6,-1],[-5,-3],[-3,-4],[-3,-8],[1,-4],[2,-3],[8,-5],[3,-2],[2,-1],[1,-3],[0,-3],[0,-3],[1,-2],[2,-2],[3,-2],[2,-2],[1,-2],[1,-2],[-2,-8],[1,-3],[1,-2],[2,-2],[9,-5],[2,-2],[0,-2],[-3,-3],[-20,-9],[-7,-2],[-6,0],[-10,0],[-10,-1],[-7,-2],[-18,-10],[-4,-3],[-4,-4],[-16,-23],[-2,-5],[0,-3],[3,-8],[4,-9],[2,-5],[0,-3],[-1,-3],[-1,-3],[-7,-8],[-40,-33],[-8,-9],[-4,-6],[2,-2],[-2,-2],[-4,-2],[-16,-2],[-9,-2],[-34,-13],[-20,-6],[-23,-3],[-5,-2],[-3,-3],[-2,-8],[-6,-11],[-30,-22]],[[3996,7233],[-85,43],[-19,12],[-1,17],[-6,9],[-14,15],[-2,4],[-1,3],[0,1],[-6,7],[-10,10],[-10,5],[-9,3],[-7,0],[-11,0],[-19,-1],[-23,-3],[-21,-2],[-5,0],[-6,0],[-29,5],[-10,1],[-5,0],[-72,-9],[-28,-4],[-5,2],[-12,2],[-11,1],[-10,-7],[-11,-3],[-11,-1],[-5,3],[-2,13],[-2,4],[-5,4],[-5,-2],[-11,-3],[0,9],[-7,14],[-2,8],[-17,6],[-4,1],[-4,0],[-47,-9],[-28,-9],[-14,-5],[-50,-29],[-2,-2],[-3,0],[-4,-1],[-5,-1],[-16,0],[-5,0],[-38,-7],[-6,-1],[-5,-1],[-20,-1]],[[3230,7334],[-9,14],[-2,7],[-3,4],[-8,5],[-17,10],[-10,4],[-8,2],[-19,2],[-5,1],[-8,2],[-10,3],[-7,3],[-4,0],[-5,1],[-9,-1],[-5,0],[-5,2],[-5,2],[-19,17],[-7,9],[-3,4],[0,10],[14,28]],[[3076,7463],[35,9],[4,3],[4,5],[-2,2],[-1,3],[-3,1],[-4,2],[-42,5],[-5,1],[-6,4],[-1,4],[2,5],[2,2],[2,3],[6,3],[7,2],[12,3],[7,6],[37,51],[8,6],[4,0],[24,-3],[5,0],[13,1],[5,0],[2,0],[10,-3],[5,0],[5,-1],[6,0],[3,2],[1,2],[0,8],[3,6],[3,3],[4,2],[18,3],[20,2],[43,-1],[10,-1],[6,0],[6,1],[10,3],[3,3],[1,2],[-1,3],[-2,1],[-6,4],[0,3],[1,5],[6,9],[4,8],[-1,2],[-3,4],[-2,2],[-2,2],[-48,19],[-41,11],[-49,17],[-55,26],[-3,2],[-2,2],[-8,11],[-5,3],[-7,3],[-4,1],[-8,2],[-4,1],[-2,2],[-3,1],[-11,13],[-5,9],[1,4],[2,2],[4,1],[20,1],[16,0],[5,-1],[5,0],[4,-1],[9,-2],[5,1],[4,0],[8,3]],[[3170,7786],[33,8],[10,-2],[3,-2],[4,-2],[8,-3],[5,0],[140,23],[17,1],[10,0],[4,-2],[5,-2],[12,-1],[11,1],[6,2],[55,23],[3,2],[5,3],[2,2],[1,2],[1,3],[0,1],[0,1],[-16,35],[0,3],[0,2],[5,7],[0,3],[6,4],[8,6],[37,17],[10,3],[4,1],[10,1],[5,-1],[9,-2],[5,0],[8,0],[5,3],[6,4],[5,2],[107,22],[10,1],[10,0],[37,0],[4,0],[4,-1],[3,-2],[2,-1],[3,-4],[2,-1],[3,-1],[6,0],[23,4],[27,2],[27,4],[11,3],[7,2],[13,12],[4,5],[10,6],[62,25],[4,3],[0,1],[4,2],[12,5],[51,13],[35,18],[35,31],[19,9],[41,16],[8,4],[4,4],[6,10],[8,8],[10,8],[11,6],[6,3],[6,2],[4,0],[5,1],[5,-1],[4,-1],[2,-2],[5,-6],[3,-2],[3,-1],[5,0],[5,-1],[17,2],[16,3],[8,2],[6,2],[5,3],[2,1],[1,0]],[[3066,8216],[8,-3],[7,-5],[3,-1],[4,-1],[4,-2],[3,-1],[2,-2],[3,-2],[1,-2],[0,-3],[-3,-5],[-1,-3],[1,-4],[5,-5],[4,-2],[4,-2],[16,-7],[27,-16],[2,-3],[7,-17],[1,-4],[0,-7],[-10,-29],[-2,-3],[-3,-2],[-8,-5],[-2,-2],[-3,-1],[-19,-6],[-6,-2],[-3,-2],[-2,-2],[0,-3],[1,-4],[5,-4],[13,-8],[5,-6],[3,-2],[4,-1],[4,-1],[4,0],[4,-1],[3,-2],[2,-4],[3,-5],[3,-3],[4,-2],[8,-2],[16,-7],[27,-16],[2,-2],[4,-6],[2,-5],[2,-3],[3,-2],[5,-4],[0,-2],[-1,-4],[-7,-6],[-5,-3],[-6,-2],[-10,0],[-4,-1],[-4,-1],[-3,-1],[-2,-1],[0,-2],[0,-3],[3,-5],[4,-2],[3,-2],[4,-1],[3,-2],[2,-4],[0,-24],[1,-7],[-1,-5],[-2,-7],[-8,-11],[-4,-5],[-4,-3],[-12,-3],[-3,-2],[-9,-5],[-4,-3],[-8,-9],[0,-2],[1,-3],[6,-4],[3,-5],[6,-16],[-2,-30]],[[3076,7463],[-21,10],[-10,7],[-9,5],[-14,8],[-4,2],[-7,1],[-21,0],[-23,-1],[-85,0],[-39,-3],[-5,0],[-10,0],[-7,1],[-165,56],[-3,2],[-3,1],[-3,5],[-1,2],[0,9],[-2,5],[-1,3],[-3,4],[-3,2],[-7,5],[-6,3],[-8,2],[-5,2],[-14,1],[-15,1],[-66,-3],[-63,-9],[-15,1],[-35,13]],[[2403,7598],[-9,2],[-7,2],[-5,3],[-12,8],[-9,6],[-4,1],[-3,1],[-4,1],[-24,3],[-4,1],[-2,3],[-5,9],[-3,3],[-1,4],[1,4],[11,17],[2,4],[2,13],[-2,18],[-3,6],[0,3],[1,4],[22,22],[3,1],[16,7],[6,3],[3,2],[2,3],[1,4],[0,3],[-4,4],[-4,2],[-3,2],[-1,9],[5,74]],[[4485,8600],[10,-5],[76,-19],[12,-9],[-4,-5],[-20,-12],[-7,-5],[-2,-7],[0,-23],[4,-5],[10,-14],[7,-3],[9,-3],[8,-3],[4,-6],[-3,-11],[-18,-25],[-5,-13],[4,-12],[21,-26],[4,-9],[-10,-9],[-38,-13],[-16,-7],[-21,-18],[-16,-17],[-19,-17],[-31,-15],[-38,-11],[-9,-7],[-5,-14],[4,-23],[-7,-8],[-24,-6],[-9,-4],[-2,-4],[3,-4],[8,-5],[1,-1],[0,-2],[0,-1],[-1,-2],[-12,-3],[-7,-4],[-3,-6],[3,-7],[2,-13],[-5,-13]],[[1963,6473],[6,-19],[2,-11],[-1,-8],[1,-3],[1,-2],[2,-2],[3,-5],[1,-5],[-1,-3],[-3,-8],[1,-14],[2,-5],[7,-9],[2,-2],[1,-1],[67,-29],[4,-3],[7,-5],[2,-3],[2,-3],[5,-1],[9,0],[20,2],[36,4],[4,1],[5,0],[7,-1],[22,-6],[4,-1],[6,0],[10,1],[7,1],[7,-1],[9,-2],[17,-3],[21,-3],[5,-1],[3,-1],[6,-2],[14,-1],[37,5]],[[2323,6324],[-1,-2],[11,-4],[3,-2],[4,-4],[4,-5],[10,-16],[1,-5],[0,-5],[4,-16],[0,-6],[-1,-5],[-2,-3],[-3,-1],[-3,-2],[-6,-2],[-3,-2],[-2,-2],[-5,-3],[-6,-4],[-1,-2],[-1,-2],[1,-5],[3,-5],[2,-3],[3,-3],[3,-3],[7,-1],[5,0],[8,2],[4,1],[5,0],[5,-1],[4,-1],[48,-35],[14,-7],[9,-4],[10,2],[19,4],[5,1],[4,0],[5,-1],[9,-1],[8,-2],[7,-3],[3,-3],[3,-5],[2,-7],[-1,-4],[-2,-2],[-8,-5],[0,-3],[5,-5],[23,-17],[3,0],[4,0],[21,4],[20,1],[4,1],[3,1],[3,1],[3,2],[3,5],[5,3],[3,2],[7,2],[3,2],[3,1],[3,4],[2,3],[1,2],[1,9],[1,2],[4,7],[1,3],[-1,10],[1,3],[2,2],[3,1],[4,1],[4,-1],[4,-1],[7,-3],[3,0],[4,0],[9,1],[9,-1],[9,-2],[9,-1],[5,0],[4,0],[5,1],[3,1],[4,1],[6,3],[6,3],[3,1],[4,2],[9,0],[26,0],[5,-1],[9,-1],[7,-2],[3,-2],[70,-45],[37,-17],[3,-2],[15,-12],[3,-2],[4,-2],[39,-9],[5,-1],[15,-1],[9,-1],[7,-3],[21,-10],[1,-2],[0,-3],[-5,-5],[-4,-3],[-5,-2],[-7,-2],[-3,-1],[-2,-2],[0,-2],[3,-4],[2,-2],[4,-2],[21,-8],[12,-5],[8,-5],[2,-2],[1,-2],[-1,-3],[-6,-4],[-5,-2],[-37,-11],[-21,-4],[-4,-2],[-3,-1],[-2,-2],[-8,-122],[7,-27],[0,-25],[-2,-8],[-7,-15],[-4,-7],[-4,-4],[-52,-27],[-2,-3],[0,-4],[9,-38],[2,-3],[3,-1],[6,0],[4,0],[6,-1],[16,-9],[10,-14]],[[2964,5691],[-4,-9],[-1,-9],[3,-4],[3,-5],[10,-9],[7,-4],[13,-4],[7,-1],[7,-2],[4,-3],[6,-12],[5,-4],[19,-5],[3,-8]],[[3046,5612],[-12,-4],[-5,-5],[-22,-32],[-11,-11],[-1,-1],[-7,-1],[-9,-3],[-4,-2],[-3,-2],[-14,-21],[-6,-4],[-6,-2],[-22,0],[-18,-1],[-5,1],[-19,2],[-36,1],[-29,2],[-6,0],[-13,-1],[-68,-16],[-25,-1],[-13,-2],[-6,-1],[-5,-2],[-6,-3],[-7,-5],[-22,-11],[-7,-2],[-6,-1],[-5,1],[-22,3],[-8,2],[-10,4],[-6,3],[-5,3],[-2,2],[-6,6],[-3,2],[-3,2],[-7,1],[-4,0],[-26,-11],[-113,-20],[-15,-2],[-5,0],[-9,1],[-8,2],[-8,2],[-7,3],[-3,1],[-8,3],[-5,1],[-6,-1],[-6,-1],[-8,-3],[-6,-1],[-5,0],[-13,4],[-7,1],[-5,0],[-4,-1],[-6,-3],[-5,-4],[-5,-3],[-3,-2],[-14,-4],[-21,-8],[-8,-1],[-6,-1],[-21,0],[-33,-2]],[[2163,5463],[-7,5],[-39,21],[-9,11],[-14,32],[0,12],[3,8],[0,5],[-2,4],[-7,6],[-5,2],[-17,3],[-6,2],[-5,4],[-6,10],[-5,4],[-38,15],[-11,8],[-12,15],[-15,13],[-39,25],[-6,12],[-3,16],[-12,11],[-21,7],[-29,5],[-26,6],[-143,59],[-27,16],[-29,31],[-11,1],[-15,-2],[-18,0],[-8,3],[-16,11],[-7,5],[-9,2],[-19,2],[-8,2],[-16,6],[-10,5],[-55,38],[-84,94],[-15,4],[-15,4],[-9,9],[-6,16],[-11,15],[-16,13],[-145,77],[-65,57],[-10,13],[4,9],[0,4],[-3,4],[-13,6],[-4,3],[-2,15],[1,24],[-8,15],[-24,23],[-4,7],[0,3],[0,6],[5,6],[7,6],[4,7],[-7,15],[-37,21],[-9,16],[5,13],[25,24],[6,12],[-7,9],[-8,11],[-1,8],[37,-1],[9,0],[21,5],[18,10],[42,33],[15,2],[27,-3],[22,-4],[41,-14],[19,-4],[8,1],[3,5],[0,10],[-3,4],[-7,3],[-8,2],[-3,2],[2,4],[3,3],[3,2],[1,1],[11,4],[6,3],[2,6],[-5,12],[1,5],[7,3],[44,5],[19,4],[23,7],[25,-6],[24,-8],[18,-10],[4,-15],[32,20],[11,31],[-2,34],[-29,101],[3,39],[-2,11]],[[1437,6780],[38,-9],[11,-2],[28,-13],[8,-2],[7,-1],[4,1],[6,-2],[15,-6],[6,0],[5,0],[5,0],[4,-1],[7,-4],[80,-69],[3,-4],[-1,-3],[-3,-1],[-7,-2],[-2,0],[0,-1],[1,-1],[3,-3],[44,-16],[4,-2],[3,-2],[3,-6],[5,-12],[2,-3],[3,-2],[6,-3],[12,-4],[7,-3],[7,-4],[35,-32],[49,-33],[11,-11],[8,-11],[4,-3],[7,-3],[27,-6],[19,-6],[52,-22]],[[3230,7334],[-47,-69],[-15,-13],[-3,-5],[-1,-4],[2,-2],[2,-2],[3,-1],[3,-2],[6,-3],[4,-6]],[[3184,7227],[-49,-31],[-12,-10],[-3,-11],[0,-5],[3,-12],[-13,-26],[-44,-53],[-1,-6],[-2,-19],[-2,-4],[-3,-2],[-74,-34],[-8,-5],[-22,-18],[-20,-23],[-15,-12],[-9,-7],[-4,-3],[-2,-3],[1,-3],[-1,-4],[-5,-9],[-34,-44],[-5,-4],[-10,-1],[-8,-2],[-3,-1],[-39,-19],[-7,-2],[-6,0],[-7,2],[-3,1],[-11,7],[-9,8],[-3,4],[-5,10],[-5,15],[-7,9],[-4,4],[-5,3],[-2,2],[-7,3],[-3,1],[-8,2],[-41,7],[-11,4],[-13,5],[-4,1],[-4,1],[-5,0],[-6,-1],[-5,0],[-5,1],[-9,1],[-5,0],[-11,0],[-13,0],[-11,-2],[-6,-2],[-4,-4],[-4,-4],[-5,-3],[-4,-1],[-5,0],[-31,6],[-15,3],[-6,0],[-10,-1],[-5,0],[-40,3],[-13,3],[-7,0],[-8,-1],[-23,-5],[-6,0],[-4,1],[-5,1],[-8,-1],[-6,-2],[-5,-3],[-9,-2],[-5,-3],[-6,-3],[-4,-1],[-4,1],[-3,1],[-2,2],[-4,4],[-3,1],[-3,2],[-4,1],[-8,2],[-7,2],[-33,14],[-3,1],[-5,0],[-5,1],[-5,0],[-25,-3],[-6,-2],[-6,0],[-6,0],[-7,0],[-5,-1],[-3,-1],[-6,-4],[-15,-8],[-6,-2],[-7,-1],[-15,0],[-5,-1],[-4,-1],[-17,-9],[-18,-11]],[[2081,6911],[-4,23],[5,12],[0,3],[-1,3],[-4,4],[-12,9],[-2,3],[2,4],[2,5],[3,11],[0,5],[-1,4],[-1,1],[-3,3],[-6,3],[-3,1],[-5,1],[-10,0],[-6,1],[-6,2],[-8,6],[-3,4],[-20,62],[0,3],[1,6],[1,2],[6,9],[5,4],[2,4],[3,5],[0,11],[-1,6],[-2,4],[-8,2],[-6,3],[-7,7],[-4,8],[-5,25],[0,9],[11,25],[1,3],[1,11],[1,6],[3,5],[2,10],[1,12],[-1,6],[-2,4],[-2,2],[-2,2],[-6,3],[-4,1],[-4,4],[-10,16],[-1,7],[1,4],[3,5],[5,4],[5,2],[2,1],[3,1],[4,0],[9,-1],[4,-1],[10,-1],[5,0],[5,0],[18,3],[5,0],[5,-1],[9,-1],[17,-4],[4,0],[10,0],[15,1],[13,2],[29,9],[9,4],[11,4],[5,1],[3,1],[4,1],[2,1],[3,2],[5,7],[2,2],[3,1],[3,2],[5,0],[4,1],[37,1],[10,1],[3,1],[14,5],[4,3],[5,4],[7,8],[2,5],[1,3],[-2,11],[-2,2],[-4,7],[-1,3],[-1,10],[0,11],[1,5],[2,4],[4,4],[3,1],[3,2],[5,0],[5,3],[4,4],[15,20],[18,13],[4,9],[0,5],[-2,5],[-3,9],[1,9],[2,5],[3,3],[15,4],[5,2],[4,3],[7,7],[3,4],[1,4],[-1,16],[5,10],[15,16]],[[3996,7233],[22,-31],[13,-26],[1,-4],[0,-3],[-2,-6],[-2,-4],[-2,-3],[-8,-8],[-51,-35],[-8,-7],[-4,-7],[-1,-4],[0,-3],[5,-23],[0,-4],[-4,-21],[-5,-6],[0,-2],[3,-3],[82,-12],[7,-2],[28,-10],[12,-3],[14,-5],[19,-9],[4,-2],[-1,-10],[-17,-28]],[[4101,6952],[-10,-1],[-17,2],[-4,0],[-10,-1],[-5,1],[-5,0],[-13,3],[-6,0],[-6,0],[-6,1],[-19,5],[-8,0],[-44,1],[-15,2],[-11,2],[-5,0],[-13,-2],[-12,-3],[-4,-1],[-16,-1],[-4,0],[-4,-1],[-3,-1],[-11,-4],[-4,-1],[-7,0],[-9,2],[-6,0],[-5,-1],[-10,-4],[-4,-1],[-4,0],[-11,1],[-9,0],[-10,-1],[-6,0],[-20,1],[-15,0],[-5,0],[-5,-1],[-18,-2],[-5,0],[-6,0],[-5,1],[-33,7],[-9,1],[-5,1],[-18,-2],[-5,0],[-5,0],[-3,1],[-22,5],[-14,1],[-4,0],[-3,-1],[-4,0],[-8,-2],[-1,-2],[-2,-17],[-16,-2],[-5,0],[-15,0],[-7,1],[-8,3],[-14,7],[-7,2],[-6,0],[-3,-1],[-4,-1],[-4,-1],[-5,0],[-5,2],[-8,3],[-14,7],[-3,1],[-4,1],[-25,6],[-3,2],[-4,4],[-4,6],[-16,13],[-12,15],[-18,30],[-4,9],[-2,3],[-4,4],[-18,12],[-10,10],[-2,4],[1,4],[2,3],[1,4],[-3,3],[-10,6],[-6,3],[-5,3],[-29,9],[-6,3],[-4,6],[-13,30],[-3,13],[3,2],[2,2],[1,2],[-11,31],[-3,3],[-13,12],[-20,8]],[[5348,7516],[-4,-16],[1,-3],[0,-4],[-1,-5],[-16,-16],[-21,-13],[-6,-8]],[[5301,7451],[-10,-1],[-7,-3],[-4,-3],[-3,-2],[-4,-1],[-4,0],[-7,3],[-7,2],[-19,12],[-3,1],[-3,1],[-9,2],[-14,2],[-16,0],[-14,-2],[-14,-1],[-4,-1],[-5,0],[-5,1],[-4,1],[-4,1],[-3,2],[-3,1],[-4,4],[-3,1],[-3,2],[-4,1],[-4,0],[-4,0],[-3,-1],[-10,-5],[-11,-3],[-3,-1],[-3,-2],[-10,-7],[-3,-1],[-3,-1],[-5,-1],[-4,0],[-9,2],[-11,3],[-4,1],[-4,1],[-5,0],[-4,0],[-4,-1],[-3,-2],[-3,-1],[-2,-3],[-1,-4],[1,-7],[2,-4],[2,-3],[5,-3],[1,-3],[-1,-4],[-5,-5],[-5,-2],[-9,-2],[-1,-1],[-2,-4],[-2,-6],[0,-13],[1,-6],[2,-3],[2,-1],[11,-6],[3,-1],[0,-2],[0,-3],[-5,-3],[-4,-2],[-16,-5],[-13,-5],[-14,-5],[-3,-1],[-2,-2],[-2,-2],[0,-4],[5,-9],[0,-4],[0,-3],[-4,-5],[-4,-3],[-5,-4],[-6,-3],[-2,-2],[-6,-7],[-3,-3],[-3,-2],[-11,-3],[-22,-13],[-7,-3],[-5,-3],[-2,-2],[-1,-2],[3,-4],[0,-4],[-1,-3],[-4,-4],[-3,-2],[-4,-2],[-10,-4],[-5,-3],[-2,-3],[-20,-51],[-4,-4],[-5,-4],[-5,-3],[-2,-2],[-1,-2],[3,-3],[2,-2],[3,-2],[4,-2],[8,-2],[2,-2],[-1,-4],[-4,-6],[-4,-3],[-3,-2],[-6,-3],[-3,-2],[-5,-4],[-1,-2],[0,-4],[2,-6],[0,-7],[-26,-68],[0,-6],[6,-35],[5,-11],[6,-8],[4,-4],[2,-1],[4,-2],[3,-1],[4,-1],[9,-1],[10,-1],[10,-1],[4,-1],[3,-1],[3,-2],[0,-3],[-1,-4],[-12,-14],[-10,-24],[-5,-6],[-3,-3],[-7,-3],[-6,-3],[-10,-4],[-6,-3],[-5,-3],[-2,-2],[-2,-3],[-1,-7],[4,-59],[1,-4],[2,-2],[1,-2],[2,-2],[27,-13],[4,-1],[4,-1],[15,0],[5,0],[5,-1],[3,-1],[3,-1],[3,-2],[2,-2],[1,-3],[2,-2],[-2,-5],[-2,-8],[-19,-30],[-9,-24],[-5,-29],[0,-5],[4,-10],[2,-11],[4,-12],[2,-27],[-3,-16],[0,-15],[-3,-6],[-34,-39],[-11,-8],[-39,-23]],[[4758,6528],[-45,20],[-10,8],[-2,9],[-1,5],[-3,6],[-10,11],[-6,4],[-6,2],[-12,1],[-31,3],[-4,0],[-4,0],[-30,-6],[-13,-2],[-16,0],[-15,2],[-7,2],[-6,2],[-28,13],[-7,3],[-6,1],[-9,0],[-17,-1],[-9,0],[-6,1],[-4,1],[-5,4],[-10,7],[-58,23],[-10,2],[-4,1],[-22,0],[-33,-3],[-53,-8],[-5,-1],[-5,0],[-5,1],[-53,9],[-106,12]],[[4082,6660],[9,12],[9,5],[20,4],[4,1],[3,1],[3,1],[12,7],[2,2],[4,3],[2,3],[5,13],[3,9],[1,3],[3,2],[30,18],[2,2],[0,4],[-2,4],[-12,13],[-1,4],[3,4],[8,6],[1,2],[0,3],[-2,4],[-13,15],[-12,20],[-14,41],[-3,19],[2,3],[3,7],[1,6],[0,5],[-2,4],[-5,4],[-11,6],[-7,2],[-6,2],[-13,2],[-3,3],[-2,3],[-3,20]],[[4475,7611],[40,1],[2,2],[5,3],[1,2],[2,2],[3,1],[8,2],[4,1],[3,2],[1,2],[0,2],[-1,11],[0,3],[2,5],[5,7],[4,11],[0,2],[-1,2],[-1,1],[-6,8],[-1,3],[0,3],[0,2],[3,6],[2,1],[3,2],[4,1],[5,1],[5,0],[8,0],[10,0],[9,2],[3,1],[3,2],[5,3],[1,2],[8,7],[9,6],[2,2],[3,5],[2,5],[0,2],[-2,5],[0,3],[1,2],[3,2],[3,1],[13,2],[32,-6],[45,-12],[37,-6],[5,-2],[5,-5],[5,-2],[5,-1],[7,1],[14,3],[8,2],[10,0],[5,0],[5,0],[20,-3],[10,0],[4,1],[4,1],[2,1],[4,1],[6,0],[8,-1],[12,-4],[8,-1],[6,0],[4,1],[19,6],[4,0],[8,0],[10,-3],[35,-12],[6,-1],[17,-3],[5,-2],[3,-2],[22,-28],[2,-1],[15,-4],[7,-1],[7,0],[10,1],[8,1],[5,1],[16,4],[3,1],[3,1],[3,2],[2,2],[2,2],[3,5],[3,4],[10,7],[3,2],[4,1],[7,2],[4,1],[5,-1],[6,-2],[7,-15],[35,-41],[5,-3],[22,-13],[4,-3],[6,-8],[5,-11],[2,-10],[-5,-38],[0,-2],[10,-13],[1,-4],[0,-3],[-6,-10],[-1,-5],[1,-3],[1,-3],[2,-2],[4,-3],[4,-1],[5,-1],[18,1],[52,4]],[[2861,6298],[86,-7],[89,-20],[92,-4],[13,-2],[9,-2],[5,0],[12,1],[17,2],[40,7],[14,5],[7,4],[-1,2],[-3,7],[-1,3],[1,2],[2,2],[2,1],[4,0],[5,0],[23,-5],[8,-1],[30,-2],[10,-2],[6,-1],[23,-13],[6,-2],[19,2],[67,19]],[[3446,6294],[-6,-8],[-2,-2],[-3,-3],[-8,-5],[-2,-2],[-1,-2],[2,-4],[6,-5],[6,-2],[5,0],[16,2],[3,-4],[2,-8],[-4,-30],[-2,-5],[-11,-8],[-1,-2],[1,-4],[2,-3],[22,-17]],[[3471,6182],[-15,-8],[-5,-3],[-4,-5],[-1,-2],[-2,-6],[3,-11],[8,-14],[1,-4],[0,-4],[-2,-6],[-2,-3],[-1,-4],[1,-4],[8,-12],[2,-5],[-2,-7],[-2,-4],[-2,-3],[-2,-2],[-2,-2],[-13,-8],[-1,-3],[1,-3],[8,-4],[3,-4],[2,-3],[-2,-3],[-3,-3],[-4,-1],[-4,-2],[-6,-2],[-3,-2],[-2,-2],[0,-4],[3,-5],[11,-16],[3,-6],[4,-4],[3,-3],[18,-11],[13,-5],[14,-2]],[[3497,5977],[3,-21],[2,-7],[14,-14],[8,-5],[4,-5],[3,-4],[-1,-13],[-8,-38],[-25,-52],[1,-16],[-8,-9],[-33,-24]],[[3457,5769],[-55,-14],[-5,-2],[-3,-1],[-3,-2],[-2,-2],[-2,-2],[-5,-2],[-8,0],[-15,0],[-13,2],[-128,-2],[-6,1],[-18,2],[-16,1],[-4,-1],[-8,-2],[-63,-22],[-58,-30],[-18,-2],[-63,0]],[[2323,6324],[12,16],[2,10],[5,9],[20,11],[4,1],[4,1],[6,1],[4,-1],[4,-1],[19,-11],[5,-2],[5,-1],[19,-3],[8,-2],[13,-2],[13,0],[7,-1],[4,-2],[2,-2],[2,-2],[9,-18],[119,-14],[13,-5],[14,-5],[4,-1],[22,-4],[4,-1],[62,-9],[14,1],[8,1],[0,6],[-2,7],[-6,10],[0,2],[0,1],[4,1],[17,4],[8,0],[6,0],[16,-3],[44,-13],[24,-5]],[[2081,6911],[6,-18],[0,-3],[2,-5],[3,-3],[14,-7],[15,-5],[7,-3],[2,-2],[3,-6],[-1,-15]],[[2132,6844],[0,-17],[1,-8],[3,-4],[1,-3],[-2,-3],[-6,-6],[-4,-6],[-7,-12],[-3,-8],[-3,-19],[1,-3],[-1,-4],[-2,-4],[-8,-9],[-9,-7],[-3,-1],[-3,-3],[-9,-13],[-5,-4],[-4,-2],[-16,-4],[-12,-6],[-3,-3],[-2,-4],[2,-19],[1,-2],[2,-2],[2,-1],[3,-2],[15,-5],[2,-1],[2,-2],[1,-3],[0,-3],[-3,-4],[-7,-8],[-4,-7],[-4,-29],[1,-2],[2,-2],[3,-4],[1,-3],[-1,-3],[-3,-4],[-8,-6],[-5,-4],[-3,-4],[-2,-7],[-18,-31],[-4,-13],[1,-5],[-2,-5],[-5,-6],[-12,-12],[-11,-10],[-19,-9]],[[1437,6780],[-5,25],[4,15],[37,68],[3,13],[-9,28],[-1,16],[15,26],[4,12],[-8,14],[-33,25],[-4,9],[11,5],[14,-1],[15,-3],[12,-2],[16,0],[10,1],[9,2],[14,6],[16,14],[8,13],[10,11],[25,7],[21,1],[74,-6],[14,-3],[7,-5],[9,-3],[18,1],[11,5],[28,17],[6,6],[-1,15],[2,15],[8,13],[15,12],[34,22],[6,10],[6,31],[12,29],[-1,13],[-21,16],[-28,10],[-22,12],[-5,23],[-25,-11],[-10,-11],[-10,-28],[-16,-16],[-73,-31],[-36,-30],[-19,-7],[-24,8],[-7,11],[-18,48],[-15,20],[-2,7],[12,14],[2,7],[-10,13],[-73,53],[-8,7],[0,7],[4,7],[0,6],[-2,6],[-5,7],[-17,13],[-42,15],[-17,13],[-9,18],[-6,8],[-35,15],[-3,12],[10,13],[14,11],[18,3],[19,7],[15,8],[4,7],[-9,6],[-12,2],[-11,4],[-5,8],[3,10],[9,3],[14,-2],[15,-6],[-10,19],[-8,9],[-11,5],[-19,4],[-4,10],[-1,12],[-7,8],[-13,9],[-20,22],[-13,11],[-22,12],[-22,7],[-24,4],[-59,1],[-21,3],[-17,9],[-16,15],[5,2],[6,6],[-1,6],[-31,0],[-3,5],[6,8],[10,6],[-28,10],[-42,33],[-23,10],[-19,6],[-103,53],[-10,7],[-3,8],[5,15],[1,8],[-8,10],[-14,4],[-18,4],[-16,4],[-16,9],[-8,10],[-13,19],[-26,22],[-6,10],[-10,7],[-13,4],[-29,7],[-17,7],[-31,15]],[[3260,6607],[0,-12],[-2,-1],[-5,0],[-12,1],[-5,0],[-4,-1],[-3,-1],[-2,-2],[0,-4],[2,-2],[2,-2],[2,-1],[18,-7],[5,-3],[6,-4],[13,-12],[2,-2],[0,-2],[0,-14],[-4,-7],[-11,-13],[1,-11],[18,0],[-20,-5],[-5,0],[-4,1],[-2,1],[-3,5],[-1,2],[-3,2],[-2,1],[-6,1],[-25,5],[-19,2],[-5,0],[-11,0],[-14,-1],[-5,0],[-14,1],[-10,1],[-21,-1],[-28,-2],[-18,-3],[-5,-1],[-4,0],[-5,1],[-3,1],[-11,7],[-4,1],[-4,1],[-4,1],[-80,6],[-22,1],[-4,0],[-12,3],[-4,0],[-4,-1],[-5,-2],[-5,-3],[-4,-2],[-4,-1],[-16,-4],[-3,-2],[-3,-1],[-3,-3],[-4,-4],[-1,-4],[0,-4],[4,-7],[10,-10],[2,-4],[3,-17],[3,-10],[8,-5],[3,-4],[3,-5],[1,-2],[7,-9],[51,-43],[12,-6],[3,-1],[0,-3],[-2,-4],[-10,-7],[-3,-6],[-4,-5],[-5,-3],[-21,-7],[-3,-1],[-15,-8],[-5,-2],[-4,-1],[-10,-2],[-4,0],[-3,-2],[-12,-10],[-2,-3],[0,-3],[5,-5],[3,-6],[-5,-8]],[[2132,6844],[20,-1],[29,3],[10,-1],[12,-3],[26,-8],[20,-9],[7,-3],[3,-1],[3,-2],[5,-6],[5,-4],[6,-2],[32,-9],[12,-6],[94,-23],[11,-4],[9,-16],[3,-2],[2,-2],[4,-1],[4,-2],[37,-9],[15,-5],[22,-10],[11,-4],[16,-9],[5,-1],[8,-1],[13,0],[11,-1],[15,0],[4,1],[8,1],[18,7],[18,5],[7,3],[5,3],[14,11],[10,7],[3,1],[3,2],[8,2],[23,3],[15,4],[7,2],[29,15],[7,3],[3,1],[40,9],[5,0],[5,0],[9,-1],[5,0],[14,2],[8,-2],[10,-5],[30,-17],[10,-4],[27,-6],[13,-3],[9,-1],[5,0],[4,1],[4,1],[9,4],[4,1],[9,1],[9,0],[3,-1],[4,-1],[5,-9],[10,-36],[3,-3],[29,-21],[12,-6],[8,-3],[27,-6],[4,0],[4,0],[6,3],[3,0],[4,1],[6,0],[7,-2],[10,-3],[89,-41],[13,-18]],[[3766,6138],[12,-11],[11,-6],[23,-9]],[[3812,6112],[-2,-9],[3,-7],[-4,-20],[-16,-36],[-5,-4],[-4,-4],[1,-3],[1,-2],[2,-2],[2,-3],[1,-5],[4,-49],[-3,-11],[-28,-10],[-5,-1],[-4,0],[-12,3],[-12,2],[-3,0],[-4,0],[-13,-2],[-4,1],[-3,1],[-2,2],[0,3],[0,17],[1,3],[-1,5],[0,3],[-1,3],[-1,1],[-1,1],[-2,2],[-4,1],[-3,1],[-20,-1],[-7,-1],[-20,-7],[-5,0],[-10,0],[-9,0],[-18,-3],[-10,0],[-38,4],[-6,-1],[-16,-4],[-4,-1],[-13,1],[-17,-3]],[[3471,6182],[43,5],[14,-1],[5,-2],[5,-1],[10,-3],[9,0],[5,0],[28,5],[8,0],[4,-1],[3,-2],[4,-3],[5,-7],[4,-2],[6,-2],[10,-2],[6,-2],[10,-5],[10,-4],[7,0],[8,0],[10,1],[4,0],[4,0],[1,-1],[2,-1],[2,-2],[4,-5],[5,-4],[4,-1],[55,-4]],[[3564,6437],[-12,-2],[-4,-2],[-2,-2],[1,-14],[0,-3],[-3,-3],[-3,-3],[-4,-2],[-18,-6],[20,-27],[4,1],[9,2],[4,1],[-7,-12],[-7,-2],[-17,-2],[-4,-3],[-3,-3],[-5,-9],[0,-4],[4,-2],[14,-1],[9,-2],[4,-1],[3,-1],[6,-3],[3,-2],[2,-2],[1,-1],[1,-3],[-1,0],[-3,-4],[-24,-19],[-12,-6],[-7,-2],[-16,-2],[-51,3]],[[3260,6607],[33,0],[10,1],[18,-1],[12,2],[14,-6],[47,-27],[11,-3],[4,-1],[14,-2],[5,-1],[8,-2],[3,-1],[6,-3],[24,-13],[38,-31],[57,-82]],[[4758,6528],[0,-12],[-3,-6],[-19,-17],[-5,-7],[1,-17],[2,-11],[-4,-55],[1,-12],[3,-8],[4,-1],[5,0],[5,0],[5,0],[9,1],[5,0],[4,-1],[4,-1],[27,-10],[17,-3],[9,-1],[6,0],[9,0],[5,0],[3,0],[3,-2],[7,-4],[11,-10],[5,-6],[3,-8],[4,-8],[53,-58],[4,-5],[1,-5],[1,-21],[-2,-3],[-1,-3],[-3,-2],[-3,-1],[-3,-2],[-7,-2],[-8,-2],[-31,-11],[-8,-2],[-8,-1],[-4,-2],[-3,-1],[-8,-5],[-4,-1],[-31,-7],[-3,-1],[-3,-2],[-3,-3],[-3,-4],[-3,-9],[-3,-4],[-3,-3],[-2,-2],[-3,-1],[-4,-1],[-16,-4],[-3,-1],[-3,-2],[-6,-3],[-3,-2],[-3,-1],[-3,-1],[-9,-1],[-3,-1],[-2,-2],[-4,-4],[-3,-1],[-4,0],[-4,0],[-8,2],[-23,4],[-15,1],[-4,0],[-3,1],[-10,5],[-1,0],[-7,2],[-13,2],[-11,0]],[[4628,6159],[1,4],[-2,5],[-6,9],[-5,3],[-5,4],[-7,2],[-7,2],[-10,1],[-4,1],[-4,1],[-3,2],[-3,1],[-2,2],[-11,16],[-2,2],[-3,1],[-3,2],[-4,1],[-51,7],[-9,0],[-45,-8],[-30,-8],[-29,-11],[-4,-3],[-1,-3],[2,-3],[1,-5],[-1,-2],[-1,-2],[-2,-2],[-23,-16],[-14,-7],[-14,-1],[-20,0],[-12,1],[-4,5],[-2,1],[-11,7],[-4,1],[-4,1],[-9,1],[-4,1],[-4,1],[-3,1],[-3,2],[-2,2],[-2,2],[-3,8],[0,2],[1,11],[1,4],[0,2],[0,3],[-1,2],[-2,3],[-4,3],[-3,2],[-2,2],[-20,8],[-2,2],[-1,2],[0,2],[2,4],[-1,2],[-2,2],[-4,1],[-5,0],[-7,0],[-10,-2],[-13,-4],[-4,-1],[-4,0],[-16,0],[-4,-1],[-3,-1],[-3,-3],[-2,-4],[-1,-7],[-2,-2],[-4,-2],[-8,-2],[-6,0],[-5,-1],[-3,-2],[0,-3],[1,-2],[0,-3],[-3,-4],[-24,-19],[-9,-10],[-9,-8],[-5,-3],[-9,-4],[-36,-11],[-13,-3],[-39,-15],[-20,-5],[-10,-7],[-19,-24]],[[3907,6092],[-38,4],[-7,2],[-8,4],[-4,2],[-6,2],[-18,1],[-14,5]],[[3766,6138],[16,14],[3,4],[-3,4],[-2,1],[-5,13],[-10,39],[-2,3],[-1,2],[-3,2],[-2,2],[-7,4],[-4,2],[-6,2],[-4,4],[-6,8],[-15,27],[-2,5],[2,3],[5,3],[16,10],[5,6],[4,7],[0,5],[0,3],[-3,4],[-11,31],[-2,1],[-12,7],[0,4],[0,2],[8,5]],[[3725,6365],[12,14],[20,11],[4,2],[3,2],[4,4],[13,17],[0,3],[-1,14],[0,2],[2,3],[3,2],[4,3],[16,5],[9,3],[4,1],[6,3],[3,2],[2,3],[3,8],[0,4],[2,5],[1,3],[8,6],[10,6],[11,10],[8,5],[11,5],[15,4],[4,2],[5,2],[28,20],[133,67],[13,8],[6,5],[7,7],[1,2],[-1,9],[-12,23]],[[4889,5936],[7,-4],[5,-4],[8,-10],[5,-4],[2,-2],[7,-3],[3,-1],[9,-2],[17,-3],[13,-2],[6,-3],[3,-1],[3,-2],[2,-2],[2,-2],[4,-7],[2,-2],[3,-1],[3,-1],[4,-2],[2,-2],[2,-4],[2,-3],[11,-8],[2,-3],[1,-2],[-1,-12],[-1,-2],[-3,-5],[-3,-2],[-5,-3],[-10,-2],[-7,0],[-11,0],[-5,0],[-4,-1],[-32,-7],[-10,-1],[-5,0],[-5,1],[-10,1],[-11,3],[-13,5],[-3,1],[-4,-2],[-3,-5],[-1,-6],[0,-10],[0,-3],[-3,-5],[-4,-3],[-6,-3],[-84,-33],[-5,-4],[-4,-3],[-6,-8],[-1,-4],[1,-4],[3,-4],[10,-7],[2,-2],[0,-2],[0,-3],[0,-2],[1,-2],[13,-12],[1,-2],[1,-2],[1,-3],[-1,-2],[0,-2],[-2,-1],[-4,-2],[-6,-2],[-30,-5],[-5,0],[-3,0],[-4,2],[-3,1],[-3,1],[-5,1],[-4,1],[-5,0],[-15,-2],[-13,-2],[-8,-1],[-10,1],[-6,-2],[-7,-3],[-13,-10],[-11,-6],[-18,-8],[-15,-4],[-20,-4],[-18,-2],[-2,-2],[-1,-2],[7,-15]],[[4565,5628],[-90,4],[-146,-4],[-32,-5],[-15,-4]],[[4282,5619],[11,44],[-3,131]],[[4290,5794],[40,24],[1,2],[3,4],[2,2],[1,3],[-5,14],[0,3],[2,3],[5,2],[12,1],[7,0],[6,-1],[3,-1],[2,-2],[2,-2],[2,-2],[4,-1],[4,0],[7,2],[9,4],[11,3],[19,9],[13,9],[4,4],[0,3],[-2,2],[-1,3],[0,2],[3,3],[5,4],[11,8],[3,4],[1,3],[-1,2],[0,3],[0,5],[0,5],[1,3],[3,1],[6,-2],[3,-1],[3,-2],[9,-8],[6,-3],[3,-1],[5,-1],[5,0],[31,1],[4,-1],[5,-1],[26,-10],[3,-1],[3,-2],[2,-2],[4,-4],[2,-2],[3,-1],[5,-1],[6,1],[7,1],[5,1],[5,3],[13,7],[5,2],[5,2],[3,1],[1,3],[-3,7],[1,5],[11,17],[7,5],[6,4],[3,4],[4,15],[3,5],[9,3],[2,4]],[[4688,5973],[22,-3],[3,1],[2,2],[2,4],[2,4],[8,6],[6,1],[4,1],[1,-2],[1,0],[9,-3],[13,-1],[7,-2],[5,-1],[3,-5],[3,-1],[5,-3],[105,-35]],[[5664,5774],[-9,-37],[-8,-5],[-13,-6],[-14,-6],[-19,-10],[-12,-16],[-13,-7],[-14,-3],[-14,1],[-16,-1],[-15,-2],[-22,-9],[-7,-9],[0,-12],[6,-16],[-1,-10],[-16,-8],[-15,-5],[-19,-9],[-6,-10],[-1,-9],[2,-8],[-1,-11],[-3,-9],[-8,-9],[1,-9],[9,-6],[34,-5],[12,-3],[6,-5],[-1,-14],[2,-13],[-3,-9],[-12,-9],[-23,-13]],[[5451,5462],[-19,0],[-29,-4],[-5,0],[-4,0],[-7,1],[-6,2],[-10,5],[-5,3],[-4,3],[-15,22],[-2,2],[-2,1],[-7,3],[-7,3],[-15,10],[-3,1],[-5,1],[-6,0],[-10,0],[-43,-6],[-4,-1],[-4,-1],[-2,-2],[-1,-3],[-1,-14],[-1,-1],[-4,-2],[-3,-1],[-14,-2],[-5,0],[-20,3],[-39,8],[-30,8],[-13,1],[-6,0],[-4,-1],[-2,-2],[-4,-4],[-6,-10],[-2,-2],[-2,-2],[-1,0],[-1,-1],[-1,0],[-3,1],[-4,1],[-4,3],[-3,3],[-4,4],[-2,2],[-235,61],[-9,1],[-4,-1],[-4,-1],[-5,0],[-6,0],[-10,2],[-13,0],[-9,1],[-14,2],[-35,3],[-5,0],[-3,-1],[-8,-3],[-3,0],[-7,0],[-8,1],[-15,5],[-8,1],[-6,0],[-18,-3],[-19,-5],[-6,-2],[-6,-3],[-7,-3],[-3,-1],[-4,0],[-4,0],[-4,0],[-1,1],[2,4],[1,3],[-4,3],[-3,1],[-4,2],[-2,2],[0,2],[5,10],[2,2],[2,2],[1,1],[6,16],[-1,8],[-18,23]],[[4889,5936],[35,1],[4,1],[5,2],[3,4],[5,4],[18,8],[9,3],[9,1],[5,0],[5,-1],[3,-1],[3,-2],[9,-7],[3,-2],[7,-2],[7,-3],[9,-2],[20,-3],[8,0],[54,6],[18,-1],[14,-1],[11,-3],[4,-1],[9,-8],[17,-5],[4,-2],[9,-7],[2,-2],[52,-22],[5,-3],[25,-17],[9,-4],[9,-4],[5,0],[4,0],[3,2],[1,3],[1,2],[-1,8],[1,3],[2,1],[3,2],[14,0],[5,1],[4,1],[4,1],[3,2],[4,1],[7,1],[13,1],[13,-2],[9,0],[5,0],[11,3],[26,1],[4,1],[4,1],[4,1],[2,2],[3,2],[5,6],[2,3],[3,2],[6,3],[4,0],[4,-1],[3,-1],[6,-3],[14,-11],[3,-2],[4,-2],[7,-2],[5,-1],[4,1],[4,1],[3,1],[8,6],[4,1],[8,3],[5,0],[4,-1],[17,-6],[4,-2],[2,-1],[2,-3],[1,-5],[-1,-3],[-2,-2],[-1,-2],[-21,-20],[-14,-8],[-5,-4],[-1,-2],[-1,-2],[0,-3],[0,-2],[2,-2],[8,-6],[2,-1],[2,-3],[2,-5],[1,-2],[3,-1],[3,-1],[4,-2],[11,-6],[19,-8],[21,-7],[13,-6],[14,-4],[21,-11]],[[3725,6365],[-74,16],[-20,7],[-16,16],[-1,3],[-1,2],[1,2],[1,2],[2,2],[1,2],[-1,3],[-7,8],[-4,3],[-5,1],[-17,2],[-20,3]],[[3907,6092],[-23,-35],[-1,-10],[2,-2],[13,-5],[3,-2],[2,-3],[3,-6],[1,-2],[3,-2],[3,-2],[5,-2],[4,-1],[3,-1],[8,-1],[10,0],[20,1],[10,1],[9,1],[27,7],[11,3],[8,2],[9,0],[5,1],[19,-1],[25,0],[8,0],[15,-2],[6,-1],[4,-2],[1,-3],[1,-5],[-2,-11],[-1,-2],[-1,-3],[-3,-1],[-3,-1],[-8,-2],[-2,-3],[1,-4],[12,-13],[2,-4],[-1,-2],[-9,-23],[0,-2],[1,-5],[3,-6],[0,-10],[2,-3],[2,-2],[23,-10],[5,-4],[3,-3],[0,-3],[0,-3],[-2,-8],[-2,-5],[-10,-14],[-1,-4],[2,-2],[4,-1],[4,0],[11,0],[9,0],[5,0],[4,-1],[7,-3],[3,-3],[2,-3],[-1,-15],[2,-13],[0,-16]],[[4182,5812],[-200,-51],[-7,-3],[-24,-12],[-15,-10],[-7,-2],[-11,-2],[-59,-7],[-5,1],[-5,0],[-8,3],[-10,3],[-4,0],[-6,0],[-26,-7],[-6,-1],[-6,0],[-39,2],[-131,0]],[[3613,5726],[-12,8],[-8,3],[-30,4],[-7,0],[-5,-1],[-14,-8],[-5,-4]],[[3532,5728],[0,27],[-3,3],[-5,4],[-20,3],[-33,2],[-14,2]],[[4282,5619],[-1,-4]],[[4281,5615],[-23,-3],[-28,-1],[-31,-5],[-191,-12],[-18,1],[-94,15],[-41,4]],[[3855,5614],[-54,-1],[-15,2],[-10,4],[-14,4],[-79,17],[-14,2],[-12,0],[-8,1],[-21,6],[-3,2],[-24,28],[-2,4],[-3,7],[0,5],[1,5],[1,5],[9,8],[4,7],[2,6]],[[4182,5812],[52,13],[6,1],[7,-1],[23,-10],[20,-21]],[[4628,6159],[17,-117],[-14,-11],[-5,-7],[-4,-6],[-1,-3],[1,-3],[3,-2],[6,-3],[14,-4],[3,-2],[2,-2],[8,-8],[4,-3],[8,-5],[18,-10]],[[4221,5441],[-22,-1],[-11,1],[-11,3],[-5,1],[-9,1],[-9,1],[-3,1],[-10,4],[-9,2],[-9,1],[-21,1],[-36,-2],[-16,0],[-5,0],[-5,-2],[-5,-5],[-4,-7],[-1,-2],[-11,-16],[-2,-2],[-3,-2],[-5,-2],[-11,-1],[-7,0],[-70,2],[-4,1],[-5,1],[-16,5],[7,7],[2,2],[2,2],[3,2],[1,4],[-2,4],[-6,1],[-5,2],[-3,2],[-5,3],[-11,-1],[-12,-3],[-5,-4],[-10,-11],[-13,0],[-9,-5],[-10,-6],[-3,-1],[-5,-1],[-11,3],[-4,1],[-3,-1],[-2,-1],[-1,-2],[3,-10],[0,-5],[-5,-22],[-3,-5],[-6,-4],[-9,-4],[-8,-1],[-14,-2],[-4,-12],[9,-47]],[[3754,5309],[-45,-5],[-35,1]],[[3674,5305],[3,4],[4,3],[3,1],[1,2],[2,2],[0,3],[-8,32],[-19,35],[-6,6],[-14,9],[-5,1],[-4,1],[-4,1],[-10,1],[-6,6],[-3,6],[-17,49]],[[3591,5467],[-6,14],[2,8],[6,7],[2,17]],[[3595,5513],[116,1],[46,-3],[9,0],[5,0],[8,2],[4,2],[2,2],[1,5],[1,4],[3,4],[23,12],[7,5],[35,67]],[[4281,5615],[-10,-69],[3,-4],[3,-3],[14,-5],[5,-2],[5,-3],[3,-3],[0,-3],[-3,-4],[-27,-15],[-7,-5],[-43,-40],[-10,-6],[-1,-4],[8,-8]],[[3595,5513],[-23,27],[-12,18],[-7,8],[-11,10],[-2,2],[-2,4],[-2,19],[5,18],[5,9],[0,4],[-1,4],[-4,6],[-3,4],[-3,2],[-3,2],[-3,2],[-2,1],[-8,5],[-4,4],[-6,7],[-1,5],[2,5],[13,15],[4,6],[1,3],[4,25]],[[3591,5467],[-6,-4],[-6,-2],[-57,-11],[-3,-1],[0,-1],[2,-5],[0,-2],[-2,-2],[-2,-1],[-3,-1],[-3,-2],[-1,-1],[-1,-2],[1,-3],[3,-3],[0,-2],[-3,-2],[-7,-1],[-40,-2],[-5,-1],[-5,0],[-5,0],[-10,3],[-9,4],[-9,5],[-11,1],[-84,1],[-39,4]],[[3286,5436],[-9,5],[-16,2],[-16,0],[-6,2],[-3,2],[1,3],[2,5],[0,3],[-1,3],[-4,4],[-7,7],[-6,2],[-4,1],[-7,-3],[-27,-13],[-5,-1],[-5,-1],[-10,-1],[-6,1],[-6,2],[-8,4],[-10,9],[-3,3],[-2,2],[1,3],[6,9],[2,5],[0,3],[0,2],[-2,6],[-2,4],[-1,2],[0,3],[4,9],[7,10],[1,3],[0,8],[-1,3],[-1,3],[-6,7],[-4,11],[-1,2],[1,10],[0,5],[-4,7],[-3,4],[-4,3],[-9,4],[-4,1],[-9,2],[-41,5],[-12,1]],[[3021,5196],[6,-14],[-7,-21],[0,-5],[3,-3],[3,-1],[4,-2],[5,-6],[3,-3],[6,-2],[11,-3],[5,-1],[4,1],[2,1],[0,3],[-1,1],[0,3],[1,2],[4,3],[2,3],[1,5],[2,2],[3,1],[4,1],[18,-2],[5,0],[4,0],[3,2],[3,1],[5,4],[3,2],[3,1],[13,2],[5,0]],[[3144,5171],[7,-22],[38,-28],[70,-32],[4,-3],[8,-4],[9,-5],[4,-6],[1,-6],[12,-26],[20,-26],[-3,-12],[-11,-11],[-40,-29],[-8,-10],[-12,-21],[-17,-49],[-6,-10],[-44,-38],[-16,-27],[-11,-27],[-6,-29],[1,-21]],[[3144,4729],[-42,-6],[-8,0],[-26,0],[-15,-1],[-72,1],[-11,-3],[-6,-1],[-4,-2],[-3,-2],[-53,-23],[-4,-1],[-7,0],[-9,0],[-36,3],[-7,-1],[-43,-5],[-5,-1],[-6,-3],[-7,-2],[-8,-2],[-16,-3],[-4,-1],[-3,-2],[-5,-4],[-2,-1],[-3,-2],[-7,0],[-9,1],[-19,4],[-7,3],[-5,2],[-4,4],[-2,2],[-3,1],[-4,1],[-4,1],[-67,9],[-27,1],[-23,-1],[-46,-8],[-38,-5]],[[2474,4682],[-2,6],[-11,9],[-60,19],[-13,5],[-12,7],[-8,7],[-9,5],[-28,5],[-11,4],[-4,5],[-3,14],[-5,6],[-13,4],[-28,3],[-10,3],[-13,11],[-1,12],[2,13],[-5,14],[-9,8],[-24,12],[-10,8],[-4,6],[-4,21],[-16,21],[-2,6],[1,9],[4,6],[7,6],[5,8],[-3,13],[-17,13],[-22,11],[-21,7],[-27,11],[-5,14],[6,15],[11,16],[3,17],[-4,15],[0,13],[15,11],[23,5],[47,3],[17,8]],[[2211,5117],[20,-5],[47,-12],[15,-7],[2,-2],[10,-13],[6,-5],[6,-2],[5,0],[5,0],[4,1],[4,1],[34,12],[3,1],[2,2],[2,2],[1,3],[-1,2],[-2,8],[0,3],[0,3],[2,2],[1,3],[3,1],[9,4],[3,2],[3,2],[4,2],[5,3],[5,0],[4,0],[13,-3],[4,-1],[8,-4],[3,-2],[3,-1],[4,-1],[19,-2],[4,-1],[6,-3],[3,-1],[3,-2],[4,-2],[12,-2],[5,0],[27,-6],[7,-1],[5,0],[8,3],[12,3],[5,-1],[4,-1],[4,-2],[6,-2],[6,-1],[6,0],[3,1],[4,2],[2,1],[2,2],[3,2],[4,2],[7,2],[6,1],[64,-4],[64,5],[7,1],[16,4],[6,3],[3,1],[2,2],[2,2],[1,3],[1,5],[-1,23],[1,3],[1,2],[2,2],[2,2],[10,4],[3,1],[13,12],[3,1],[2,2],[7,3],[65,13],[9,1],[11,0],[24,-3],[78,0]],[[2156,3651],[13,6],[8,6],[11,14],[9,6],[12,4],[26,5],[8,5],[36,61],[16,15],[39,26],[14,15],[19,27],[12,10],[46,28],[8,11],[1,12],[7,16],[11,11],[35,20],[15,11],[11,13],[5,11],[-3,28],[2,16],[11,11],[20,7],[27,3],[51,1],[14,7],[77,57],[11,16],[17,45],[-2,6],[-21,4],[-23,8],[-22,10],[-14,11],[-9,14],[4,14],[18,28],[2,13],[-9,12],[-16,8],[-23,4],[-19,10],[4,19],[19,31],[2,8],[5,7],[3,6],[-5,6],[-11,3],[-12,0],[-68,-13],[-17,3],[-4,12],[6,6],[12,5],[10,6],[2,10],[-4,7],[-13,13],[-5,7],[-1,7],[3,12],[-3,8],[-9,7],[-18,12],[-7,9],[-4,13],[-3,37],[-8,15],[-27,27],[-6,14],[3,7],[13,14],[5,7],[4,15],[0,15],[-3,10]],[[3144,4729],[0,-8],[20,-43],[4,-14],[-5,-43],[5,-15],[36,-48],[2,-10],[-11,-10],[-26,-50],[1,-6],[11,-8],[12,-6],[9,-6],[6,-7],[4,-14],[3,-5],[0,-7],[-5,-8],[-7,-4],[-19,-8],[-8,-6],[-7,-25],[-5,-6],[-27,-24],[-120,-70],[-29,-30],[-10,-31],[16,-23],[-3,-4],[-17,-1],[-9,-3],[-3,-5],[0,-8],[9,-25],[-3,-4],[-4,-5],[-1,-6],[8,-8],[-45,-3],[-34,-19],[-98,-89],[-6,-7],[-5,-11],[-24,-18],[-5,-13],[-2,-15],[-4,-15],[-8,-13],[-31,-38],[-3,-7],[-5,-7],[-24,-13],[-5,-7],[-4,-39],[4,-14],[20,-28],[0,-13],[-20,-11],[-9,14],[-19,-1],[-21,-8],[-16,-9],[-9,-7],[-8,-9],[-6,-11],[-3,-12],[5,-15],[17,-24],[4,-12],[-3,-14],[-11,-15]],[[3286,5436],[-3,-27],[0,-4],[-1,-6],[-6,-4],[-4,-2],[-11,-5],[-5,-3],[-2,-2],[-4,-5],[-5,-16],[-1,-18],[-6,-12],[-1,-17]],[[3237,5315],[-15,0],[-14,1],[-5,0],[-15,-5],[-23,-5],[-5,0],[-4,1],[-10,3],[-8,2],[-23,3],[-3,1],[-7,3],[-3,0],[-4,0],[-2,0],[-3,-1],[-3,-2],[-4,-3],[-3,-7],[-5,-5],[-3,-4],[-3,-2],[-9,-10],[-1,-4],[-1,-4],[2,-16],[-2,-4],[-4,-4],[-9,-9],[-10,-13],[-17,-35]],[[2211,5117],[1,0],[3,12],[-5,14],[-15,25],[-1,9],[5,7],[7,5],[5,7],[0,7],[-4,13],[7,34],[-1,13],[-44,104],[-3,57],[4,15],[0,18],[-7,6]],[[4221,5441],[81,-16],[22,-7],[2,-2],[3,-7],[3,-5],[0,-3],[-1,-2],[-19,-11],[-3,-2],[-8,-8],[-3,-2],[-3,-1],[-10,-1],[-4,0],[-3,-3],[-1,-4],[0,-8],[-1,-3],[-1,-3],[-3,-1],[-3,-2],[-3,-1],[-5,0],[-4,0],[-4,0],[-4,-1],[-3,-1],[-2,-2],[-3,-5],[-1,-2],[-5,-4],[-2,-3],[-1,-4],[-4,-15],[-1,-1],[-1,-1],[-2,-1],[-6,-2],[-7,-4],[-7,-6]],[[4204,5297],[-32,5],[-52,4],[-26,6],[-84,6],[-36,7],[-48,19],[-22,4],[-3,6],[3,6],[6,7],[2,10],[-1,10],[-13,-13],[-4,-11],[1,-29],[-10,-9],[-24,-6],[-107,-10]],[[3674,5305],[-24,1],[-30,-1],[-23,-6],[-57,16],[-18,8],[-12,-13],[-14,-8],[-19,-6],[-105,-22],[-45,-5],[-29,-7]],[[3298,5262],[-8,13],[-6,6],[-47,34]],[[3298,5262],[-24,-6],[-19,-3],[-17,-7],[-9,-14],[-12,-10],[-24,3],[17,-4],[-2,-12],[-10,-10],[-15,-8],[-19,-3],[-18,-5],[-2,-11],[0,-1]],[[8514,6516],[10,-1],[8,-1],[4,-1],[15,-4],[16,-8],[3,-1],[4,-1],[10,0],[21,0],[8,0],[3,0],[4,-1],[18,-5],[5,-1],[9,-1],[5,0],[5,0],[10,2],[3,0],[2,0],[1,0],[5,-2],[14,-5],[4,-1],[4,0],[5,1],[3,1],[8,4],[3,2],[1,1],[2,1],[4,1],[3,0],[5,0],[9,-2],[10,-1],[31,0],[2,0],[12,-7],[4,-1],[2,0],[1,2],[-2,6],[0,1],[1,1],[1,1],[7,0],[6,-1],[10,-5],[15,-15],[-2,1],[11,-11],[5,-3],[5,-1],[5,-3],[1,-6],[-16,-5],[11,-5],[13,-2],[17,0],[-3,-9],[-6,-7],[-10,-5],[-14,-5],[-18,6],[-6,-4],[-1,-2],[-1,-2],[0,-20],[8,-26],[1,-7],[0,-5],[-6,-6],[-1,-2],[0,-3],[3,-16],[-1,-3],[3,-19],[7,-9],[20,-16],[6,-3],[4,-2],[3,-1],[4,-1],[5,0],[20,0],[9,-1],[9,-2],[28,-7],[21,-7],[5,-3],[3,-2],[18,-20],[2,-3],[0,-3],[-3,-4],[-3,-3],[-6,-3],[-3,-2],[-1,-2],[-2,-3],[-1,-3],[2,-4],[2,-4],[56,-62],[3,-2],[2,-1],[4,-2],[3,-1],[4,-1],[9,-1],[5,-1],[3,-1],[3,-2],[2,-2],[2,-2],[21,-28],[1,-2],[-1,-2],[-5,0],[-4,0],[-4,1],[-9,5],[-3,1],[-4,1],[-5,0],[-5,0],[-4,0],[-5,-1],[-11,-3],[-3,-1],[-3,-2],[-7,-5],[-2,-2],[-3,-5],[-21,-49],[1,-4],[4,-5],[25,-15],[3,-2],[2,-2],[3,-4],[4,-6],[4,-10],[1,-6],[-1,-4],[-4,-4],[-3,-2],[-13,-7],[-1,-1],[-1,-2],[-1,-2],[3,-2],[3,-2],[7,0],[4,0],[6,1],[10,0],[5,0],[5,0],[11,-6],[25,-22],[-3,-5]],[[9113,5915],[-21,2],[-10,2],[-19,7],[-9,2],[-11,1],[-23,-2],[-8,0],[-20,6],[-16,6],[-16,6],[-20,1],[-17,-5],[-36,-15],[-18,-2],[-8,3],[-6,12],[-10,3],[-10,-2],[-12,-11],[-8,-3],[-20,-1],[-30,7],[-20,0],[-19,-6],[-13,-10],[-12,-10],[-13,-8],[-24,-6],[-20,3],[-19,4],[-22,3],[-12,-2],[-10,-4],[-8,-4],[-6,-2],[-5,0],[-7,0],[-8,1],[-8,2],[-137,11],[-65,14],[-29,2],[-18,-6],[-16,-6],[-22,-4],[-14,3],[-7,6],[-1,6],[4,3],[-11,0],[-2,-2],[-2,-4],[-30,-17],[-9,-3],[-15,0],[-9,4],[-6,4],[-7,2],[-44,-7],[-34,-9]],[[8065,5890],[20,66],[-5,15],[-2,5],[-2,2],[-6,13],[-4,18],[-1,7],[1,6],[7,9],[12,40],[0,20],[-3,5],[-2,1],[-51,36],[-9,9],[-2,4],[1,33],[-1,5],[-8,8],[-2,1],[-4,2],[-4,1],[-10,0],[-5,1],[-10,1],[-9,1],[-41,12],[-4,2],[-4,3],[-6,6],[-1,3],[0,4],[4,4],[3,1],[3,5],[9,17],[4,4],[2,2],[5,7],[14,12],[22,12],[3,5],[2,5],[2,2],[2,2],[2,1],[14,5],[3,2],[2,2],[2,3],[1,8],[2,2],[1,1],[6,3],[3,1],[4,2],[3,5],[3,8],[0,10],[-2,5],[-3,3],[-8,5],[-7,14],[-5,21],[-4,9],[-4,5],[-7,3],[-5,2],[-4,2],[-5,6],[-1,4],[0,3],[4,6],[1,4],[2,9],[2,4],[3,3],[3,3],[3,3],[3,8],[0,4],[-3,3],[-3,2],[-4,3],[-4,4],[0,3],[3,2],[4,0],[4,1],[5,0],[3,1],[4,2],[2,2],[2,3],[0,1],[2,0],[6,2],[4,2],[3,2],[3,6],[3,3],[3,1],[5,1],[3,2],[2,3],[1,3],[2,2],[3,2],[9,4],[3,1],[8,2],[17,3],[4,1],[4,2],[3,3],[4,5],[0,7],[-10,8],[-3,10],[-6,7],[-13,4],[-19,1],[-41,0],[-17,1]],[[7993,6601],[7,11],[43,29],[25,11],[11,8],[6,7],[12,7],[9,9],[6,3],[5,1],[6,1],[8,2],[7,5],[11,5],[17,5]],[[8166,6705],[20,-24],[6,-19],[28,-16],[84,-66],[12,-8],[16,-3],[8,-3],[25,-11],[8,-2],[5,-1],[4,0],[36,-1],[8,-1],[10,-2],[15,-6],[8,-3],[7,0],[4,0],[6,0],[3,0],[3,-2],[2,-2],[1,-3],[1,-3],[3,-5],[3,-3],[4,-2],[4,-1],[14,-2]],[[8514,6516],[11,22],[2,6],[8,9],[3,7],[-4,15],[1,10],[-8,-7],[-6,-1],[-7,2],[-8,4],[-25,9],[-4,3],[-6,12],[-1,10],[6,5],[1,4],[9,11],[3,13],[2,18],[2,8],[3,5],[4,0],[5,0],[13,-2],[4,0],[4,0],[11,4],[4,0],[41,1],[5,0],[5,0],[5,0],[6,1],[5,4],[6,4],[13,2],[6,3],[2,3],[1,2],[0,2],[-1,1],[-5,6],[-3,6]],[[8627,6718],[102,-17],[34,0],[14,4],[10,7],[7,7],[11,7],[3,7],[-2,4],[-7,4],[-15,4],[-1,3],[6,4],[17,4],[14,-1],[15,-6],[34,-23],[14,-12],[13,-6],[15,-1],[28,1],[11,0],[11,-4],[7,-6],[8,-11],[5,-13],[10,-8],[11,-4],[16,0],[26,5],[10,-1],[7,-3],[8,-11],[6,-5],[13,-5],[17,2],[17,8],[16,17],[7,19],[-1,13],[-6,11],[-1,9],[5,17],[54,85],[30,24],[14,20],[1,12],[-5,21],[2,8],[8,7],[9,5],[16,6],[7,4],[6,5],[-2,12],[-4,4],[-4,3],[-6,3],[-5,2],[-6,3],[-4,3],[-3,5],[0,11],[7,18],[68,37],[11,24],[8,4]],[[9344,7064],[157,-31],[12,-1],[49,-1],[141,-19],[11,-3],[9,-3],[2,-4],[0,-2],[-7,-5],[-12,-4],[-26,-5],[-29,-18],[-2,-23],[15,-26],[47,-55],[13,-11],[16,-8],[14,-5],[18,-1],[49,2],[27,-2],[52,-9],[53,-19],[34,-27],[12,-32],[-12,-34],[-30,-42],[-5,-15],[-2,-28],[-7,-12],[-15,-8],[-4,-3],[-43,-15],[-56,-9],[-24,-9],[-11,-15],[7,-12],[19,-7],[24,-2],[24,0],[23,3],[4,-3],[4,-15],[-1,-18],[-4,-1],[-35,-12],[-33,-15],[-49,-28],[-11,-9],[-8,-14],[-5,-15],[0,-15],[10,-11],[27,-3],[29,-16],[6,-1],[16,1],[5,0],[3,-4],[0,-7],[1,-3],[36,-27],[15,-7],[32,-3],[-11,-9],[-48,-17],[-12,-12],[20,-22],[-9,-15],[-7,-1],[-19,0],[-4,0],[-3,-5],[2,-10],[8,-9],[0,-4],[-5,-2],[-16,-2],[-6,-2],[-9,-13],[-6,-15],[2,-15],[13,-12],[4,-7],[-9,-31],[-2,-20],[17,-45],[-3,-20],[-14,-18],[-39,-28],[-28,-14],[-8,-5],[-6,-7],[-10,-15],[-5,-5],[-13,-3],[-31,-4],[-14,-2],[-10,-4],[-23,-13],[-7,-3],[-15,1],[-21,8],[-12,0],[-9,-3],[-14,-15],[-9,-5],[-22,-5],[-62,-8],[-17,0],[-36,-10],[-27,-33],[-37,-34],[-65,-11],[-27,7],[-21,13],[-38,38],[-2,6],[5,31],[0,9],[-6,8],[-22,4],[-48,5]],[[8627,6718],[-49,11],[-10,5],[2,5],[0,2],[-1,2],[-2,3],[-2,4],[-3,1],[-4,1],[-4,-1],[-7,0],[-3,2],[-1,2],[-1,7],[-1,2],[0,3],[1,2],[2,4],[0,2],[0,2],[-2,2],[-1,2],[0,8],[-4,9],[-5,3],[-7,4],[-2,3],[-1,3],[0,2],[2,4],[2,3],[0,4],[0,10],[1,3],[2,1],[3,2],[2,2],[0,10],[1,5],[4,6],[1,3],[0,9],[1,3],[1,2],[17,11],[1,2],[1,4],[-2,14],[1,4],[1,2],[1,2],[1,3],[2,8],[2,5],[2,3],[2,2],[10,6],[9,8],[5,3],[10,5],[5,3],[3,2],[1,2],[11,19],[2,4],[2,1],[19,9],[7,6],[4,4],[9,15],[20,25],[11,8],[5,3],[26,11],[22,6],[71,10],[112,9],[37,5],[5,1],[6,2],[2,3],[2,4],[2,14]],[[8989,7128],[27,1],[51,10],[12,3],[7,3],[2,2],[22,10],[61,22],[5,3],[1,1],[14,11],[9,3]],[[9200,7197],[24,-7],[9,-4],[13,-13],[5,-15],[-2,-30],[5,-17],[12,-17],[19,-13],[25,-11],[34,-6]],[[8166,6705],[15,9],[12,4],[30,7],[26,4],[15,4],[-19,15],[-35,40],[-12,10],[-14,4],[-13,-4],[-8,0],[11,29],[-5,29],[-24,24],[-48,16],[2,-18],[-22,-8],[-30,-3],[-25,-4],[-7,8],[0,7],[5,5],[11,3],[0,5],[-5,4],[6,6],[11,5],[13,3],[-11,8],[-10,6],[-9,8],[-3,9],[5,3],[3,2],[1,4],[1,7],[-2,16],[0,7],[2,4],[3,1],[6,2],[16,2],[10,0],[22,0],[10,-1],[18,-2],[5,-1],[5,1],[5,0],[4,1],[3,1],[2,2],[2,2],[1,4],[1,11],[6,15],[0,4],[-1,4],[-2,2],[-10,8],[-3,4],[-5,7],[0,4],[1,3],[4,3],[5,4],[6,3],[7,2],[4,1],[4,1],[22,3],[4,1],[4,1],[12,6],[2,2],[5,3],[12,7],[3,1],[16,3],[4,1],[3,2],[5,3],[2,0],[6,2],[14,1],[5,1],[3,1],[6,3],[14,11],[6,6],[9,14],[2,3],[17,12],[5,4],[13,6],[3,1],[4,1],[5,0],[14,-1],[5,0],[5,1],[4,0],[4,2],[2,1],[3,2],[34,42]],[[8439,7217],[19,9],[7,2],[12,3],[10,1],[10,0],[24,-1],[11,0],[16,-1],[23,-3],[5,0],[6,0],[12,2],[5,1],[10,0],[4,-1],[5,-2],[7,-4],[4,-3],[9,-9],[3,-1],[6,0],[27,-1],[5,-1],[5,-1],[4,-4],[3,-2],[7,-9],[12,-13],[4,-6],[3,-4],[4,-2],[11,-5],[14,-4],[7,-3],[4,-2],[10,-7],[3,-2],[6,-1],[8,0],[16,2],[6,2],[4,3],[1,2],[3,5],[2,2],[3,1],[4,1],[5,0],[3,0],[3,-3],[2,-3],[3,-2],[4,-2],[8,-3],[5,-3],[14,-2],[106,-10],[13,-5]],[[5260,5090],[-25,-15],[-5,-10]],[[5230,5065],[-39,9],[-28,2],[-5,-1],[-12,-6],[-4,-1],[-36,-6],[-8,-2],[-4,-3],[-1,-11],[-3,-8],[-2,-2],[-5,-4],[-7,-3],[-17,-7],[-9,-3],[-8,-1],[-5,0],[-9,1],[-14,2],[-8,1],[-5,0],[-3,-1],[-2,-1],[-12,-9],[-2,-2],[-6,-4],[-15,-8],[-7,-1],[-7,-1],[-4,1],[-13,4],[-9,1],[-5,-1],[-5,-1],[-26,-11],[-8,-2],[-7,0],[-4,0],[-7,3],[-29,18],[-6,2],[-4,2],[-13,5],[-3,2],[-9,2],[-17,2],[-6,0],[-6,-1],[-13,-4],[-7,-3],[-6,-5],[-6,-2],[-5,-1],[-4,0],[-24,6],[-4,1],[-6,0],[-7,1],[-6,0],[-4,1],[-18,6],[-34,5],[-6,0],[-6,-1],[-7,-2],[-9,-4],[-2,-2],[-2,-2],[0,-3],[0,-2],[1,-3],[2,-2],[5,-3],[3,-2],[7,-2],[1,-2],[-1,-3],[-8,-4],[-6,-2],[-5,-1],[-5,0],[-10,1],[-9,2],[-35,3],[-16,0],[-9,-1],[-6,-2],[-17,-8],[-3,-2],[-2,-2],[0,-2],[1,-1],[3,-1],[12,-5],[6,-3],[4,-4],[1,-2],[2,-5],[1,-3],[0,-2],[-3,-11],[0,-2],[0,-3],[2,-2],[4,-7],[2,-2],[0,-2],[-1,-6],[-3,-5],[-3,-3],[-6,-4],[-26,-11],[-2,-1],[-3,-2],[-1,-2],[-1,-3],[0,-3],[0,-5],[-1,-5],[-2,-3],[-2,-2],[-5,-3],[-2,-2],[-48,-20],[-3,-2],[-2,-1],[-2,-2],[-1,-3],[-1,-6],[0,-8],[-1,-6],[-1,-5],[-11,-10],[-3,-5],[-17,-41],[0,-13],[2,-6],[3,-1]],[[4369,4731],[-4,-12],[0,-16],[-58,14],[0,4],[17,8],[-7,11],[-21,7],[-21,-7],[-13,4],[-11,0],[-11,-3],[-15,-1],[5,2],[5,3],[4,4],[2,5],[-25,0],[4,4],[9,10],[4,5],[-10,0],[-23,4],[21,30],[16,13],[21,-6],[8,0],[8,7],[11,6],[9,8],[5,12],[-2,10],[-6,10],[-8,8],[-46,36],[-4,9],[4,6],[9,4],[10,4],[10,5],[3,5],[2,13],[4,5],[10,-3],[13,3],[11,7],[7,7],[-1,16],[-12,11],[-14,10],[-7,11],[-5,5],[-11,2],[-11,3],[-6,7],[26,18],[19,20],[26,19],[10,12],[-1,13],[-13,24],[-6,6],[-16,15],[-4,5],[3,7],[5,4],[6,3],[10,15],[18,5],[22,2],[19,8],[5,9],[2,16],[-2,14],[-17,13],[9,15],[2,3]],[[4372,5287],[1,0],[13,0],[10,1],[8,2],[14,5],[2,1],[3,2],[3,5],[1,2],[4,1],[9,1],[3,1],[3,2],[1,1],[0,1],[1,1],[1,1],[3,2],[4,1],[3,1],[2,2],[1,3],[-1,2],[-5,10],[0,2],[0,3],[2,2],[3,1],[3,1],[4,1],[5,0],[20,0],[5,0],[5,1],[3,1],[5,3],[3,2],[4,1],[15,1],[4,0],[3,1],[5,4],[6,6],[8,5],[3,2],[4,0],[4,1],[5,0],[5,-1],[56,-14],[74,-8],[19,-4],[7,-2],[7,-4],[13,-8],[6,-5],[4,-4],[6,-9],[3,-2],[2,-1],[29,-11],[29,-17],[5,-1],[8,0],[6,0],[5,1],[4,0],[4,1],[5,0],[5,0],[5,0],[4,-2],[5,-3],[11,-11],[4,-3],[21,-10],[15,-4],[9,-1],[6,0],[5,1],[4,1],[7,2],[4,1],[4,0],[4,0],[5,0],[7,-2],[5,-1],[21,-7],[6,-4],[25,-20],[11,-11],[2,-5],[2,-2],[3,-2],[4,-2],[14,-3],[6,-2],[23,-11],[6,-2],[25,-5],[12,-3],[6,-3],[47,-27],[42,-40],[3,-13]],[[5451,5462],[12,-33],[5,-7],[8,-6],[10,-5],[4,-1],[9,-4],[3,-2],[2,-3],[2,-3],[-1,-7],[-1,-5],[-2,-3],[-2,-2],[-2,-4],[0,-3],[3,-3],[6,-2],[6,-1],[6,-1],[10,0],[11,0],[36,5],[5,-1],[4,-1],[3,-4],[4,-8],[3,-16],[1,-11],[-4,-15],[-3,-6],[-5,-3],[-8,-1],[-4,-1],[-10,0],[-15,0],[-4,-1],[-3,-1],[-3,-2],[-2,-2],[-1,-3],[0,-5],[1,-10],[3,-7],[6,-6],[13,-11],[16,-8],[7,-11],[15,-37]],[[5595,5201],[-49,-25],[-19,-7],[-26,-6],[-7,-2],[-5,-3],[-2,-5],[-8,-9],[0,-1],[-1,-2],[0,-2],[-4,-7],[-6,-6],[-4,-3],[-5,-2],[-4,1],[-3,1],[-2,2],[-2,4],[-2,2],[-3,2],[-4,1],[-4,1],[-7,0],[-9,-2],[-16,-4],[-8,-3],[-17,-11],[-12,-5],[-35,-11],[-8,-2],[-4,-1],[-11,1],[-14,-1],[-34,-6]],[[4372,5287],[19,17],[0,5],[-15,-5],[-12,-7],[-12,-5],[-16,-2],[-74,0],[-30,2],[-28,5]],[[5997,5158],[64,-92],[24,-22],[54,-35],[19,-22],[12,-9],[21,-6],[0,-1],[-1,-4],[-3,-3],[-7,-3],[-8,-2],[-7,-3],[-2,-2],[3,-3],[10,-6],[1,-2],[-1,-3],[-14,-8],[-2,-7],[4,-7],[8,-8],[6,-15],[5,-26],[7,-14],[7,-7],[6,-4],[5,-5],[3,-8],[-1,-7],[-13,-21]],[[6197,4803],[-1,0],[-6,-2],[-21,-7],[-4,0],[-4,-1],[-11,0],[-10,0],[-4,-1],[-3,-1],[-3,-2],[-3,-2],[-10,-9],[-24,-12],[-14,-11],[-2,-3],[-1,-4],[2,-24],[1,-4],[2,-3],[3,-1],[0,-2],[-1,-2],[-4,-4],[-3,-3],[2,-4],[5,-4],[14,-9],[1,-2],[1,-3],[-2,-2],[-5,-1],[-4,0],[-5,1],[-7,3],[-18,8],[-5,4],[-3,1],[-3,1],[-4,1],[-5,0],[-3,-1],[-4,-1],[-6,-3],[-5,-3],[-2,-2],[-20,-14],[-1,-5],[1,-7],[7,-15],[5,-6],[4,-4],[2,-1],[2,-2],[1,-1],[0,-4],[-1,-4],[-3,-9],[-4,-4],[-4,-3],[-5,-3],[-2,-2],[1,-3],[6,-5],[8,-10],[3,-3],[4,-3],[6,-2],[13,-3],[6,-3],[6,-3],[-1,-7],[-23,-22]],[[6029,4541],[-4,6],[-18,6],[-16,-7],[10,-2],[7,-4],[5,-4],[3,-4],[-17,-11],[-25,-8],[-22,1],[-10,16],[3,30],[8,14],[14,14],[-8,0],[-7,-6],[-18,-18],[-8,0],[-5,8],[-3,9],[1,8],[7,8],[-14,-6],[-19,-4],[-18,1],[-7,9],[-20,-4],[-5,-1],[11,-4],[5,-5],[-1,-7],[-6,-7],[7,0],[26,10],[8,-8],[5,-6],[1,-7],[-6,-8],[24,-10],[13,-21],[-11,-13],[-44,12],[-74,42],[-36,10],[-15,6],[2,7],[-19,14],[-28,16],[-18,16],[8,14],[4,-5],[5,-2],[7,-1],[8,-1],[-16,6],[8,5],[17,7],[8,10],[-9,0],[-7,-7],[-8,-2],[-9,0],[-8,4],[12,6],[6,2],[6,1],[-61,-1],[-5,6],[25,14],[-51,-2],[-15,-3],[0,-5],[16,-6],[10,-9],[15,-7],[25,-1],[-6,-8],[-2,-9],[-1,-20],[-41,35],[-17,10],[-20,4],[-23,1],[-15,-3],[0,29],[-2,7],[-6,7],[-5,4],[-2,-4],[-3,-4],[-10,-4],[-4,-4],[16,-29],[1,-7],[-41,17],[-18,10],[-8,9],[25,-4],[-5,11],[-8,3],[-10,-1],[-10,1],[-10,5],[-5,5],[-4,6],[-6,7],[-20,15],[-22,12],[-26,11],[-24,6]],[[5346,4770],[4,4],[1,9],[2,3],[3,2],[3,2],[3,1],[1,2],[0,10],[0,2],[1,0],[0,1],[5,3],[10,4],[3,1],[1,3],[0,2],[0,3],[0,3],[10,26],[3,14],[-5,25],[0,7],[-1,3],[-2,2],[-7,2],[-4,0],[-4,-1],[-5,2],[-4,4],[-10,20],[-3,3],[-4,3],[-12,5],[-6,1],[-6,0],[-3,-1],[-8,-1],[-5,-1],[-4,1],[-3,0],[-3,2],[-6,4],[-3,4],[-1,5],[0,8],[1,4],[3,3],[2,1],[5,3],[2,1],[1,1],[0,1],[-1,3],[-2,4],[-10,6],[-6,2],[-6,1],[-5,0],[-5,0],[-4,1],[-3,1],[-4,4],[-24,34],[-7,17],[-1,2],[7,14]],[[5595,5201],[16,-28],[7,-8],[19,-10],[4,-3],[2,-4],[0,-2],[-6,-23],[4,-29],[3,-6],[3,-5],[6,-1],[5,-1],[4,1],[4,1],[10,4],[9,4],[14,4],[8,2],[30,2],[17,3],[7,2],[6,3],[3,2],[3,1],[16,16],[9,8],[5,3],[3,2],[5,1],[6,0],[11,-1],[5,-2],[3,-2],[7,-9],[4,-3],[8,-4],[17,-8],[13,-3],[14,-2],[13,1],[4,0],[4,1],[3,1],[3,2],[2,2],[4,4],[6,12],[4,4],[2,2],[6,3],[7,3],[7,2],[12,3],[3,1],[7,3],[5,3],[2,1],[3,2],[1,2]],[[6316,5749],[9,-3],[6,-4],[3,-1],[5,0],[6,2],[3,2],[3,3],[1,2],[3,2],[4,0],[7,-2],[4,-2],[7,-3],[6,-3],[4,-1],[8,-1],[36,0],[29,-2],[12,1],[51,7],[24,5],[3,2],[3,2],[4,1],[12,2],[19,3],[8,0],[12,-2],[11,-2],[24,-2],[5,-1],[7,0],[11,1],[12,3],[23,2],[1,0]],[[6702,5760],[-1,-8],[-3,-14],[-8,-11],[-25,-19],[-9,-11],[-4,-15],[1,-10],[-5,-9],[-18,-11],[-69,-30],[-29,-16],[-23,-22],[-20,-36],[-10,-12],[-22,-15],[-5,-6],[-3,-6],[-2,-14],[-5,-7],[-28,-13],[-122,-32],[-38,-17],[-2,-14],[26,-14],[43,-15],[-22,-3],[-57,-18],[-23,-5],[-74,-3],[-97,4],[-47,-3],[-23,-16],[2,-7],[13,-11],[4,-6],[1,-6],[-1,-8],[0,-2],[5,-51],[-8,-41],[2,-47],[1,-2]],[[5664,5774],[28,-14],[12,-4],[62,-13],[12,-2],[8,0],[5,0],[5,0],[4,1],[3,1],[3,2],[1,2],[1,3],[-3,10],[1,2],[1,3],[5,3],[4,2],[5,2],[11,2],[6,0],[5,-1],[9,-4],[9,-4],[3,-2],[3,-1],[1,-2],[0,-3],[0,-2],[0,-3],[3,-3],[6,-4],[6,-2],[6,0],[40,0],[6,-1],[5,-3],[5,-3],[5,-1],[5,0],[5,0],[5,1],[3,1],[3,1],[3,2],[4,4],[2,2],[4,1],[4,1],[18,1],[5,1],[25,5],[6,-1],[7,-1],[21,-4],[9,-1],[6,-1],[5,1],[10,4],[11,2],[7,0],[5,-1],[4,-1],[2,-2],[5,-1],[6,-2],[11,-3],[7,0],[27,2],[7,0],[5,-1],[4,-4],[2,-1],[1,-2],[0,-4],[-2,-6],[1,-7],[1,-3],[2,-2],[2,-3],[5,-3],[6,-2],[5,0],[6,0],[19,1],[5,1],[5,0],[3,1],[3,2],[2,1],[-1,2],[-4,1],[-8,2],[-5,1],[-2,1],[-1,3],[1,2],[1,2],[3,2],[3,2],[4,0],[5,1],[5,0],[4,1],[9,1],[3,1],[8,2],[3,2],[11,6],[10,3]],[[5346,4770],[-7,3],[-20,3],[-75,1],[-21,-4],[-13,-9],[-9,-11],[-10,-8],[-21,-6],[-25,-1],[-49,2],[-9,-2],[-2,-5],[1,-4],[-2,-3],[-6,-1],[-13,1],[-20,0],[-36,5],[-53,-5],[-27,-5],[-11,-6],[-6,-13],[-13,-1],[-30,11],[-84,21],[-89,12],[-195,14],[-25,-3],[-42,-13],[-52,-5],[-13,-7]],[[6287,4111],[-7,-9],[31,2],[19,-18],[3,-24],[-20,-20],[0,-5],[17,0],[-10,-9],[-3,-6],[4,-17],[-8,0],[-8,3],[-9,11],[-7,4],[-11,3],[-39,7],[10,7],[5,3],[2,4],[-1,8],[-3,7],[-12,15],[-1,6],[24,49],[6,5],[11,-3],[5,-7],[3,-8],[-1,-8]],[[5921,4402],[33,-5],[21,1],[38,-15],[15,-9],[14,-9],[14,-17],[10,-9],[16,-6],[0,-5],[8,-4],[13,-13],[18,-11],[13,-12],[-2,-11],[-17,-4],[-19,7],[-39,21],[-4,-8],[3,-7],[-2,-6],[-17,-3],[-16,1],[-46,9],[0,-5],[4,-2],[5,-7],[-7,3],[-7,3],[-9,2],[-11,1],[0,5],[5,9],[0,42],[-12,6],[-34,44],[17,0],[-5,5],[-5,4],[-7,3],[-8,3],[20,-1]],[[6197,4803],[-15,-7],[-6,-11],[-1,-14],[3,-15],[8,-10],[12,-5],[7,-3],[68,-13],[36,-14],[92,-51],[30,-10],[9,-4],[4,-6],[2,-11],[4,-6],[16,-9],[39,-12],[14,-8],[2,-8],[1,-6],[-10,-9],[-31,-15],[-13,-13],[-6,-13],[-28,-110],[10,-27],[61,-53],[17,-11],[7,-4],[20,-24],[12,-33],[55,-59],[51,-39],[34,-29],[14,-27],[4,-38],[-18,-16],[-9,14],[3,35],[-2,16],[-16,19],[-82,60],[-51,23],[-7,7],[0,43],[-13,30],[-20,19],[-142,76],[-2,6],[28,-1],[-15,11],[-44,19],[1,7],[0,5],[-20,-6],[-18,-3],[-15,-4],[-5,-13],[17,-62],[15,-16],[2,-5],[-4,-7],[-10,0],[-13,3],[-11,2],[-5,3],[1,14],[0,6],[-22,15],[-34,13],[-37,11],[-129,25],[-19,6],[-18,2],[-14,-12],[-7,0],[-27,7],[-7,2],[-4,6],[0,5],[3,5],[1,3],[-8,13],[-22,21],[-2,12],[32,-5],[30,6],[26,11],[18,11],[10,16],[-5,7]],[[6945,6650],[-8,-21],[-4,-2],[-7,-7],[3,-6],[9,-5],[11,-5],[13,3],[4,2],[0,-5],[8,0],[0,5],[9,0],[3,-11],[16,-17],[5,-10],[29,4],[15,-9],[10,-10],[13,2],[7,0],[5,-9],[23,-7],[6,-8],[15,7],[12,0],[9,-4],[9,-3],[11,3],[15,9],[7,3],[13,2],[26,9],[15,2],[9,-2],[10,-4],[11,-2],[11,4],[8,0],[-1,-4],[2,0],[4,0],[4,-1],[-14,-6],[11,-6],[21,1],[14,11],[-8,0],[0,5],[23,-5],[18,-4],[0,-1],[9,-9],[7,-2],[6,-1],[5,0],[7,-2],[2,-2],[-1,-2],[0,-3],[3,-1],[-4,-7],[-11,-13],[-4,-4],[-4,-8],[-1,-1],[-5,-2],[-11,-3],[-6,-3],[-7,-10],[-12,-20],[-2,-5],[3,-16],[0,-9],[3,-16],[0,-12],[1,-2],[1,-2],[2,-2],[5,-4],[1,-2],[2,-2],[0,-3],[-1,-3],[-2,-3],[-5,-5],[-1,-4],[3,-4],[3,-2],[3,-2],[5,-4],[1,-2],[1,-2],[1,-3],[-1,-2],[-3,-3],[-11,-5],[-7,-2],[-3,-2],[-3,-1],[-2,-2],[-2,-3],[-1,-4],[0,-6],[3,-9],[2,-17],[1,-8],[-1,-3],[-3,-3],[-7,-5],[-5,-3],[-6,-1],[-3,-1],[-5,-3],[-18,-20],[-8,-7],[-2,-2],[-6,-2],[-16,-7],[-14,-8],[-7,-2],[-21,-7],[-3,-2],[-17,-9],[-3,-1],[-4,-1],[-7,-3],[-5,-2],[-3,-3],[-5,-6],[-7,-6],[-6,-3],[-6,-3],[-1,-3],[-1,-4],[3,-15],[-3,-10],[-15,-30],[-6,-9],[-17,-16],[-1,-2],[-4,-13],[-2,-2],[-2,-3],[-3,-1],[-12,-6],[-2,-2],[-1,-5],[-1,-7],[2,-15],[-2,-10],[-1,-7],[9,-22],[13,-16],[10,-16],[0,-2],[-1,-4],[-2,-6],[-7,-9],[-4,-4],[-3,-5],[0,-3],[3,-7],[1,-4],[-5,-7],[-2,-5],[0,-5],[3,-14]],[[7098,5880],[-54,-9],[-72,-6],[-25,-4],[-39,-12],[-82,-39],[-15,-6],[-21,-7],[-44,-7],[-20,-5],[-19,-11],[-5,-11],[0,-3]],[[6316,5749],[-10,32],[0,11],[7,9],[16,17],[2,1],[7,7],[6,9],[1,4],[-1,3],[-3,1],[-4,1],[-9,2],[-3,4],[-4,6],[-4,23],[-2,5],[-1,2],[-3,2],[-2,2],[-10,5],[-5,4],[-1,3],[0,3],[7,15],[0,4],[0,3],[-10,16],[-8,8],[-8,5],[-50,22],[-3,2],[-6,5],[-8,9],[-20,32],[-3,6],[1,3],[1,3],[26,37],[3,10],[-1,5],[-1,3],[-7,6],[-7,6],[-7,9],[-10,18],[-1,6],[1,17],[0,1],[-2,2],[-20,13],[-24,42],[-2,9],[-1,3],[6,-3],[6,-3],[7,-2],[8,-2],[19,-3],[3,-1],[3,-1],[3,-2],[10,-9],[3,-2],[2,-1],[2,-1],[3,0],[31,-2],[10,1],[28,3],[8,2],[3,2],[4,2],[3,5],[0,4],[-1,2],[-23,21],[-3,3],[-6,12],[-1,5],[0,4],[10,13],[3,5],[0,4],[-2,2],[-3,1],[-30,10],[-4,1],[-5,3],[-1,2],[2,2],[4,1],[5,0],[5,0],[45,-7],[23,-7],[17,-3],[18,-3],[22,0],[41,2],[17,2],[25,5],[56,22],[7,9],[5,11],[7,9],[3,2],[8,5],[5,6],[2,3],[-1,4],[-5,8],[0,2],[1,2],[11,5],[6,3],[42,30],[29,15],[7,2],[17,4],[8,1],[8,2],[18,5],[20,5],[4,0],[5,0],[4,-1],[7,-3],[4,0],[4,-1],[32,5],[5,1],[5,2],[8,5],[2,3],[0,3],[-3,1],[-3,2],[-2,2],[-2,2],[-1,2],[0,23],[-1,1],[0,1],[-1,3],[1,5],[5,12],[0,4],[-1,2],[-3,5],[-1,2],[-1,3],[1,16],[2,4],[2,2],[4,2],[14,2],[7,3],[2,2],[1,3],[-1,1],[-2,2],[-2,1],[-7,2],[-31,3],[-4,1],[-4,1],[-3,1],[-5,7],[1,2],[26,28],[6,0],[2,-1],[2,-1],[8,-3],[7,0],[7,6],[18,6],[2,3],[-7,9],[-4,4],[-6,3],[-2,1],[-8,2],[-2,1],[-7,0],[-24,-1],[-4,0],[-4,2],[-3,3],[-2,3],[-4,1],[-4,1],[-3,1],[-3,2],[-1,2],[-2,4],[-2,2],[-4,1],[-4,0],[-5,1],[-11,3],[-4,1],[-5,0],[-14,0],[-10,1],[-4,0],[-4,-1],[-12,-3],[-4,-1],[-10,0],[-5,0],[-13,3],[-5,0],[-4,-1],[-4,-1],[-4,0],[-4,0],[-4,1],[-3,1],[-9,5],[-10,7],[-4,4],[-5,3],[-5,3],[-2,1],[-1,2],[-2,4],[-1,20],[-5,16],[-3,22]],[[6551,6756],[6,-4],[9,-4],[6,-3],[4,-1],[9,-1],[6,0],[5,1],[9,1],[29,5],[10,3],[3,1],[5,4],[7,7],[12,21],[2,5],[-1,3],[3,37],[0,2],[5,6],[5,4],[4,3],[8,2],[5,2],[39,7]],[[6741,6857],[26,-17],[13,-5],[4,-1],[3,-1],[3,-1],[2,-1],[11,-10],[2,-2],[3,0],[4,-2],[4,-3],[3,-8],[1,-5],[-1,-3],[-1,-2],[-2,-2],[-5,-3],[-25,-8],[-5,-2],[-2,-2],[-2,-2],[2,-3],[6,-4],[50,-29],[8,-3],[6,-2],[3,-1],[7,-2],[3,-2],[2,-2],[2,-6],[0,-3],[2,-4],[3,-4],[17,-8],[21,-7],[3,-2],[2,-4],[1,-6],[-1,-3],[-3,-2],[-3,-1],[-3,-1],[-3,-2],[-1,-2],[0,-2],[0,-3],[5,-3],[4,-3],[35,-13]],[[5301,7451],[18,-8],[13,-5],[8,-5],[6,0],[4,0],[38,11],[4,0],[10,1],[10,-1],[10,-1],[71,-16],[10,0],[25,1],[10,-1],[5,0],[4,-1],[4,-1],[4,-2],[5,-4],[4,-4],[3,-4],[5,-10],[4,-6],[8,-7],[5,-2],[5,-2],[9,-2],[14,-2],[4,-1],[4,-1],[7,-5],[27,-20],[7,-4],[7,-3],[8,-2],[7,-3],[5,-2],[6,-1],[97,0],[10,0],[7,-1],[2,-1],[4,1],[1,0],[2,0],[6,2],[4,1],[4,0],[10,0],[13,-2],[4,-1],[8,-3],[16,-4],[4,-1],[3,-1],[15,-9],[3,-2],[8,-3],[4,-1],[23,-3],[4,-1],[12,-6],[4,0],[4,0],[4,0],[3,-1],[4,-1],[4,-1],[4,0],[8,1],[15,2],[5,1],[4,0],[4,-1],[3,-1],[4,-2],[4,-3],[4,-1],[4,-1],[4,-1],[5,0],[4,1],[8,1],[3,1],[4,1],[2,1],[0,2],[-2,4],[1,2],[3,1],[4,0],[4,0],[4,1],[4,-2],[3,-2],[3,-9],[2,-4],[3,-4],[2,-1],[12,-4],[9,-4],[3,-1],[16,-4],[1,-7],[-2,-9],[-23,-42],[-16,-20],[-16,-33],[-3,-3],[-6,-6],[-12,-8],[-7,-7],[-7,-5],[-2,-2],[-30,-19],[-4,-3],[-12,-16],[-9,-7],[-45,-26],[-23,-9],[-8,-4],[0,-1],[1,-3],[10,-9],[5,-3],[20,-7],[44,-8],[16,-5],[19,-8],[5,-3],[2,-1],[0,-1],[1,0],[3,-1],[4,-1],[14,-2],[7,-7],[-4,-1],[-8,-4],[-3,-7],[-2,-8],[-10,-17],[2,-4],[-8,-10],[-10,-9],[-5,-3],[-4,-7],[-17,-11],[-4,-9],[2,-10],[4,-6],[0,-7],[-6,-7]],[[6000,6868],[-10,1],[-19,-4],[-37,-11],[-28,-16],[-16,-6],[-22,-1],[-9,9],[0,-3],[0,-1],[-2,-1],[-5,0],[7,-4],[-13,-4],[-34,0],[-18,-6],[2,-7],[-4,-6],[-15,-10],[-1,-3],[2,-7],[-1,-3],[-4,-3],[-5,-1],[-4,0],[-3,-1],[-11,-14],[-6,-5],[-19,-10],[-23,-9],[-8,8],[-45,19],[-11,-10],[-33,-35],[-2,-1],[-4,-2],[-12,-5],[-26,-8],[-6,-3],[-4,-4],[-4,-4],[-5,-12],[0,-6],[3,-7],[11,-15],[2,-5],[1,-3],[-1,-3],[-1,-2],[-6,-3],[-49,-13],[-9,-5],[-10,-6],[-3,-2],[-8,-11],[-3,-5],[-3,-8],[-4,-7],[-2,-2],[-5,-2],[-7,0],[-13,1],[-8,2],[-12,3],[-3,0],[-8,1],[-9,-1],[-33,-5],[-18,-4],[-75,-23],[-47,-12],[-49,-6],[-8,-2],[-10,-4],[-36,-20],[-16,-7],[-26,-8],[-168,-26],[-13,0],[-11,0],[-5,1],[-6,3],[-11,9],[-2,3],[-2,5],[-2,3],[-4,3],[-4,4],[-8,5],[-17,6],[-66,17]],[[6941,7615],[22,-12],[4,-6],[0,-2],[-2,-2],[-7,-8],[-2,-4],[-2,-6],[0,-11],[2,-4],[3,-3],[4,-1],[4,1],[5,1],[3,1],[6,2],[6,3],[3,2],[2,2],[1,3],[1,2],[0,5],[1,2],[4,1],[5,1],[8,-1],[11,-3],[4,-3],[9,-12],[3,-9],[-1,-12],[-5,-13],[-4,-4],[-4,-4],[-6,-3],[-6,-3],[-2,-3],[-2,-4],[-1,-19],[0,-3],[-2,-11],[2,-14],[0,-6],[-1,-5],[-2,-3],[-2,-2],[-2,-12]],[[7001,7433],[2,-10],[0,-4],[-2,-4],[-5,-6],[-9,-5],[-4,-1],[-14,-5],[-2,-1],[-2,-2],[-14,-19],[-5,-4],[-4,-4],[-3,-1],[-7,-9],[-4,-4],[-13,-9],[-12,-5],[-10,-3],[-9,-2],[-4,-1],[-5,0],[-10,0],[-4,0],[-4,-1],[-3,-2],[-14,-11],[-3,-1],[-4,-2],[-6,-2],[-8,-2],[-76,-11],[-9,-2],[3,-2],[9,-7],[5,-7],[2,-5],[-4,-8],[-15,-15],[-6,-4],[-3,-1],[-3,-2],[-2,-2],[-8,-5],[-2,-2],[-5,-7],[-2,-2],[-3,-1],[-3,-3],[-4,-3],[-4,-7],[-6,-6],[-22,-10],[-3,-1],[-17,-7],[-6,-3],[-5,-3],[-2,-3],[-2,-4],[-1,-7],[2,-15],[-1,-14],[1,-4],[3,-6],[7,-11],[6,-11],[-2,-11],[5,-23],[0,-5],[-1,-4],[-9,-11],[-1,-4],[2,-6],[5,-11],[9,-7],[7,-3],[10,-2],[4,-1],[3,-2],[3,-1],[8,-8],[10,-14],[3,-2],[1,-4],[1,-4],[-1,-9],[-3,-8],[-1,-3],[-2,-2],[-1,-11],[0,-5],[4,-6],[33,-37],[1,-4],[1,-5],[-3,-15],[0,-6],[1,-3],[11,-18]],[[6551,6756],[-34,14],[-6,2],[-10,1],[-8,0],[-14,1],[-6,2],[-4,2],[-8,7],[-11,7],[-2,3],[-1,2],[-1,6],[-3,4],[-4,2],[-4,1],[-4,-1],[-8,-2],[-3,-1],[-4,-1],[-13,-2],[-9,0],[-12,1],[-25,4],[-12,1],[-8,-1],[-11,-6],[-4,-1],[-3,-1],[-13,0],[-81,7],[-13,1],[-22,-4],[-29,-1],[-5,-1],[-4,-1],[-19,-6],[-16,-2],[-6,0],[-4,1],[-19,12],[-5,2],[-8,3],[-17,4],[-7,3],[-4,3],[-1,2],[2,9],[0,2],[-1,3],[-2,2],[-2,2],[-3,1],[-4,2],[-15,7],[-3,1],[-2,2],[-16,14]],[[5348,7516],[97,20],[76,28],[26,7],[5,1],[5,0],[4,0],[13,-3],[9,-1],[7,1],[6,2],[17,7],[8,2],[10,1],[16,1],[9,2],[7,2],[4,2],[19,9]],[[5686,7597],[44,-2],[22,-3],[13,-1],[5,0],[3,-1],[16,-5],[7,-2],[16,-2],[3,0],[12,-3],[4,0],[5,-1],[6,1],[6,1],[13,5],[4,2],[3,2],[4,1],[7,1],[5,2],[3,1],[4,4],[3,1],[3,1],[4,1],[7,0],[10,0],[14,-1],[7,-2],[7,-2],[7,-2],[3,-1],[4,-4],[2,-1],[6,-2],[3,-1],[1,-2],[0,-3],[2,-1],[3,-1],[4,-1],[4,-1],[2,-1],[2,-2],[0,-2],[0,-2],[1,-2],[5,-3],[2,-1],[2,-2],[2,-4],[2,-2],[3,-2],[6,0],[10,-1],[9,-2],[2,0],[5,-2],[12,-1],[3,-1],[1,0],[2,-1],[17,-3],[22,-7],[13,-2],[5,0],[6,-1],[20,2],[20,4],[4,1],[5,0],[5,0],[37,-3],[19,-3],[8,-1],[8,-2],[7,-3],[3,-2],[5,-3],[7,-5],[2,-2],[5,-1],[5,0],[19,3],[10,0],[20,1],[7,1],[2,1],[3,3],[17,38],[58,76]],[[6415,7636],[8,9],[2,3],[1,2],[0,6],[8,21],[0,17],[0,3],[2,3],[2,2],[5,3],[9,8],[6,9],[3,1],[3,1],[4,-1],[4,-3],[1,-3],[0,-6],[1,-2],[3,-5],[3,-1],[7,-3],[62,-17],[13,-5],[3,-1],[3,-2],[2,-1],[4,-5],[3,-2],[5,-1],[16,-6],[5,-2],[2,-3],[-1,-2],[-3,-1],[-7,-3],[-3,-1],[0,-2],[1,-2],[6,-6],[1,-2],[1,-3],[1,-6],[-2,-11],[0,-2],[4,-13],[1,-3],[-1,-3],[0,-2],[1,-3],[5,-1],[9,0],[23,2],[13,1],[18,0],[13,-3],[13,-5],[16,-10],[6,-3],[3,-2],[4,-1],[9,-1],[5,0],[11,0],[189,48]],[[7588,7704],[-3,-5],[-2,-2],[-2,-2],[0,-3],[1,-2],[3,-1],[4,-2],[7,0],[10,0],[11,1],[4,1],[10,1],[8,-1],[9,-2],[17,-7],[10,-6],[1,0],[1,0],[23,-10],[11,-5],[31,-11],[7,-4],[3,-3],[1,-2],[-1,-3],[-5,-6],[-1,-5],[0,-3],[1,-5],[1,-2],[4,-5],[4,-4],[7,-5],[3,-2],[32,-9],[7,-3],[4,-2],[4,-4],[4,-7],[2,-2],[2,-2],[3,-2],[37,-14],[5,-1],[28,-6],[4,-1],[3,-2],[8,-5],[10,-4],[6,-3],[4,-3],[6,-4],[4,0],[4,1],[6,4],[3,3],[4,11],[4,5],[3,1],[4,1],[7,-1],[5,0],[4,2],[6,7],[5,2],[6,2],[12,2],[6,2],[5,1],[3,2],[7,5],[4,1],[7,0],[12,-4],[15,-2],[8,-2],[19,-7]],[[8098,7561],[17,-14],[8,-5],[5,-4],[5,-5],[20,-14],[6,-3],[2,-2],[3,-1],[5,-3],[5,-5],[9,-10],[22,-19],[5,-5],[4,-3],[1,-5],[2,-4],[8,-5],[5,-2],[2,-3],[-6,-9],[-1,-3],[4,-18],[1,-3],[4,-4],[23,-18],[9,-10],[2,-2],[8,-5],[20,-22],[3,-12],[0,-17],[6,-21],[-1,-14]],[[8304,7291],[-19,2],[-9,1],[-13,0],[-14,-1],[-8,0],[-6,0],[-6,4],[-2,1],[-4,1],[-5,1],[-5,0],[-5,-1],[-5,-1],[-26,-8],[-90,-23],[-6,-1],[-9,1],[-4,2],[-3,3],[-5,23],[-1,1],[-1,1],[-28,1],[-9,1],[-8,0],[-10,0],[-20,-3],[-10,-1],[-7,1],[-9,1],[-8,0],[-19,0],[-5,0],[-5,1],[-4,1],[-3,1],[-2,2],[-3,2],[-4,1],[-5,0],[-10,0],[-5,0],[-4,1],[-3,1],[-17,7],[-4,1],[-5,0],[-10,0],[-9,-1],[-6,0],[-20,0],[-7,0],[-9,-2],[-14,-4],[-108,-45],[-6,-3],[-4,-1],[-3,-2],[-1,-4],[2,-3],[2,-2],[8,-5],[2,-2],[5,-3],[2,-2],[1,-3],[1,-2],[0,-3],[0,-2],[1,-3],[2,-2],[2,-2],[20,-8],[4,-2],[2,-1],[1,-2],[1,-2],[0,-5],[-5,-20],[-2,-2],[-2,-2],[-2,-2],[-8,-5],[-2,-3],[-4,-10],[-4,-7],[-17,3],[-13,3],[-8,0],[0,-9],[-10,2],[-10,2],[-21,0],[0,-4],[5,-2],[5,-4],[6,-3],[-8,-5],[-9,4],[-7,-2],[-10,-2],[-14,0],[-5,3],[-7,5],[-9,6],[-13,4],[0,-11],[-22,-3],[-25,3],[-11,11],[-12,-2],[-18,-5],[-10,-1]],[[7438,7141],[-2,-1],[-42,1],[-15,-1],[-7,-2],[-9,-9],[-5,-2],[-7,1],[-2,4],[-1,5],[-3,3],[-32,24],[3,8],[-2,7],[-2,4],[-5,5],[-4,2],[-16,4],[-13,3],[-22,11],[-4,3],[-9,15],[-4,4],[-9,8],[-5,4],[-4,2],[-4,0],[-10,1],[-8,0],[-10,2],[-6,2],[-3,2],[0,3],[0,2],[-1,4],[-2,4],[-4,5],[-5,1],[-3,0],[-2,-2],[-6,-6],[-5,-4],[-3,-2],[-3,-1],[-4,-1],[-70,-10],[-8,0],[-9,0],[-16,2],[-6,2],[-4,3],[-4,5],[-2,7],[0,3],[1,2],[2,2],[8,5],[6,9],[5,4],[2,2],[0,3],[-2,4],[-4,4],[-14,12],[-3,4],[-3,10],[-1,3],[1,3],[1,3],[20,29],[1,2],[0,3],[-3,4],[-6,5],[-1,3],[0,5],[-1,5],[-4,10],[0,3],[1,2],[2,2],[2,2],[3,1],[11,4],[2,2],[1,3],[-1,6],[-4,2],[-5,1],[-22,1],[-13,2]],[[6941,7615],[28,25],[8,5],[2,1],[4,0],[7,-1],[13,-2],[10,-1],[6,0],[15,1],[6,0],[6,0],[8,0],[13,1],[10,3],[7,1],[7,0],[16,-1],[12,-2],[8,-2],[14,-3],[6,-2],[4,-1],[6,-3],[2,-2],[7,-1],[11,-2],[26,-2],[25,-4],[22,-4],[18,-6],[12,-3],[7,-2],[17,-7],[10,-7],[2,-2],[1,-2],[-1,-5],[-2,-5],[0,-3],[0,-3],[8,-11],[2,-3],[3,-2],[3,0],[2,1],[4,3],[2,2],[1,2],[-1,4],[1,2],[4,2],[5,7],[2,1],[2,2],[7,4],[4,3],[6,5],[2,2],[5,3],[4,3],[4,3],[2,2],[1,2],[1,2],[-1,8],[-3,9],[1,5],[4,11],[2,2],[2,2],[12,7],[4,6],[7,4],[2,2],[1,2],[0,3],[1,17],[0,3],[-4,6],[-1,2],[1,2],[2,2],[2,1],[3,1],[3,1],[2,2],[2,1],[9,6],[4,4],[2,2],[6,3],[37,11],[12,3],[8,1],[11,-3],[20,-2],[6,-2],[3,-1],[3,-2],[16,-10],[7,-8],[4,-3],[7,-4],[3,-3]],[[7438,7141],[-59,-54],[-9,-17],[-1,-18],[0,-3],[2,-5],[2,-2],[10,-10],[2,-5],[1,-42],[14,-24],[2,-8],[0,-5],[-1,-4],[-2,-2],[-15,-10],[-2,-2],[-12,-22],[-36,-97],[-4,-6],[-3,-2],[-4,-1],[-4,-1],[-4,0],[-11,0],[-24,3],[-10,0],[-10,0],[-9,-1],[-4,-1],[-15,-4],[-11,-7],[-7,-5],[-29,-38],[-4,-4],[-5,-2],[-11,-8],[-2,-3],[0,-3],[2,-2],[3,-1],[4,-1],[5,0],[4,-1],[3,-2],[3,-1],[1,-3],[0,-2],[1,-3],[0,-2],[2,-3],[1,-2],[3,-2],[6,-3],[14,-5],[7,-2],[9,-1],[4,-1],[9,-2],[3,-1],[14,-8],[3,-1],[5,0],[4,0],[10,4],[4,1],[5,0],[10,0],[10,0],[5,-1],[4,-1],[7,-2],[3,-2],[3,-3],[3,-6],[0,-4],[-1,-2],[0,-1],[-6,-6],[-22,-43]],[[7308,6613],[-69,-16],[-20,-2],[-18,5],[-46,8],[-8,2],[-3,1],[-3,2],[-5,2],[-8,3],[-30,5],[-7,2],[-3,1],[-4,2],[-139,22]],[[7993,6601],[-10,4],[-1,9],[-18,-4],[-20,-1],[-11,3],[7,10],[-20,-1],[-11,0],[-8,2],[-11,4],[-3,3],[-2,9],[-2,2],[-9,1],[-5,-2],[-5,-2],[-6,-1],[-34,0],[-23,-7],[-12,-4],[-3,0],[-18,-2],[-16,-4],[-175,7],[-42,10],[-10,1],[-8,0],[-19,-1],[-4,-1],[-8,-2],[-4,-1],[-22,-10],[-4,-2],[-6,-1],[-12,-2],[-7,0],[-6,0],[-19,3],[-38,4],[-9,1],[-6,-1],[-4,0],[-16,-4],[-25,-8]],[[8304,7291],[8,1],[7,2],[7,2],[3,1],[18,3],[4,1],[3,2],[2,1],[2,2],[5,7],[2,2],[3,2],[4,1],[4,0],[5,-5],[5,-8],[10,-30],[1,-10],[10,-27],[0,-3],[0,-6],[-1,-2],[2,-3],[3,-2],[28,-5]],[[8065,5890],[-1,0],[-11,-3],[-41,-5],[-33,15],[-66,-2],[-11,-5],[-3,-6],[-6,-4],[-21,-1],[-18,2],[-14,4],[-12,5],[-13,4],[-17,4],[-10,-1],[-10,-1],[-16,-1],[-23,2],[-71,10],[-41,1],[-9,2],[-4,6],[3,16],[-3,7],[-7,4],[-10,4],[-12,2],[-12,-1],[-12,-3],[-3,-5],[-2,-6],[-8,-5],[-25,-7],[-17,2],[-16,6],[-22,4],[-20,-2],[-47,-13],[-45,-17],[-9,-2],[-13,1],[-9,3],[-6,3],[-5,2],[-17,-3],[-34,-13],[-21,-5],[-26,-2],[-81,0],[-37,-6]],[[5730,8492],[1,-2],[-1,-20],[-2,-3],[-4,-3],[-10,-5],[-11,-5],[-7,-2],[-9,-9],[-16,-35]],[[5671,8408],[-4,-24],[-2,-4],[-3,-5],[-11,-14],[-3,-7],[-1,-10],[-3,-3],[-4,-2],[-5,-1],[-5,-2],[-1,-2],[0,-2],[2,-5],[3,-14],[9,-25],[3,-14],[1,-2],[4,-4],[3,-1],[5,-10],[4,-18],[0,-5],[-1,-3],[-8,-15],[0,-4],[2,-6],[-1,-3],[-3,-2],[-7,-2],[-3,-1],[-2,-3],[-9,-18],[-1,-5],[1,-3],[13,-41],[2,-5],[4,-4],[4,-1],[3,-1],[4,0],[4,2],[3,1],[1,3],[1,2],[1,3],[5,4],[1,2],[1,3],[1,2],[3,1],[4,-3],[4,-6],[12,-27],[2,-2],[4,-5],[2,-3],[3,-2],[3,-2],[7,-3],[3,-1],[2,-2],[3,-2],[5,-5],[3,-4],[8,-5]],[[5747,8068],[23,-39],[1,-12],[-10,-6],[-10,-11],[-7,-4],[-9,-3],[-19,-7],[-24,-7],[-9,-1],[-7,-1],[-10,1],[-14,1],[-11,0],[-10,0],[-25,0],[-14,-2],[-6,-2],[-4,-3],[-1,-3],[-1,-3],[0,-2],[0,-3],[2,-5],[3,-5],[3,-4],[9,-7],[2,-2],[18,-9],[6,-4],[2,-2],[1,-2],[1,-2],[0,-3],[-3,-7],[0,-3],[1,-2],[3,-5],[1,-3],[0,-4],[-2,-3],[-3,-2],[-4,-3],[-9,-4],[-22,-13],[-6,-4],[-5,-4],[-1,-2],[-1,-3],[1,-13],[-2,-3],[-3,-2],[-3,-2],[-5,-3],[-21,-14],[-5,-5],[-2,-4],[9,-17],[4,-4],[25,-14],[15,-5],[4,0],[15,-2],[9,-2],[16,-6],[5,-1],[4,-1],[16,-1],[9,-1],[10,-4],[8,-2],[4,-1],[9,-1],[9,-1],[3,-2],[6,-3],[8,-8],[4,-6],[4,-10],[2,-3],[3,-1],[11,-4],[3,-1],[2,-2],[2,-2],[2,-2],[2,-2],[3,-2],[12,-4],[4,-1],[4,-3],[1,-2],[-2,-2],[-4,-1],[-37,-7],[-9,-3],[-18,-11],[-5,-3],[-4,-1],[-7,-2],[-42,-9],[-4,-1],[-4,-2],[-4,-3],[-1,-2],[1,-3],[21,-22],[4,-4],[11,-7],[2,-2],[5,-5]],[[4321,8049],[52,-6],[24,-6],[22,-8],[19,-9],[17,-12],[20,-2],[36,-11],[35,-8],[5,-2],[4,0],[12,4],[6,4],[21,15],[0,1],[3,10],[12,3],[16,2],[14,3],[8,5],[24,26],[22,16],[133,58],[15,3],[9,0],[8,1],[22,15],[1,2],[1,4],[-6,1],[-12,0],[-8,2],[7,6],[17,3],[18,-1],[18,1],[16,8],[6,3],[4,1],[3,-1],[2,-3],[2,-4],[11,-13],[2,2],[5,5],[6,5],[5,5],[23,13],[41,10],[24,9],[-27,11],[14,3],[22,5],[8,5],[6,8],[2,9],[0,10],[28,-9],[13,7],[10,13],[20,7],[112,12],[4,13],[30,44],[10,29],[10,12],[20,10],[7,0],[12,-7],[47,-7],[46,-14],[25,4],[182,105],[19,11],[9,3],[35,-1]],[[7330,8342],[-5,-2],[-6,-3],[-5,-1],[-4,0],[-11,2],[-8,1],[-4,0],[-9,0],[-4,-1],[-4,-1],[-3,-1],[-3,-1],[0,-3],[1,-4],[8,-9],[13,-8],[4,-5],[0,-2],[-4,-1],[-8,-2],[-1,-3],[1,-4],[7,-9],[10,-8],[1,-9],[-9,-9]],[[7287,8259],[-57,-8],[-16,-4],[-24,-10],[-8,-1],[-6,0],[-3,1],[-11,3],[-10,7],[-15,14],[-3,2],[-3,2],[-6,2],[-5,0],[-4,-1],[-3,-1],[-14,-4],[-32,-5],[-11,-3],[-7,-3],[-8,-5],[-2,-1],[-2,-2],[-5,-8],[-4,-10],[-2,-3],[-4,-2],[-8,-3],[-5,-1],[-5,1],[-12,6],[-2,1],[-7,6],[-3,2],[-7,2],[-4,1],[-15,2],[-4,2],[-2,1],[-1,1],[-1,2],[-2,2],[-3,2],[-7,1],[-4,2],[-5,4],[-4,1],[-13,2],[-4,1],[-2,1],[-1,2],[-1,1],[-2,1],[-2,1],[-8,3],[-12,6],[-4,0],[-1,-1],[-1,-3],[-1,-2],[-5,-2],[-17,-3],[-5,-1],[-3,-2],[-2,-1],[-2,-3],[-5,-3],[-5,-4],[-2,-2],[-4,-4],[-3,-1],[-6,-3],[-2,-2],[-4,-2],[-4,-1],[-10,-3],[-5,0],[-4,1],[-2,2],[-6,9],[-3,4],[-2,2],[-3,2],[-3,1],[-3,2],[-2,2],[-4,4],[-1,2],[-2,2],[-5,4],[-9,2],[-14,2],[-33,2],[-14,0],[-8,-1],[-3,-1],[-1,-3],[-1,-2],[1,-3],[4,-4],[0,-2],[0,-2],[-6,-6],[-1,-3],[-3,-2],[-3,-1],[-9,-4],[-3,-1],[-3,-2],[-3,-5],[-5,-3],[-3,-3],[-3,-3],[-1,-3],[0,-2],[4,-5],[3,-6],[2,-2],[2,-2],[4,-2],[2,-1],[2,-2],[0,-3],[-2,-13],[-1,-2],[-3,-3],[-2,-2],[1,-3],[3,-4],[0,-2],[-1,-2],[-1,-2],[-10,-4],[-3,-2],[-1,-2],[-1,-6],[-5,-3],[-8,-3],[-47,-14],[-3,-1],[-9,-5],[-3,-1],[-2,-2],[-1,-3],[-1,-5],[-4,-7],[0,-3],[-4,-4],[-8,-4],[-21,-8],[-11,-2],[-8,-2],[-5,0],[-8,2],[-10,0],[-15,0],[-33,-5],[-14,0],[-8,1],[-5,6],[-3,2],[-3,1],[-4,1],[-29,4],[-13,0],[-5,2],[-1,2],[3,4],[2,2],[1,3],[0,3],[-1,5],[-4,10],[-1,5],[1,2],[2,5],[1,3],[0,2],[-2,2],[-3,2],[-22,10],[-18,5],[-27,14],[-5,3],[-7,5],[-81,3],[-8,2],[-3,1],[-3,2],[-2,2],[-2,2],[-2,2],[-2,2],[-14,8],[-2,2],[-2,2],[-1,2],[1,2],[4,5],[1,2],[1,2],[-2,3],[-4,2],[-14,3],[-4,1],[-6,3],[-5,5],[-2,1],[-3,1],[-2,2],[-2,2],[-2,2],[-1,2],[-1,11],[-1,3],[-5,6],[-7,6],[-2,2],[-4,1],[-14,5],[-3,2],[-2,1],[-2,2],[-2,2],[-4,2],[-20,5],[-13,5],[-5,3],[-3,5],[-1,2],[-2,2],[-3,2],[-25,8],[-12,6],[-3,2],[-5,1],[-22,4],[-12,3],[-3,1],[-19,9],[-1,0],[-22,3],[-9,1],[-3,1],[-4,2],[-8,5],[-4,1],[-3,-1],[-4,-1],[-14,-2],[-4,-1],[-11,-6],[-4,-3],[-2,-1],[-4,-2],[-6,-1],[-5,0],[-3,1],[-5,4],[0,1],[-2,2],[-3,3],[-2,2],[0,3],[2,2],[2,2],[0,2],[-2,2],[-16,4],[-5,2],[-3,1],[-2,2],[-2,2],[-4,6],[-3,4],[-5,1],[-7,0],[-10,-2],[-5,0],[-4,1],[-8,4],[-5,3],[-23,12]],[[5730,8492],[55,-1],[23,-7],[7,-10],[5,-11],[11,-12],[37,-13],[4,-3],[9,-2],[29,-21],[60,-28],[36,-10],[36,1],[22,-15],[33,-15],[40,-11],[44,-5],[103,0],[39,-10],[15,-27],[-20,-44],[0,-7],[17,-2],[62,-16],[26,-2],[0,5],[-11,9],[-7,13],[6,10],[17,5],[42,6],[19,6],[44,22],[70,20],[7,7],[18,6],[103,25],[20,2],[22,-3],[37,-13],[20,-3],[21,5],[14,9],[10,10],[12,4],[6,7],[-10,39],[2,13],[6,9],[11,6],[9,2],[5,2],[1,0],[-3,-3],[-1,-1],[25,5],[20,6],[14,10],[8,15],[7,22],[8,11],[13,8],[10,4],[10,2],[36,3],[26,5],[45,4],[15,3],[11,5],[1,5]],[[7162,8548],[5,-16],[-12,-13],[12,-11],[36,-2],[36,-9],[14,-21],[-12,-15],[-38,-13],[-18,-20],[8,-27],[44,-24],[52,-16],[41,-19]],[[8022,8215],[7,-11],[2,-12],[3,-5],[4,-3],[3,0],[4,0],[7,2],[3,0],[3,0],[10,-6],[0,-1],[2,-4],[3,-4],[3,-1],[3,0],[4,0],[3,-2],[3,-3],[3,-9],[3,-4],[1,-4],[0,-3],[-4,-4],[-1,-3],[3,-3],[4,-1],[3,-2],[1,-3],[-18,-17],[-4,-3],[-4,-1],[-8,-2],[-10,0],[-5,-1],[-3,-1],[-2,-2],[-1,-3],[9,-14],[2,-2],[5,-3],[3,-2],[1,-2],[2,-3],[-1,-3],[-2,-5],[-8,-9],[-4,-7],[-2,-11],[0,-5],[-3,-9],[-13,-13],[-12,-11],[-1,-2],[-2,-3],[0,-2],[1,-3],[39,-39],[2,-2],[2,-6],[3,-3],[4,-2],[9,-4],[6,0],[5,-1],[4,0],[4,-1],[3,-2],[4,-1],[5,0],[5,0],[4,0],[4,1],[2,2],[1,2],[-1,2],[-1,3],[-1,2],[0,2],[2,1],[4,-1],[4,-1],[4,-1],[4,-1],[4,-3],[4,-1],[7,-3],[3,0],[3,-1],[4,0],[4,0],[3,1],[2,2],[8,9],[4,4],[3,1],[3,2],[5,0],[4,0],[32,-1],[21,0],[6,0],[14,-2],[5,0],[5,0],[13,2],[30,1],[4,1],[7,2],[4,1],[5,1],[16,1],[9,0],[4,1],[5,1],[15,0],[43,-2],[63,1],[3,0],[2,-4],[1,-7],[-2,-19],[2,-13],[8,-5],[2,-2],[3,-4],[1,-3],[-2,-11],[1,-4],[1,-3],[5,-3],[1,-3],[1,-3],[-1,-12],[0,-3],[4,-5],[8,-7],[2,-5],[0,-1],[-1,-3],[-3,-4],[-11,-7],[-7,-4],[-7,-5],[-4,-4],[-14,-21],[-6,-19],[1,-12],[-2,-3],[-3,-4],[-18,-8],[-10,-7],[-3,-1],[-4,-1],[-4,-3],[-3,-5],[-2,-11],[2,-5],[2,-3],[15,-3],[14,-6],[6,-2],[2,-1],[1,-2],[-2,-8],[-13,-8],[-57,-18],[-14,-5],[-2,-2],[-4,-4],[-10,-15],[-5,-4],[-4,-3],[-7,-2],[-9,-2],[-16,-4],[-45,-18]],[[8298,7604],[-51,-7],[-17,1],[-8,1],[-9,2],[-10,1],[-22,1],[-6,-1],[-5,-3],[-5,-6],[-2,-3],[-2,-7],[-2,-2],[-3,-3],[-12,-8],[-12,-6],[-34,-3]],[[7588,7704],[9,2],[-1,29],[-3,7],[-3,4],[-4,1],[-11,1],[-6,1],[-7,3],[-17,15],[-12,8],[-16,8],[-7,2],[-6,0],[-4,0],[-4,-1],[-4,-1],[-4,-1],[-6,1],[-9,3],[-31,16],[-15,5],[-37,9],[-12,4],[-7,4],[-5,4],[-2,1],[-2,0],[-4,-3],[-3,-2],[-6,-2],[-3,-1],[-3,-1],[-8,-1],[-5,0],[-4,0],[-4,1],[-7,1],[-4,1],[-4,-1],[-8,-1],[-5,0],[-4,0],[-8,2],[-69,21],[-23,3],[-14,3],[-9,1],[-28,1],[-5,2],[-4,1],[-3,4],[-3,3],[-15,12],[-4,4],[-2,4],[-1,3],[1,3],[5,3],[8,3],[2,2],[3,1],[1,2],[3,7],[3,4],[1,1],[4,4],[3,6],[2,2],[2,2],[5,3],[8,3],[2,2],[2,1],[1,2],[0,1],[-2,3],[-17,15],[-5,6],[-2,4],[-1,3],[1,2],[1,2],[5,6],[1,2],[3,6],[1,11],[1,2],[1,2],[7,5],[3,6],[0,1],[2,1],[15,8],[2,1],[2,2],[8,15],[2,2],[2,1],[3,1],[3,1],[2,2],[5,11],[4,3],[4,3],[2,2],[6,2],[7,2],[4,0],[4,0],[7,-2],[4,0],[4,0],[4,1],[3,1],[7,4],[3,1],[3,1],[4,1],[4,0],[4,0],[3,0],[2,2],[-2,6],[0,7],[1,2],[-2,16],[2,7],[1,5],[-3,12],[0,2],[2,5],[7,14],[1,4],[-1,5],[-2,9],[-4,7],[-1,1],[-3,1],[-4,0],[-6,2],[-7,3],[-11,10],[-3,5],[-1,3],[5,3],[2,2],[0,2],[0,2],[0,2],[2,4],[0,5],[1,2],[3,1],[1,2],[-1,5],[1,2],[2,2],[2,1],[3,0],[3,0],[4,-3],[3,-1],[4,1],[3,0],[4,1],[4,1],[5,0],[0,1],[-1,2],[-9,2],[-6,1],[-2,2],[1,3],[1,1],[4,9]],[[7330,8342],[5,1],[14,0],[4,1],[6,2],[9,5],[9,5],[4,3],[2,3],[1,3],[0,2],[-4,11],[2,2],[2,1],[4,1],[8,2],[4,1],[4,1],[5,3],[3,2],[4,1],[4,0],[12,-1],[17,0],[4,0],[5,-1],[14,-3],[10,-3],[3,-1],[2,-1],[2,-2],[4,-1],[4,-1],[10,0],[5,-1],[3,-1],[4,-3],[9,-6],[9,-6],[3,-2],[4,0],[21,-2],[4,-1],[3,-1],[1,-1],[-1,-2],[-2,-1],[-4,-1],[-10,-1],[-2,-1],[-3,-1],[-1,-1],[-1,-3],[0,-2],[3,-7],[1,-2],[3,-2],[14,-5],[5,-1],[14,0],[7,-1],[4,-1],[0,-2],[0,-2],[3,-2],[5,-2],[16,-1],[8,-1],[5,-1],[3,-1],[2,-2],[4,0],[8,-2],[3,-1],[3,-1],[9,-6],[11,-5],[8,-3],[8,-1],[4,0],[2,2],[2,9],[1,2],[2,2],[2,3],[4,2],[7,3],[3,-1],[1,-1],[-2,-4],[-1,-2],[1,-3],[3,-2],[10,-2],[3,-2],[1,-2],[-2,-4],[-1,-2],[1,-2],[1,-2],[3,-4],[1,-2],[-1,-1],[-2,-2],[-3,-1],[-7,-2],[-3,-1],[-3,-1],[-1,-2],[-1,-2],[1,-2],[3,-4],[5,-2],[11,-6],[2,-1],[9,-4],[11,-3],[6,0],[5,0],[1,2],[0,2],[-2,1],[-6,5],[-1,2],[0,2],[6,3],[8,0],[24,-2],[7,0],[4,1],[3,1],[6,3],[6,1],[4,0],[3,0],[2,-2],[2,-5],[2,-2],[5,-2],[3,-1],[3,1],[3,2],[3,3],[4,2],[6,2],[12,2],[6,1],[4,-1],[1,-2],[-1,-1],[-2,-2],[-1,-1],[-1,-2],[-1,-5],[-2,-2],[0,-3],[1,-2],[5,-2],[3,0],[3,1],[3,2],[3,1],[6,2],[3,0],[3,-1],[1,-5],[0,-5],[-2,-4],[-1,-2],[-1,-2],[0,-2],[1,-3],[1,-2],[2,-1],[2,-2],[10,-3],[3,-1],[1,-2],[0,-7],[4,-2],[6,-2],[16,-2],[7,-3],[4,-2],[3,-3],[3,0],[3,1],[6,5],[3,1],[3,1],[8,1],[3,1],[2,2],[0,2],[2,4],[17,5]],[[6415,7636],[-145,76],[-13,9],[-16,20],[-22,23],[-3,5],[0,4],[3,3],[7,5],[5,2],[5,1],[11,1],[15,1],[6,0],[6,2],[24,9],[5,4],[2,3],[2,9],[5,3],[15,4],[0,3],[-11,2],[-32,-2],[-26,-4],[-30,-8],[-10,1],[-8,6],[-6,6],[-10,6],[-12,2],[-9,3],[-1,5],[1,5],[6,13],[9,8],[-2,10],[-10,6],[-32,2],[-12,3],[-8,6],[-4,13],[1,6],[3,5],[4,4],[2,6],[-1,7],[-5,13],[-7,13],[-44,48],[-9,30],[-11,15],[-2,9],[3,22],[-1,6],[-6,4],[-22,-7],[-13,-2],[-16,3],[-17,5],[-41,5],[-25,2],[-29,6],[-13,-1],[-10,-4],[-18,-10],[-10,-4],[-9,-2],[-12,0],[-7,2],[-11,4],[-17,-3],[-30,-20]],[[8923,7552],[-5,-2],[-15,-2],[-3,-2],[-5,-4],[-1,-4],[1,-5],[3,-4],[11,-10],[1,-6],[-2,-4],[-6,-4],[-8,0],[-11,1],[-48,14],[-4,2],[-1,4],[2,4],[2,8],[0,4],[-1,5],[-3,6],[-16,4],[-27,3],[-59,2],[-27,-3],[-18,-3],[-11,-5],[-11,-2],[-14,0],[-14,5],[-15,14],[-12,5],[-24,-6],[-10,4],[-19,7],[-12,3],[-10,-2],[-7,-2],[-8,-4],[-9,-1],[-14,2],[-28,10],[-16,3],[-28,-1],[-16,-3],[-13,-5],[-16,-3],[-20,2],[-24,8],[-34,19]],[[8022,8215],[4,15],[-3,6],[-4,4],[-8,4],[-12,11],[-3,4],[0,4],[1,2],[6,4],[2,4],[2,5],[3,11],[3,5],[4,3],[4,1],[28,6],[4,1],[5,0],[5,-1],[3,-1],[1,-2],[4,-8],[2,-2],[4,-3],[11,-7],[1,-2],[1,-2],[0,-3],[1,-2],[1,-2],[3,-2],[3,-2],[3,-1],[15,-4],[11,-4],[5,-1],[8,1],[4,1],[2,3],[7,9],[11,9],[5,5],[3,4],[0,3],[-5,9],[0,6],[3,10],[-1,3],[-1,2],[-2,2],[-4,1],[-3,1],[-4,2],[-2,1],[-1,4],[1,4],[3,8],[4,5],[1,0],[4,0],[9,0],[4,0],[34,-1],[4,0],[3,1],[1,0],[26,10],[9,2]],[[8255,8361],[9,-6],[53,-64],[11,-20],[8,-7],[9,-7],[5,-2],[6,-3],[79,-25],[18,-13],[27,-29],[18,-12],[5,-4],[3,-4],[7,-14],[6,-5],[36,-23],[35,-17],[187,-52],[22,-5],[57,-19],[15,-8],[24,-19],[18,-20],[9,-5],[9,-4],[21,-6],[8,-5],[5,-3],[29,-34],[3,-8],[1,-9],[-4,-33],[2,-40],[-5,-31],[-5,-15],[-78,-99],[-6,-15],[7,-40],[4,-22],[4,-8],[12,-14],[4,-7],[1,-8],[-2,-8],[-8,-15],[-1,-2]],[[8923,7552],[-2,-6],[1,-8],[26,-56],[0,-7],[-1,-8],[-17,-25],[-13,-28],[-5,-29],[1,-15],[6,-14],[13,-12],[21,-10],[68,-19],[20,-10],[16,-10],[12,-11],[10,-12],[12,-21],[5,-7],[8,-7],[11,-5],[32,-10],[10,-4],[23,-14],[10,-3],[10,-4]],[[5267,637],[58,-49],[45,-25],[120,-42],[135,-72],[63,-25],[1,0],[-8,-36],[5,-53],[-13,-21],[-32,-18],[-89,-38],[-30,-21],[-18,-28],[-1,-28],[-7,-26],[-40,-19],[-13,-5],[-6,-6],[-4,-6],[-8,-6],[-35,-12],[-6,-4],[-10,-14],[-14,-9],[-20,-1],[-25,8],[-11,7],[-7,8],[-10,7],[-16,3],[-14,-3],[-21,-10],[-1,-1],[-12,-3],[-25,3],[-19,11],[-23,31],[0,6],[4,7],[0,5],[-12,3],[-14,1],[-9,3],[-7,6],[-5,7],[-19,15],[-26,3],[-28,-4],[-42,-9]],[[5121,625],[7,13],[0,3],[-2,3],[-3,1],[-3,2],[-9,2],[-6,2],[-8,5],[-2,3],[1,3],[6,5],[2,1],[2,1],[3,0],[9,1],[4,0],[15,3],[5,0],[4,0],[3,-1],[3,-1],[4,0],[3,1],[9,2],[3,-1],[3,-1],[3,-2],[4,-1],[4,0],[4,-1],[3,-1],[3,-2],[2,-2],[0,-8],[1,-3],[2,-2],[5,-3],[8,-8],[7,-1],[5,-1],[39,0],[3,0]],[[4478,829],[148,3],[49,12],[15,15],[40,-4],[17,-8],[22,-3],[9,-3],[2,1],[39,-1],[-9,14],[-19,14],[-79,18],[35,7],[35,-4],[31,-13],[47,-16],[41,-8],[21,-2],[18,-2],[23,-3],[21,-3],[8,-4],[34,-8],[41,-13],[11,-7],[123,-117],[66,-57]],[[7162,8548],[0,1],[-7,6],[-50,18],[-10,3],[-3,3],[-3,3],[-2,3],[0,4],[12,16],[20,14],[27,10],[29,7],[96,11],[12,0],[66,-11],[22,-2],[6,0],[17,1],[11,0],[30,-4],[31,-2],[71,-10],[17,-6],[10,-6],[11,-3],[68,-17],[16,-2],[70,-2],[21,-2],[21,-4],[19,-5],[18,-7],[12,-8],[8,-8],[11,-7],[19,-2],[9,1],[6,2],[4,2],[5,4],[20,13],[23,8],[26,4],[29,-2],[30,-8],[22,-13],[60,-57],[52,-68],[13,-13],[16,-10],[76,-37],[6,-5]]],"transform":{"scale":[0.0008300426803680343,0.0014816598033803449],"translate":[97.35140100100011,5.629890035000074]}};
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
