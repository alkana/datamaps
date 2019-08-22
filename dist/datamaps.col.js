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

    // resize container height for recalculate path geo data
    svg.select(function() { return this.parentNode; })
      .style('height', newHeight)
      .style('min-height', newHeight)
      .style('max-height', newHeight)
    ;

    // resize svg himself
    svg
      .attr('height', newHeight)
      .attr('width', options.element.clientWidth)

    // redraw subunit
    g.selectAll('path').remove();
    this.path = this.options.setProjection.call(this, options.element, options).path;
    drawSubunits.call(this, this[options.scope + 'Topo'] || this.options.geographyConfig.dataJson);

    // rezoom at the same point
    var ngSize = g.node().getBoundingClientRect();
    
    // rescale if the actual scale is not into the limit
    newTransform.x = cTransform.x / (cgSize.width / ngSize.width);
    newTransform.y = cTransform.y / (cgSize.height / ngSize.height);
    
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
  Datamap.prototype.colTopo = {"type":"Topology","objects":{"col":{"type":"GeometryCollection","geometries":[{"type":"Polygon","properties":{"name":null},"id":"-99","arcs":[[0]]},{"type":"Polygon","properties":{"name":"Amazonas"},"id":"CO.AM","arcs":[[1,2,3,4]]},{"type":"Polygon","properties":{"name":"Antioquia"},"id":"CO.AN","arcs":[[5,6,7,8,9,10,11,12]]},{"type":"Polygon","properties":{"name":"Boyacá"},"id":"CO.BY","arcs":[[13,14,15,16,17,-8,18,19]]},{"type":"Polygon","properties":{"name":"Córdoba"},"id":"CO.CO","arcs":[[20,21,-13,22]]},{"type":"Polygon","properties":{"name":"Santander"},"id":"CO.ST","arcs":[[23,-19,-7,24,25]]},{"type":"Polygon","properties":{"name":"La Guajira"},"id":"CO.LG","arcs":[[26,27,28]]},{"type":"MultiPolygon","properties":{"name":"San Andrés y Providencia"},"id":"CO.SA","arcs":[[[29]],[[30]],[[31]]]},{"type":"Polygon","properties":{"name":"Caldas"},"id":"CO.CL","arcs":[[-18,32,33,34,-9]]},{"type":"Polygon","properties":{"name":"Cundinamarca"},"id":"CO.CU","arcs":[[35,36,37,38,-33,-17]]},{"type":"Polygon","properties":{"name":"Bogota"},"id":"CO.CU","arcs":[[39,-37]]},{"type":"Polygon","properties":{"name":"Quindío"},"id":"CO.QD","arcs":[[40,41,42]]},{"type":"Polygon","properties":{"name":"Risaralda"},"id":"CO.RI","arcs":[[-35,43,-43,44,45,-10]]},{"type":"Polygon","properties":{"name":"Tolima"},"id":"CO.TO","arcs":[[-39,46,47,48,-41,-44,-34]]},{"type":"Polygon","properties":{"name":"Caquetá"},"id":"CO.CQ","arcs":[[49,50,-4,51,52,53,54]]},{"type":"MultiPolygon","properties":{"name":"Cauca"},"id":"CO.CA","arcs":[[[55]],[[56]],[[57]],[[58,-53,59,60,61,62,-48]]]},{"type":"Polygon","properties":{"name":"Huila"},"id":"CO.HU","arcs":[[63,-54,-59,-47,-38]]},{"type":"MultiPolygon","properties":{"name":"Nariño"},"id":"CO.NA","arcs":[[[-61,64,65]],[[66]]]},{"type":"Polygon","properties":{"name":"Putumayo"},"id":"CO.PU","arcs":[[-52,-3,67,-65,-60]]},{"type":"Polygon","properties":{"name":"Valle del Cauca"},"id":"CO.VC","arcs":[[-42,-49,-63,68,69,70,71,-45]]},{"type":"Polygon","properties":{"name":"Atlántico"},"id":"CO.AT","arcs":[[72,73,74,75,76]]},{"type":"MultiPolygon","properties":{"name":"Bolívar"},"id":"CO.BL","arcs":[[[77]],[[78,79,-25,-6,-22,80,81,-73]],[[82,-75]]]},{"type":"Polygon","properties":{"name":"Cesar"},"id":"CO.CE","arcs":[[83,84,-26,-80,85,-27]]},{"type":"MultiPolygon","properties":{"name":"Chocó"},"id":"CO.CH","arcs":[[[-70,86]],[[87]],[[-11,-46,-72,88]]]},{"type":"Polygon","properties":{"name":"Magdalena"},"id":"CO.MA","arcs":[[-28,-86,-79,-77,89]]},{"type":"MultiPolygon","properties":{"name":"Sucre"},"id":"CO.SU","arcs":[[[90]],[[91]],[[-21,92,-81]]]},{"type":"Polygon","properties":{"name":"Arauca"},"id":"CO.AR","arcs":[[93,94,-15,95]]},{"type":"Polygon","properties":{"name":"Norte de Santander"},"id":"CO.NS","arcs":[[-20,-24,-85,96]]},{"type":"Polygon","properties":{"name":"Casanare"},"id":"CO.CS","arcs":[[97,98,-16,-95]]},{"type":"Polygon","properties":{"name":"Guaviare"},"id":"CO.GV","arcs":[[99,100,101,-50,102]]},{"type":"Polygon","properties":{"name":"Guainía"},"id":"CO.GN","arcs":[[103,-101,104,105]]},{"type":"Polygon","properties":{"name":"Meta"},"id":"CO.ME","arcs":[[-103,-55,-64,-40,-36,-99,106]]},{"type":"Polygon","properties":{"name":"Vaupés"},"id":"CO.VP","arcs":[[107,-5,-51,-102,-104]]},{"type":"Polygon","properties":{"name":"Vichada"},"id":"CO.VD","arcs":[[-105,-100,-107,-98,-94,108]]}]}},"arcs":[[[75,4600],[-2,1],[-1,2],[1,3],[4,3],[4,1],[1,1],[0,5],[4,2],[4,0],[3,1],[2,-1],[3,-7],[-1,-2],[-4,0],[-2,-3],[-4,1],[-8,-6],[-4,-1]],[[8285,1682],[1,-25],[-11,-52],[1,-25],[-12,-39],[0,-11],[-10,-28],[-8,-35],[-19,-90],[-20,-91],[-20,-90],[-20,-91],[-19,-90],[-20,-91],[-20,-90],[-20,-90],[-19,-91],[-20,-90],[-20,-91],[-20,-90],[-19,-91],[-20,-90],[-20,-91],[-20,-90],[-1,-1],[0,-2],[-1,-1],[-1,-1],[-1,-1],[0,-2],[-1,-1],[-1,-1],[0,-1],[-1,-2],[-1,-1],[-1,-1],[0,-1],[-1,-2],[-1,-1],[-1,-1],[-18,31],[-12,15],[-14,13],[-20,14],[-68,29],[-18,14],[-7,19],[-4,20],[-8,20],[-17,19],[-22,19],[-25,16],[-26,7],[-19,-2],[-14,-7],[-27,-20],[-17,-6],[-18,0],[-36,7],[-7,4],[-91,40],[-30,3],[23,29],[53,69],[53,69],[52,69],[53,68],[53,69],[53,69],[53,68],[52,69],[16,20],[-4,1],[-8,5],[-5,7],[-5,9],[-8,24],[-8,4],[-13,-7],[-4,-5],[-3,-6],[-4,-5],[-6,-1],[-6,3],[-1,5],[0,5],[-2,6],[-13,9],[-12,-3],[-11,-5],[-12,4],[-8,10],[-9,24],[-9,11],[-15,6],[-12,-4],[-14,-7],[-16,-3],[-4,1],[-4,4],[-3,6],[-1,4],[3,3],[12,4],[3,1],[3,13],[-8,5],[-14,1],[-15,0],[-7,-1],[-16,-6],[-7,-1],[-8,4],[-4,4],[-2,6],[-4,6],[-9,6],[-11,5],[-13,3],[-11,2],[-11,4],[-8,8],[-9,5],[-12,-7],[-1,-5],[0,-6],[0,-5],[-6,-3],[-27,0],[-5,3],[-1,7],[0,8],[-1,6],[-4,6],[-21,14],[-3,2],[0,16],[-2,4],[-3,3],[-18,2],[-12,2],[-25,8],[-23,12],[-35,31],[-20,11],[-14,-5],[-17,2],[-29,10],[-19,1],[-7,-8],[1,-13],[6,-14],[-6,-3],[-8,-1],[-8,2],[-17,8],[-9,1],[-18,-3],[-16,-6],[-13,-27],[-19,-8],[-12,-8],[-8,-1],[-7,2],[-8,5],[-7,1],[-10,-3],[-14,-6],[-13,-3],[-5,8],[-48,-20],[-23,-4],[-8,12],[3,4],[9,7],[2,5],[-2,6],[-16,17],[-12,17],[-7,2],[-9,-8],[-7,-21],[-5,-7],[-11,5],[-5,8],[0,24],[-4,10],[-7,5],[-39,7],[-14,6],[-12,8],[-14,7],[-16,2],[-22,-10],[-13,-1],[-6,9],[1,20],[-5,3],[-15,-6],[-39,-20],[-7,-1],[-3,-5],[-24,-31],[-32,-21],[-5,-4],[-3,-13],[-9,-7],[-11,-2],[-43,5],[-22,0],[-18,-6],[-19,-14],[-30,-28],[-10,-3],[-43,8],[-7,0],[-17,-3],[-4,-2],[1,-12],[-2,-4],[-6,-1],[-16,-2],[-27,-6],[-15,-1],[-12,3],[-12,5],[-9,7],[-3,7],[-6,4],[-70,9],[-12,3],[-31,21],[-12,5],[-12,2],[-8,-9],[-18,-31],[-9,-7],[-11,-3],[-4,2],[-2,14],[-2,6],[-3,5],[-3,4],[-9,-3],[-5,-4],[-3,-6],[-2,-7],[-18,11],[-11,3],[-17,-7],[-19,-5],[-8,-7],[-9,-3],[-29,-4],[-6,0],[-5,3],[-7,9],[-11,26],[-10,8],[-2,3],[-47,21],[-1,-6],[-8,-13],[-9,-6],[-4,12],[-6,5],[-29,6],[-12,6],[-1,4],[-3,17],[-3,3],[-9,6],[-2,3],[-1,3],[-7,8],[-1,6],[1,5],[2,4],[6,6],[25,19],[6,12],[20,27],[-9,7],[-6,12],[-3,13],[-5,10],[-12,15],[-4,7],[-3,9],[1,8],[7,14],[1,5],[-3,9],[-16,16],[-4,8],[5,21],[-4,6],[-6,3],[-6,2],[-7,4],[-18,17],[-7,0],[-2,-15],[-5,-2],[-22,5],[-11,-1],[-11,-9],[-5,-6],[-7,1],[-16,12],[-8,5],[-8,0],[-8,0],[-9,1],[-8,-1],[-3,1],[-1,2],[-2,7],[-1,2],[-44,22],[-13,14],[1,22],[8,19],[6,8],[16,8],[1,11],[-7,23],[-1,8],[0,6],[-1,5],[-5,6],[-15,9],[-7,10],[-25,10],[-6,8],[10,11],[3,6],[-10,4],[-4,3],[-3,5],[-1,4],[-1,12],[-1,5],[-3,4],[-2,0],[-9,-1],[-3,1],[-1,2],[-1,6],[-5,9],[-2,6],[-3,5],[-16,4],[-13,8],[-7,2],[-16,2],[-13,6],[-9,9],[-6,10],[-10,-3],[-11,-15],[-11,-5],[-8,0],[-11,2],[-18,5],[-9,6],[-7,5],[-12,16],[-10,22],[-4,6],[-11,3],[-21,-4],[-9,4],[-1,5],[6,10],[-1,4],[-5,4],[-4,-1],[-2,-4],[-3,-2],[-7,-3],[-3,-3],[-4,-1],[-8,3],[-6,4],[-3,5],[-16,39],[-8,6],[-10,-17],[-18,0],[-41,13],[-41,6],[-18,8],[-15,17],[-9,25],[-7,7],[-17,10],[-4,5],[5,7],[8,1],[11,-2],[9,0],[4,6],[-3,8],[-7,5],[-4,7],[5,9],[-5,2],[-12,0],[-6,2],[-5,2],[-23,21],[-4,9],[0,10],[3,5],[9,6],[1,4],[-32,58],[-1,5]],[[4922,2061],[371,96]],[[5293,2157],[51,-8],[12,0],[9,3],[19,9],[10,0],[12,-4],[20,-11],[3,-1],[4,0],[4,-1],[4,-3],[1,-4],[-2,-10],[1,-4],[2,-2],[3,-2],[2,0],[3,-1],[7,0],[8,1],[7,0],[7,-5],[8,-17],[5,-7],[8,-4],[51,-7],[30,2],[31,-1],[14,2],[12,5],[6,5],[6,1],[12,-3],[22,-14],[25,-21],[26,-17],[27,-2],[23,5],[18,0],[16,4],[15,13],[41,24],[76,-42],[47,8],[24,13],[20,3],[20,-7],[70,-48],[17,-9],[18,-7],[10,1],[7,8],[8,12],[33,30],[21,16],[17,5],[21,-10],[21,-18],[23,-12],[30,4],[18,12],[8,7],[3,11],[1,3],[-2,17],[0,19],[4,18],[13,14],[14,13],[12,14],[22,29],[9,9],[36,16],[26,21],[17,7],[20,2],[92,-1],[26,4],[22,8],[14,12],[10,17],[7,24],[26,25],[43,24],[124,45],[35,17],[45,37]],[[7004,2453],[16,-13],[10,-4],[11,-3],[11,-1],[11,0],[28,11],[13,0],[10,-12],[6,-23],[7,-9],[14,-5],[14,-4],[26,-11],[12,-3],[8,1],[14,6],[9,0],[8,-5],[8,-7],[20,-24],[5,-9],[3,-9],[1,-10],[-3,-10],[-4,-6],[0,-7],[26,-27],[16,-37],[16,-30],[4,-5],[6,-1],[24,-1],[11,2],[8,5],[3,9],[7,9],[13,1],[15,-4],[12,-5],[19,-13],[8,-3],[7,-1],[15,3],[8,0],[10,-5],[13,-14],[10,-3],[33,2],[11,-2],[11,-6],[11,-10],[8,-11],[5,-10],[-1,-9],[-1,-8],[3,-5],[28,1],[36,-7],[13,2],[4,6],[-1,15],[7,7],[14,7],[12,3],[13,0],[15,-4],[15,-7],[3,-6],[-6,-7],[-43,-33],[-14,-16],[1,-13],[7,0],[11,3],[11,1],[11,-8],[3,-9],[-1,-12],[-3,-21],[0,-10],[2,-9],[7,-18],[-1,-8],[-9,-6],[-10,-5],[-7,-7],[6,-20],[21,-19],[13,-18],[-14,-19],[-21,-10],[-7,-7],[-3,-9],[4,-11],[10,-12],[12,-8],[12,2],[16,13],[9,3],[5,-7],[-2,-8],[-8,-15],[-1,-7],[5,-6],[34,-21],[12,-3],[14,1],[12,6],[6,11],[-8,15],[-17,11],[-10,13],[16,18],[12,5],[8,0],[13,-6],[3,-1],[3,-1],[3,0],[3,0],[9,5],[6,6],[7,4],[20,-8],[10,2],[11,5],[10,3],[15,1],[4,-5],[-3,-7],[-5,-7],[-3,-3],[-9,-6],[-3,-4],[-1,-3],[0,-8],[0,-3],[-10,-18],[1,-8],[10,-6],[13,-1],[11,5],[10,7],[11,5],[16,0],[31,-10],[14,0],[7,5],[6,15],[5,6],[10,3],[11,-2],[9,-4],[27,-21],[9,-9],[3,-9],[-3,-10],[-4,-9],[-3,-9],[1,-11],[5,-11],[6,-3],[7,1],[35,16],[10,-1],[47,-19],[10,-1],[3,-1],[7,-2],[4,-4],[3,-8],[22,-21],[1,-1]],[[4639,6974],[158,-107],[13,-17],[12,-15],[7,-7],[7,-16],[7,-56],[6,-16],[8,-11],[9,-4],[8,-5],[3,-7],[-1,-10],[-11,-16],[-12,-9],[-15,-8],[-14,-9],[-9,-14],[-9,-46],[0,-18],[3,-14],[13,-25],[23,-23],[14,-11],[13,-2],[14,2],[15,11],[9,8],[11,24],[8,10],[27,18],[11,-31],[-3,-14],[-4,-9],[-7,-7],[-14,-13],[-5,-7],[-2,-13],[2,-13],[0,-22],[-6,-19],[0,-14],[5,-18],[11,-22],[6,-18],[8,-16],[1,-12],[4,-12],[7,-8],[16,-6],[13,-2],[19,2],[13,-2],[217,171]],[[5248,6476],[0,-2],[-5,-25],[7,-71],[3,-12],[7,-9],[8,-8],[5,-8],[4,-23],[-9,-15],[-16,-11],[-56,-22],[-6,-4],[-4,-8],[-28,-25],[-21,-34],[-9,-10],[-124,-76],[-26,-10],[-26,-3],[-11,-3],[-4,-8],[-2,-5],[-8,-16],[-1,-4],[2,-52],[1,-7],[12,-10],[4,-6],[1,-6],[-3,-7],[-6,-5],[-7,-1],[-7,2],[-31,-39],[-17,-15],[-24,-14]],[[4851,5904],[-18,-11],[-14,-12],[-8,-14],[-6,-25],[-8,-13],[-3,-7],[0,-9],[4,-5],[9,-9],[5,-9],[1,-9],[-1,-23],[1,-4],[1,-4],[0,-4],[-2,-5],[-3,-2],[-12,-3],[-3,-3],[-1,-10],[10,-23],[-2,-5],[-9,-3],[-9,-7],[-8,-9],[-5,-8],[-6,-35],[-9,-16]],[[4755,5617],[-6,-2],[-2,1],[-6,5],[-2,1],[-2,0],[-6,-2],[-4,0],[-5,-1],[-2,-1],[-2,-2],[-1,-4],[-2,-4],[-3,-6],[-3,-12],[-9,-13],[-22,-6],[-7,3],[-28,15],[-7,6],[-2,2],[-3,2],[-14,3],[-15,-3],[-25,-4],[-43,-10],[-4,-6],[-3,-3],[-2,-3],[-3,-4],[-4,-2],[-5,-3],[-8,-4],[-14,-4],[-25,-2],[-1,-14],[0,-16],[1,-3],[0,-2],[-6,-9],[-22,-21],[-1,-4],[-2,-2],[-4,-1],[-16,-2],[-3,0],[-6,-2],[-10,-4],[-14,-7],[-6,-5],[-4,-3],[-7,-10],[-3,-4],[-3,-2],[-2,-3],[-8,-10],[-4,-2],[-3,0],[-11,22],[-17,-6],[3,21],[-1,3],[-1,6],[-16,39],[-5,7],[-4,1],[-5,2],[-5,2],[-6,7],[-2,5],[2,6],[0,11],[-1,5],[-4,4],[-11,2],[-4,2],[-4,2],[-2,2],[-7,3],[-30,-14],[-4,0],[-7,0],[-4,2],[-26,8],[-3,3],[-3,2],[0,3],[-1,2],[-2,2],[0,1],[-8,6],[-9,1],[-21,7],[-8,0],[0,-2],[0,-17],[4,-7],[10,-3],[-4,-18],[0,-8],[11,-31],[1,-11],[-1,-11],[-3,-14],[-10,3],[-8,2],[-15,-1],[-14,1],[-15,0],[-6,1],[-8,7],[-7,4],[-10,6],[-10,-1],[-44,-26],[-36,-12]],[[3950,5459],[-14,-1],[-31,3],[-24,8],[-15,8],[-12,10],[-9,13],[-19,8]],[[3826,5508],[-27,23],[-4,4],[-7,10],[1,9],[8,24],[-2,15],[-5,8],[-19,26],[-4,12],[-4,15],[2,14],[19,38],[-5,26],[-17,7],[-18,0],[-17,6],[-19,20],[-15,35],[-6,34],[-7,9],[-12,8],[-24,2],[-25,0],[-26,-2],[-22,-4],[-32,-3],[-38,-3],[-30,-5],[-54,-1],[-16,1],[-18,4],[-9,6],[-1,1],[-5,6],[-3,11],[-7,10],[-18,17],[-2,3],[-3,13],[-3,1],[-5,1],[-5,1],[-5,4],[-2,9],[1,11],[5,10],[5,5],[-6,3],[-3,1],[7,8],[-1,7],[-5,6],[-6,9],[6,1],[4,1],[2,2],[2,4],[-11,2],[-2,6],[5,7],[6,6],[0,5],[-16,16],[-10,-2],[-5,5],[-6,7],[-7,6],[1,10],[-4,7],[-6,6],[-10,4],[-8,-4],[-4,7],[2,11],[6,9],[4,0],[5,-3],[3,0],[2,9],[-3,3],[-15,1],[-5,1],[-5,7],[1,5],[2,4],[2,6],[-4,3],[-6,-4],[-5,-6],[1,-3],[-7,1],[-5,2],[-2,4],[0,6],[-2,5],[-5,1],[-6,0],[-6,0],[13,12],[1,3],[-2,6],[-10,6],[-2,6],[0,21],[-2,5],[10,3],[20,5],[9,1],[22,11],[31,-3],[6,2],[3,4],[8,7],[6,6],[3,9],[-3,21],[-3,9],[-3,6],[-5,3],[-4,1],[-2,2],[-4,7],[-1,5],[2,8],[10,4],[14,5],[19,3],[43,3],[14,-1],[56,-11],[12,-3],[9,-4],[16,-1],[22,31],[2,5],[3,11],[-2,62],[-14,35],[-9,11],[-30,21],[-7,4],[-10,3],[-23,2],[-18,10],[-13,9],[-54,55],[-70,63],[-70,41],[-87,65],[-6,7],[-5,8],[2,2],[3,2],[2,0],[2,0],[-1,3],[-1,3],[-2,2],[-1,0],[0,23],[18,-3],[15,8],[13,12],[11,6],[9,8],[13,57],[4,8],[6,6],[12,7],[2,10],[5,6],[4,12],[-4,46],[-4,11],[-5,9],[-7,27],[-1,2]],[[3191,7012],[6,-1],[4,7],[5,0],[4,-6],[0,-9],[-4,0],[-2,2],[-3,1],[0,-14],[5,-10],[8,-3],[10,4],[0,-11],[10,8],[2,-6],[-6,-9],[-1,-8],[-3,1],[-8,1],[-3,1],[5,-20],[16,-8],[15,2],[2,11],[41,0],[-4,-5],[-4,-6],[-2,-6],[0,-6],[5,0],[3,1],[6,3],[0,-4],[-23,-8],[0,-4],[6,0],[4,-2],[6,-5],[-1,-1],[0,-1],[-1,-2],[-3,2],[-4,2],[-5,0],[-6,0],[5,-5],[7,-4],[6,-4],[5,-7],[-17,7],[-18,4],[-16,-1],[-9,-10],[-1,-2],[1,-1],[2,0],[2,0],[-12,-32],[18,-20],[36,-9],[41,-1],[8,1],[8,3],[7,3],[5,5],[2,5],[0,3],[-1,3],[-1,6],[1,4],[7,6],[1,5],[4,35],[-1,16],[-8,13],[-1,-5],[-1,-2],[0,-4],[2,-5],[-4,0],[-3,9],[-3,13],[0,13],[8,19],[-3,12],[-9,19],[-3,18],[0,78],[-3,11],[-9,4],[-10,3],[-4,8],[-3,10],[-4,10],[-13,12],[-22,12],[-24,9],[-20,2],[0,-4],[-8,6],[12,14],[16,16],[9,12],[66,17],[16,2],[66,15],[9,4],[3,5],[1,6],[1,6],[2,6],[6,3],[0,3],[-5,0],[0,4],[13,2],[46,14],[9,5],[30,25],[35,20],[4,3]],[[3555,7356],[4,-2],[18,-15],[5,-11],[10,-45],[17,-19],[12,-17],[10,-8],[36,-11],[11,-8],[11,-14],[11,-14],[9,-46],[1,-24],[-2,-24],[-36,-34],[-32,-38],[-35,-59],[-20,-25],[-13,-19],[2,-52],[-2,-15],[-9,-27],[-24,-31],[-25,-75],[0,-54],[5,-25],[43,-76],[18,-48],[253,-5],[44,-1],[66,-3],[8,2],[8,4],[0,6],[3,9],[48,55],[19,12],[24,6],[40,7],[25,7],[12,7],[17,21],[13,47],[8,9],[12,9],[18,9],[21,39],[11,9],[35,20],[19,14],[25,26],[41,37],[9,10],[15,18],[9,3],[17,5],[51,4],[15,-1],[12,-3],[9,-1],[9,2],[10,5],[10,2],[13,0],[37,-1],[21,22],[17,24],[12,9],[11,7],[12,3]],[[6552,6314],[20,-4]],[[6572,6310],[-1,-2],[-4,-14],[-8,-11],[-25,-54],[-13,-20],[-9,-24],[-13,-14],[-15,-6],[-5,-10],[-16,-107],[-7,-19],[-6,-9],[-8,-8],[-12,-4],[-9,-1],[-7,-2],[-7,-4],[-6,-7],[-7,-6],[-5,-3],[-6,1],[-4,2],[-3,3],[-2,1],[-4,-1],[-6,-3],[-6,-6],[-3,-5],[-1,-7],[-5,-14],[-18,-13]],[[6331,5943],[-22,-10],[-28,-37],[-13,-36],[-1,-6],[2,-4],[10,-4],[4,-4],[4,-13],[4,-8],[3,-7],[4,-7],[20,-17],[-2,-11],[-9,-15],[-6,-28],[-15,-42],[-3,-4],[-15,-3],[-11,-3],[-6,-5],[-5,-4],[1,-11],[64,-29],[27,-16],[5,-14],[14,-8],[15,-18],[16,-11],[-10,-8],[-5,-1],[-5,-5],[-3,-5],[-3,-10],[-2,-8],[-3,-6],[-9,-7],[-4,-6],[-2,-5],[-9,-39],[-5,-3],[-6,1],[-8,5],[-15,9],[-5,4],[-6,9],[-4,5],[-4,3],[-8,-1],[-7,-3],[-16,-15],[-75,-67],[-14,-20],[-9,-12],[-29,-13],[-39,-30],[-13,1],[-19,21],[-13,8],[-16,20],[-5,5],[-14,5],[-15,-11],[-7,-3],[-11,-8],[-11,-10],[-37,-44],[-6,-5],[3,-20],[-6,-4],[-2,-3],[-2,-5],[-3,-13],[0,-7],[3,-9],[7,-9],[17,-11],[5,-7],[-11,-16],[-4,-13],[-3,-6],[-12,-9],[-16,-15],[-25,9],[-9,-1],[-4,-4],[-11,-37],[-2,-25],[-11,-25],[-2,-11],[14,-32],[-3,-11]],[[5839,5035],[-10,0],[-4,-3],[-1,-3],[1,-3],[-1,-3],[-2,-3],[-8,-12],[-2,-4],[-5,-4],[-9,-4],[-28,-2],[-27,9],[-15,0],[-5,10],[-2,16],[-6,4],[-7,2],[-7,0],[-6,0],[-12,-3],[-8,1],[-5,4],[-4,6],[-13,20],[-26,8],[-2,3],[3,9],[-5,6],[-9,10],[-11,13],[-6,4],[-19,5],[-56,1],[-15,17],[0,7],[21,33],[-2,19],[26,16],[2,7],[-10,16],[-3,12],[4,8],[-3,7],[-16,23],[-5,16],[2,14],[-10,15],[-3,4],[-11,8],[-18,11],[-4,7],[-2,8],[0,6],[3,8],[4,6],[-5,6],[0,5],[-1,0],[-6,4],[-28,21],[-6,12],[-2,5],[-4,1],[-5,-2],[-8,0],[-11,4],[-15,12],[-14,-3],[-35,14],[0,29],[-5,3],[-3,0],[-7,-1],[-6,-2],[-15,-11],[-37,-32],[0,-11],[-5,-12],[-19,-4],[-44,-34],[-32,15],[-10,1],[-10,5],[-8,5],[-6,8],[0,12],[-33,-2],[-8,3],[-12,5],[-21,10],[-16,0],[-8,0],[-4,4],[-1,4],[1,11],[0,3],[-5,12],[-29,23],[-9,16],[-1,5],[1,7],[9,12],[6,7],[2,7],[-1,5],[-5,6],[-4,8],[1,10],[-1,7],[-1,5],[-5,5],[-1,6],[0,5],[1,3],[-1,2],[-1,2],[-3,1],[-2,1],[-3,2],[-1,3],[-1,3],[-2,3],[-4,4],[-6,0],[-10,-5],[-20,-15],[-10,-5],[-6,-4],[-17,-4],[-31,5],[-9,3],[-10,3],[-12,2],[-5,-1],[-8,-5],[-16,-6],[-36,-5],[-11,-4]],[[4766,5607],[-3,3],[-5,3],[-3,4]],[[4851,5904],[4,-13],[0,-4],[6,-18],[7,-10],[10,-26],[26,-34],[15,-12],[9,-6],[9,-5],[5,-3],[6,-2],[6,-2],[7,-2],[9,2],[18,11],[9,4],[9,1],[7,-4],[6,-8],[8,-16],[7,-11],[6,-11],[0,-10],[-17,-25],[-3,-12],[-1,-8],[9,-20],[11,-1],[5,0],[8,5],[9,6],[9,13],[14,7],[14,-11],[28,-6],[10,-8],[6,-18],[12,0],[7,-2],[7,-4],[12,-19],[15,-16],[24,-11],[8,1],[8,3],[5,0],[14,5],[11,0],[8,0],[6,-3],[5,-3],[-1,-15],[30,16],[44,9],[21,3],[15,-1],[14,-4],[12,-6],[13,-9],[6,-5],[7,4],[2,6],[1,5],[0,13],[7,28],[6,16],[1,13],[-1,12],[-3,9],[3,10],[14,17],[3,20],[7,11],[29,19],[3,6],[21,31],[11,-9],[30,-12],[28,-22],[8,-10],[2,-7],[0,-10],[-2,-11],[-10,-23],[-10,-13],[-16,-7],[-1,-9],[-1,-2],[-15,-8],[-5,-3],[2,-19],[27,-28],[9,-5],[8,1],[9,19],[14,11],[7,14],[2,13],[3,2],[4,1],[23,-6],[17,2],[33,43],[12,28],[12,4],[4,0],[8,-1],[16,-9],[22,-10],[62,-8],[12,0],[7,6],[10,27],[50,50],[7,10],[9,10],[19,5],[20,5],[12,7],[13,27],[12,6],[7,2],[11,7],[4,7],[2,6],[0,10],[2,11],[-9,17],[14,32],[-4,23],[5,22],[-3,7],[-4,9],[-6,6],[-7,4],[-21,17],[-5,10],[7,9],[13,3],[7,0],[12,-10],[24,-15],[11,-12],[7,-12],[13,-28],[12,-3],[19,4],[24,21],[13,5],[7,4],[6,7],[0,33],[4,9],[26,38],[11,42],[3,22],[-7,19],[-1,9],[2,7],[5,12],[-18,40]],[[6208,6259],[17,-3],[38,-17],[15,-2],[12,1],[12,6],[18,14],[8,8],[7,9],[7,15],[12,20],[16,-3],[4,-11],[5,-2],[6,1],[6,3],[6,5],[5,5],[2,5],[1,4],[2,5],[5,3],[14,4],[55,-1],[18,-4],[13,-4],[13,-6],[27,0]],[[4057,7663],[1,-1],[-1,-34],[18,-5],[5,-3],[21,-5],[36,-14],[9,-10],[12,-11],[25,-5],[3,-5],[3,-1],[5,0],[9,-1],[11,-5],[5,-24],[19,-24],[117,-45],[29,-17],[-6,-11],[2,-4],[13,-15],[2,-3],[-3,-4],[-3,-2],[-2,-27],[-8,-5],[-33,-8],[-11,0],[-7,-3],[-9,-5],[-14,-12],[-7,-4],[-6,-4],[-4,-6],[-3,-21],[13,-35],[-4,-15],[0,-8],[2,-12],[13,-36],[0,-24],[4,-28],[4,-10],[5,-7],[7,-6],[28,-11],[22,-12],[25,-21],[71,28],[29,7],[37,11],[16,1],[9,0],[13,-9],[25,-16],[19,-26],[16,-12],[9,-6],[8,-7],[4,-9],[-1,-31]],[[4659,7025],[2,-10],[2,-3],[-1,-4],[-10,-8],[-4,-5],[-4,-5],[0,-7],[-5,-9]],[[3555,7356],[11,8],[0,4],[-5,7],[6,4],[41,8],[16,8],[12,1],[6,4],[3,5],[6,7],[25,15],[6,6],[-6,20],[7,16],[13,13],[22,16],[7,7],[4,8],[8,47],[4,8],[4,1],[19,5],[3,2],[9,2],[3,6],[-1,11],[2,10],[2,5],[8,6],[6,4],[6,2],[27,7],[22,6],[19,9],[16,11],[1,14],[5,8],[15,-2],[8,-5],[22,1],[23,3],[16,6],[6,-2],[5,-3],[3,-4],[0,-7],[-9,3],[-10,1],[-9,-2],[-9,-5],[6,-3],[4,-1],[4,0],[5,4],[4,-4],[3,-1],[1,-2],[1,-5],[21,12],[13,5],[15,2],[15,-2],[12,-3]],[[5453,6719],[11,-10],[4,-4],[7,-4],[17,-6],[16,-12],[16,-16],[2,-4],[1,-2],[0,-2],[1,-2],[7,-9],[5,-4],[10,-5],[10,-3],[13,-3],[36,-4],[12,-6],[4,-6],[7,-2],[12,-1],[23,1],[19,-1],[13,-1],[2,4],[7,25],[10,13],[6,4],[5,1],[8,-1],[2,-1],[4,-1],[4,-1],[13,1],[21,-2],[15,0],[7,-1],[5,-1],[2,-1],[3,-1],[9,0],[4,0],[10,-3],[7,4],[13,3],[24,-4],[-2,-5],[0,-3],[0,-4],[4,-18],[3,-7],[6,-8],[49,-32],[1,-8],[-1,-7],[3,-12],[20,-25],[8,-7],[0,-3],[0,-1],[10,-4],[-2,-31],[-25,-25],[10,-11],[2,-3],[5,-6],[2,-2],[5,-3],[6,-3],[2,-2],[0,-5],[0,-8],[1,-4],[2,-3],[0,-3],[-4,-8],[-9,-9],[-25,-33],[5,-8],[2,-1],[18,-7],[16,-2],[16,-4],[6,-2],[7,-6],[8,-4],[17,-13],[12,4],[5,3],[3,1],[9,0],[4,0],[5,1],[5,-2],[3,-6],[3,-8],[2,-2],[3,2],[2,2],[3,5],[1,3],[4,0],[3,0],[5,-2],[6,0],[19,3],[8,2],[4,1],[5,1],[6,-1],[4,-2],[4,-4],[2,-6],[3,-13],[0,-9],[-2,-17],[3,-15],[13,1],[3,2],[5,4],[2,2],[5,8]],[[5248,6476],[4,23],[8,23],[8,16],[1,5],[-2,6],[-6,8],[-1,6],[0,22],[3,8],[38,39],[2,5],[9,4],[3,8],[0,19],[1,5],[3,6],[1,5],[-3,5],[-5,8],[1,4],[4,5],[2,6],[6,32],[-1,13],[-8,33],[-3,5],[-7,5],[-9,34],[2,7],[-12,31],[-1,11],[1,10],[5,18],[7,15],[0,1],[13,6],[3,0],[6,6],[4,7],[6,4],[7,2],[7,7]],[[5345,6959],[4,-28],[1,-8],[5,-12],[28,-40],[1,-10],[3,-3],[3,-3],[3,-1],[5,0],[3,-1],[2,-1],[5,-5],[3,-1],[4,-3],[2,-3],[2,-2],[4,-10],[0,-10],[-4,-10],[-19,-13],[-9,-5],[-3,-2],[-11,-10],[-4,-5],[-1,-6],[3,-8],[1,-5],[0,-5],[-4,-7],[-3,-3],[-1,-16],[85,-4]],[[5932,8231],[-1,0],[-16,-3],[-26,-9],[-11,-2],[-12,-1],[-12,0],[-10,1],[-11,5],[-11,2],[-13,-2],[-12,-4],[-10,-3],[-6,3],[-4,10],[-4,8],[-8,7],[-13,4],[3,6],[5,6],[8,3],[13,20],[9,4],[8,20],[9,9],[6,14],[3,6],[8,9],[-7,9],[-26,18],[-27,13],[-20,5],[-18,9],[-20,4],[-5,8],[1,6],[3,8],[0,6],[-2,15],[-3,10],[-8,9],[-9,5],[-12,-1],[-24,4],[-18,1],[-15,2],[-44,2],[-103,-12]],[[5467,8465],[-15,42],[-3,23],[-4,7],[-8,10],[-1,5],[1,5],[4,14],[4,8],[1,30],[1,7],[0,6],[-2,8],[1,3],[3,3],[6,1],[4,2],[3,2],[9,9],[3,2],[5,3],[4,4],[12,32],[-1,15],[0,1]],[[5494,8707],[109,0],[75,10],[6,3],[5,5],[20,13],[17,7],[4,3],[5,5],[8,13],[3,2],[8,2],[6,5],[9,10],[8,6],[22,8],[39,30],[81,35],[117,79],[13,6],[24,7],[41,7],[11,4],[20,13],[14,-4],[14,6],[15,9],[15,4],[40,1],[13,3],[11,5],[17,12],[22,4],[29,17],[36,12],[8,9],[13,10],[2,6],[2,5],[8,20],[24,31],[7,19],[15,16],[5,7],[1,11],[-3,31],[-3,12],[-4,4],[-6,5],[-6,3],[-2,-1],[1,8],[6,4],[16,8],[20,-6],[70,10],[23,-5],[-2,-10],[-28,-24],[10,-4],[10,-15],[12,-4],[20,8],[3,1],[2,8],[5,6],[6,5],[6,3],[8,0],[10,-1],[7,1],[3,5],[-3,6],[-5,5],[-2,5],[5,6],[-7,4],[-4,4],[-4,4],[-8,3],[-9,0],[-8,-1],[-7,-2],[-4,-5],[-4,0],[-6,8],[31,17],[25,18],[2,2],[3,8],[2,1],[12,0],[4,0],[10,6],[5,1],[8,-3],[-11,-5],[-9,-6],[-2,-8],[8,-8],[5,-2],[4,-1],[10,3],[0,1],[0,3],[-1,3],[3,1],[9,-1],[3,1],[12,5],[9,5],[4,6],[2,11],[-1,0],[-4,1],[-2,1],[2,5],[5,4],[6,2],[7,2],[6,0],[-4,-10],[4,-5],[6,-4],[3,-8],[4,0],[2,2],[3,4],[1,4],[-3,2],[-5,1],[4,3],[5,3],[3,0],[8,4],[9,2],[9,4],[6,6],[-8,-1],[-7,-2],[-6,-3],[-4,-2],[-7,2],[1,5],[6,5],[7,3],[-8,0],[-7,-1],[-5,-2],[-4,-4],[1,9],[1,3],[3,3],[-9,-4],[-17,-13],[-6,-6],[-5,4],[7,10],[10,9],[13,6],[14,2],[13,-2],[21,-7],[14,-3],[49,0],[14,-2],[14,-5],[21,-12],[9,-7],[5,-3],[8,-2],[25,1],[6,-2],[13,-9],[14,-4],[31,-5],[22,-9],[13,-8],[7,-9],[3,-3],[3,-5],[3,-11],[41,-57],[4,-15],[26,-31],[4,-11],[-4,-12],[-9,-12],[-8,-9],[-18,-11],[-46,-21],[-14,-12],[-10,-5],[-11,-3],[-9,-2],[-3,-4],[-13,-31],[-3,-4],[-21,0],[-12,-5],[-23,-16],[-26,-10],[-19,-4],[-39,-8],[-39,-8],[-40,-9],[-39,-8],[-40,-9],[-39,-8],[-40,-9],[-39,-8],[-18,-4],[-13,-7],[-11,-14],[-7,-10],[-20,-31],[-20,-30],[-20,-31],[-21,-31],[-20,-31],[-20,-30],[-20,-31],[-20,-31],[-7,-7],[-12,-3],[-25,6],[-13,1],[-13,-2],[-38,-12],[-29,-1],[-14,-2],[-12,-6],[-3,-5],[-1,-11],[-2,-6],[-5,-5],[-13,-12],[-5,-6],[-23,-47],[-12,-14],[-13,-10],[-29,-17],[-18,-16],[-16,-25],[-32,-77],[-18,-24],[-42,-40],[-12,-29],[-10,-11],[-11,-9],[-10,-11],[-5,-11],[0,-3]],[[13,9396],[-9,-1],[-4,5],[8,7],[-5,11],[2,11],[7,10],[10,6],[3,-6],[-12,-43]],[[241,9856],[-11,-2],[-3,12],[5,12],[9,6],[10,-4],[3,-10],[-4,-8],[-9,-6]],[[1100,9999],[1,0],[0,-1],[-1,0],[0,1]],[[4766,5607],[0,-20],[1,-2],[2,-2],[2,-2],[5,-2],[-2,-3],[-2,-4],[-4,-7],[-5,-5],[-1,-5],[6,-2],[4,-7],[-4,-15],[-12,-24],[11,-3],[3,-4],[-5,-3],[-11,-2],[-9,-2],[-2,-6],[5,-5],[8,-3],[-4,-8],[-1,-10],[2,-11],[3,-9],[-9,-1],[-2,-4],[3,-12],[-3,-3],[-4,-3],[-5,-4],[-5,-14],[-13,-19],[-3,-11],[-2,-3],[-11,-8],[-3,-2],[-3,-3],[1,-7]],[[4697,5347],[-7,-1],[-26,9],[-24,6],[-6,0],[-14,-3],[-13,-4],[-26,4],[-14,0],[-24,-7],[-14,-2],[-10,0],[-12,-4],[-5,-4],[-17,-6],[-3,-10],[-28,-34],[-4,-7],[-1,-3],[-2,-3],[-4,-2],[-6,-2],[-10,2],[-14,6],[-20,-7],[-6,-6],[-10,-5],[-12,-3],[-9,0],[-8,2],[-9,-1],[-10,-4],[-14,-11],[-15,-15],[-7,-14],[12,-5],[9,-13],[-21,-35],[-2,-8],[-2,-7],[11,-17],[6,-8],[-1,-9],[-5,-9],[-12,-13],[-15,-22]],[[4273,5072],[-17,14],[-20,13],[-12,10],[-9,9],[-13,17],[-6,4],[-7,2],[-14,0],[-18,4],[-8,1],[-15,-1],[-17,2],[-3,3],[0,3],[-2,4],[-6,9],[-5,2],[-3,1],[-2,0],[1,-1],[-1,-1],[-14,-11],[-3,-2],[-5,-1],[-10,0],[-6,1],[-5,2],[-3,2],[-3,5],[-23,47],[-5,-1],[-19,-25],[-2,-4],[-1,-19],[-2,-6],[-3,-5],[-11,-8],[-5,-3],[-14,3],[-12,4],[-3,4],[-15,11],[-8,8],[-4,9],[-1,3],[-1,4],[0,9],[-6,8],[-8,7],[15,31],[8,12],[3,2],[6,1],[12,-1],[4,-1],[11,-6],[6,21],[14,24],[2,5],[1,4],[0,11],[-2,3],[-4,3],[-3,3],[-2,4],[-1,6],[3,6],[13,9],[4,0],[4,-1],[12,-4],[11,2],[10,-7],[3,-2],[6,-2],[21,-4],[12,4],[5,1],[13,16],[3,6],[-8,7],[-3,4],[-2,8],[0,4],[-4,4],[-20,17],[-7,5],[-6,3],[-4,0],[-3,-1],[-8,-5],[-3,-1],[-7,0],[-27,-10],[-5,-1],[-24,-2],[-12,7],[0,3],[-1,5],[1,6],[-1,51]],[[5839,5035],[-7,-10],[-23,-133],[-22,-121],[-2,-14],[-3,-5],[-5,-2],[-10,4],[-18,10],[-8,3],[-3,3],[-4,7],[-8,5],[-15,5],[-83,17],[-42,-4],[-18,-11],[-11,-4],[-10,-2],[-10,2],[-8,3],[-10,3],[-7,4],[-6,4],[-3,4],[-1,7],[-15,26],[-3,16],[-1,7],[-2,5],[-10,11],[-8,8],[-8,11],[-6,3],[-6,1],[-9,0],[-8,5],[-2,3],[-5,4],[-7,4],[-7,2],[-8,-2],[-7,-5],[-10,-13],[-4,-8],[-15,-6],[-16,-7],[-5,-3],[-7,-7],[-4,-6],[-2,-12],[9,-7],[8,-31],[-2,-10],[1,-6],[1,-5],[11,-9],[5,-9],[0,-9],[2,-6],[6,-19],[-19,0],[-8,1],[-15,0],[-6,-4],[-7,-4],[-45,-17],[-12,-2],[-15,-7],[-7,-11],[-6,-7],[-12,-2],[-9,0],[-10,-2],[-11,-5],[-11,-10],[-24,-13],[-33,-27],[-21,1]],[[5097,4627],[12,28],[2,17],[3,5],[5,4],[6,3],[6,5],[6,8],[1,6],[-7,11],[-8,11],[-16,15],[-9,23],[0,8],[3,7],[28,37],[3,17],[-3,4],[-6,14],[0,14],[2,8],[5,5],[12,8],[7,12],[9,9],[20,28],[4,3],[10,4],[12,37],[-13,-1],[-9,7],[-2,4],[1,4],[3,4],[6,4],[2,5],[-2,6],[-2,45],[2,11],[4,14],[-19,6],[-13,2],[-6,-1],[-10,4],[-2,-2],[2,-2],[0,-2],[0,-7],[-2,-3],[-4,-5],[-9,-4],[-5,-4],[-13,-27],[-2,-3],[-12,-2],[-4,-9],[-12,-7],[1,-4],[0,-2],[0,-3],[1,0],[2,0],[4,0],[1,-1],[0,-3],[-3,-4],[-4,-4],[-18,-6],[-17,-12],[8,-13],[4,-3],[4,-2],[4,-3],[4,-5],[8,-24],[-2,-22],[-25,-57],[14,1],[3,-4],[0,-10],[-8,-20],[-5,-30],[0,-9],[-2,-8],[-4,-9],[-7,-12],[-14,-13],[1,-24],[-9,-25],[-2,-4],[-5,-2],[-16,4],[-7,3],[-14,9],[-6,-4],[-3,-4],[-20,-44],[1,-12],[-1,-6],[1,-8],[5,-11],[1,-6],[0,-7],[-2,-9],[-4,-11],[-17,-32],[-18,-27],[-48,-56]],[[4869,4457],[-25,15],[-22,23]],[[4822,4495],[8,41],[18,28],[6,13],[3,11],[-1,7],[-13,19],[8,22],[-5,9],[2,7],[3,7],[4,7],[9,8],[4,3],[8,8],[2,13],[-4,14],[-2,6],[-4,9],[-5,5],[-15,27],[-12,8],[-5,4],[-4,3],[-6,3],[-5,0],[-6,-1],[-18,-6],[-6,-3],[-4,-3],[-3,-9],[-3,-3],[-3,-3],[-6,-5],[-3,-3],[-4,-1],[-4,2],[-4,1],[-7,-1],[-7,1],[-8,3],[-22,16],[-11,-3],[-4,8],[-3,2],[-16,7],[-1,6],[-16,-2],[-15,-1],[-20,-4],[-14,-1],[-7,6],[3,17],[47,88],[8,21],[0,23],[-9,24],[9,2],[-1,3],[-8,6],[5,7],[11,12],[3,6],[-2,4],[-4,2],[-5,1],[-3,3],[-1,4],[0,3],[1,2],[0,2],[-10,12],[-1,6],[4,7],[7,4],[9,2],[7,3],[3,7],[2,5],[8,9],[3,7],[-5,27],[0,8],[2,8],[4,5],[8,2],[-3,5],[1,4],[2,4],[0,6],[-8,19],[-1,4],[5,3],[15,6],[3,3],[-2,4],[-9,13],[-3,6],[1,11],[9,35],[-5,91],[-4,11]],[[5097,4627],[-36,7],[-10,-6],[-14,-23],[-9,-11],[-16,-18],[-13,-10],[-6,-7],[-1,-5],[1,-7],[-6,-12],[-13,-18],[-44,-45],[-8,-17],[-5,-4],[-1,-3],[-3,-5],[-5,-2],[-20,1],[-19,15]],[[4265,5025],[0,-4],[-18,-27],[-4,-14],[-4,-5],[-4,-4],[-32,-14],[-15,-14],[-6,-6],[-11,-27],[-20,-20],[-15,-27],[-5,-39],[-8,-35],[-8,-10],[-16,-20],[-15,-9],[-5,-10],[-14,-16],[-4,-8],[-12,-16],[-35,-33]],[[4014,4667],[-12,4],[-13,7],[-20,6],[-3,3],[-3,4],[0,9],[0,9],[5,8],[1,4],[0,4],[0,11],[1,5],[3,6],[3,6],[9,11],[11,21],[0,3],[-1,8],[1,22],[1,2],[-14,26],[-30,10],[-13,0],[-12,5],[4,11],[2,2],[2,2],[8,4],[-6,10],[-1,43],[5,14],[1,5],[4,5],[1,3],[-1,7],[25,29],[47,-6],[6,2],[21,1],[3,2],[2,3],[-1,9],[-3,16]],[[4047,5023],[7,4],[5,0],[5,-2],[14,-6],[6,-2],[60,1],[25,-3],[24,-14],[4,-1],[4,0],[4,2],[5,1],[11,2],[6,1],[3,1],[5,3],[2,1],[6,2],[4,2],[3,2],[15,8]],[[4273,5072],[-8,-47]],[[4047,5023],[-47,6],[-25,6],[-7,1],[-15,-2],[6,11],[-1,5],[-1,6],[-3,3],[-3,0],[-6,0],[-3,-1],[-3,-3],[-3,-2],[-4,-2],[-7,-1],[-9,1],[-7,4],[-4,3],[-1,2],[1,2],[0,2],[0,4],[-5,8],[-5,8],[7,5],[4,7],[1,12],[0,5],[-2,0],[-9,-4],[-17,-1],[-7,2],[-5,3],[-4,5],[1,16],[-6,4],[-19,13],[-8,11],[-3,7],[-20,31],[-5,4]],[[3803,5204],[1,27],[-10,15],[1,16],[-6,20],[-56,75],[-2,25],[12,32],[13,9],[36,17],[7,31],[1,15],[26,22]],[[4822,4495],[-4,-8],[-42,-32],[-27,-15],[-8,-7],[-6,-7],[-7,-13],[-5,-4],[-5,-2],[-4,-1],[-3,-3],[-4,-5],[-3,-5],[1,-7],[2,-4],[0,-6],[-3,-4],[-8,-8],[-6,-3],[-6,-4],[-4,-6],[-3,-14],[1,-8],[3,-7],[1,-6],[-4,-7],[-14,-10],[-13,-14],[-26,-30],[-36,-31],[-38,-6],[-33,3],[-30,6],[-6,4],[-3,5],[2,7],[3,6],[1,7],[2,10],[1,4],[5,6],[2,5],[1,6],[4,12],[4,6],[-67,0],[-5,-1],[-5,-1],[-5,-4],[-7,-4],[-7,-6],[0,-9],[-13,4],[-2,3],[-3,4],[-6,1],[-7,-1],[-10,-8],[-5,-6],[-5,-4],[-3,-2],[-10,7],[-9,4],[-13,8],[-7,3],[-7,1],[-20,-3],[-3,-1],[-4,-3],[-5,-6],[-4,-4],[-5,-3],[-13,-3],[-6,-2],[-7,-4],[-8,-2],[-5,0],[-7,1],[-7,2],[-8,-2],[-10,-7],[-13,-17],[-20,-22],[-19,-25],[-15,-26],[-2,-22],[-17,-14],[-5,-19],[-12,-12],[-66,-45],[-26,-22],[-15,-25],[-5,-7],[-10,-2],[-19,1],[-53,16],[-14,6],[-8,6],[-5,5],[-10,1],[-8,0],[-21,-12]],[[3833,4022],[1,37],[-10,23],[-14,10],[-9,11],[-10,3],[-13,9],[0,6],[1,7],[2,4],[7,6],[5,15],[-3,10],[3,13],[10,5]],[[3803,4181],[7,8],[1,31],[2,7],[4,4],[5,3],[3,4],[-2,6],[-5,5],[-7,13],[8,16],[2,13],[0,19],[4,11],[7,14],[3,9],[5,8],[7,9],[4,7],[5,8],[1,7],[0,10],[5,32],[6,10],[5,6],[7,20],[3,3],[13,12],[2,3],[7,15],[45,56],[16,31],[10,16],[7,9],[9,21],[5,7],[8,4],[21,8],[0,6],[-12,15]],[[5420,3290],[5,-15],[2,-8],[68,-83],[11,-9],[34,-22],[9,-9],[10,-16],[10,-10],[7,-9],[8,-18],[1,-8],[0,-13],[3,-13],[34,-33],[68,-49],[18,-20],[25,-6],[7,-5],[5,-6],[4,-8],[7,-9],[12,-7],[15,-8],[36,-9],[13,0],[10,1],[10,3],[9,5],[6,4],[10,13],[15,9],[14,13],[10,8],[21,7],[10,5],[4,7],[2,8],[0,6],[-2,11],[1,6],[5,10],[3,9],[2,6],[8,9],[5,2],[6,1],[6,1],[3,3],[2,4],[5,2],[9,-2],[10,-6],[10,-10],[10,-7],[14,19],[1,6],[15,2],[8,2],[22,-8],[11,-5],[19,-14],[55,-30],[16,-4],[23,-3],[9,-3],[31,-24],[7,-9],[2,-11],[2,-17],[2,-9],[4,-7],[7,-5],[11,-1],[9,-3],[5,-10],[2,-17],[3,-4],[7,-3],[7,2],[5,5],[5,0],[5,-12],[-1,-8],[-3,-10],[-1,-10],[7,-5],[19,-6],[6,-5],[13,-22],[5,-5],[45,-2],[12,-3],[31,-10],[6,-3],[3,-5],[2,-6],[3,-5],[5,-4],[29,-2]],[[6524,2751],[11,-5],[7,-13],[4,-22],[5,-10],[11,-6],[5,1],[2,5],[5,3],[12,-7],[7,-8],[4,-8],[0,-9],[-6,-8],[0,-13],[21,-15],[27,-13],[15,-11],[-1,-8],[-4,-10],[-2,-10],[4,-7],[10,0],[20,12],[10,-2],[8,-9],[5,-10],[7,-9],[16,-4],[8,-4],[14,-21],[8,-7],[68,-27],[34,-18],[8,0],[7,3],[11,3],[6,0],[12,-3],[6,-1],[7,1],[22,4],[7,-1],[15,-8],[24,-7],[20,-16]],[[5293,2157],[-1,0],[-52,13],[-32,12],[-15,8],[-22,21],[-36,23],[-12,6],[-12,-3],[-11,-5],[-13,1],[-4,4],[-3,11],[-3,4],[-6,2],[-4,0],[-4,0],[-6,0],[-7,-1],[-5,-2],[-6,-1],[-7,4],[-5,4],[-3,5],[-7,17],[0,4],[-1,4],[-5,6],[-6,4],[-24,11],[-14,2],[-24,-8],[-11,1],[-5,6],[-1,9],[-3,8],[-11,4],[-11,-3],[-7,-17],[-9,-4],[-11,2],[-7,3],[-6,2],[-12,-2],[-11,-1],[-13,1],[-14,4],[-9,5],[-4,5],[-4,12],[-3,4],[-6,3],[-5,0],[-5,0],[-11,1],[-6,0],[-4,1],[-3,8],[-1,10],[-2,5],[-8,11],[1,4],[4,4],[9,15],[4,4],[-3,3],[-13,4],[-9,5],[2,6],[6,7],[4,6],[-4,24],[-16,16],[-24,11],[-76,12],[-43,20],[-29,8],[-5,6],[-3,19],[-10,25],[-1,8],[4,38],[-8,16],[-26,4],[-12,-3],[-7,-1],[-6,1],[-3,4],[-2,9],[-1,3],[-10,4],[-7,0],[-17,-7],[-22,-4],[-15,4],[-10,12],[-10,20],[-2,10],[5,18],[0,10],[-5,9],[-16,15],[-6,9],[0,6],[1,11],[-2,5],[-6,6],[-8,4],[-16,6],[-13,3],[-38,-5],[-57,3],[-27,8],[-41,37],[-27,10],[-31,4],[-46,-3],[-12,0],[-12,3],[-12,7],[-14,5],[-27,2],[-12,6],[-36,36],[-8,13],[-2,9],[0,8],[-2,7],[-10,6],[-12,3],[-25,-2],[-13,0],[-18,6],[-9,2],[-9,-1]],[[3814,2964],[-67,50],[-7,1],[-26,-4],[-31,5],[-12,6],[-8,8],[-8,13],[-1,6],[8,74],[2,7],[13,14],[5,9],[4,19],[15,28],[31,39],[11,16],[13,7]],[[3756,3262],[43,-6],[34,-1],[17,-2],[17,3],[14,5],[12,10],[11,11],[13,10],[35,21],[9,8],[10,14],[13,13],[44,39],[33,38],[45,56],[51,38],[51,68],[21,29],[15,23],[14,10],[32,19],[6,3],[26,23],[9,12],[9,17],[22,63],[10,13],[8,7],[8,1],[8,-1],[19,-9],[8,-3],[22,6],[58,37],[23,22],[5,9],[-6,17],[-15,13],[-16,9],[-5,14],[3,11],[9,17],[13,20],[29,32],[27,20],[10,8],[5,2],[12,3]],[[4597,4034],[67,-18],[32,-4],[13,-2],[12,-6],[9,-7],[6,-9],[19,-41],[10,-12],[13,-11],[13,-8],[8,-11],[1,-20],[-38,-124],[-4,-28],[-1,-18],[3,-20],[6,-16],[11,-14],[41,-38],[10,-13],[7,-12],[1,-11],[-5,-10],[-10,-12],[-15,-13],[-12,-14],[-8,-17],[0,-20],[6,-26],[15,-26],[23,-25],[27,-15],[399,-118],[19,-1],[25,-1],[64,4],[56,-7]],[[2637,3825],[-22,-1],[-20,4],[-12,6],[5,3],[-5,4],[14,11],[0,8],[-9,3],[-12,1],[-11,6],[-4,12],[3,10],[9,-1],[10,-5],[25,-27],[10,-7],[23,-11],[11,-7],[-15,-9]],[[2594,3901],[8,-2],[1,3],[2,2],[3,1],[3,2],[18,-16],[3,-4],[3,-11],[3,-4],[26,-17],[9,-8],[-3,-8],[-12,-1],[-17,7],[-30,19],[-19,21],[-4,6],[-2,7],[-1,6],[2,3],[5,-4],[2,-2]],[[2377,4024],[-10,-2],[-8,2],[0,6],[11,1],[3,9],[3,11],[6,5],[9,7],[6,0],[-1,-8],[0,-8],[-1,-8],[-10,-9],[-8,-6]],[[3833,4022],[5,-10],[71,-51],[17,-13],[18,-18],[9,-6],[11,-4],[12,-7],[9,-9],[8,-15],[9,-13],[-15,-39],[-12,-23],[-2,-16],[19,-31],[-16,-8],[-8,-6],[-9,-12],[-22,-1],[-13,5],[-23,17],[-24,14],[-9,-3],[-16,-15],[-15,-12],[-16,-10],[-49,-19],[-22,-7],[-53,-12],[-17,0],[-13,2],[-37,24],[-11,8],[-20,4],[-9,-30],[24,-44],[0,-9],[-6,-7],[-2,-5],[-9,-22],[-10,-14],[-8,-3],[-9,-10],[0,-4],[1,-6],[2,-4],[1,-4],[-2,-3],[-5,-3],[-9,-3],[-10,-1],[-13,2],[-12,0],[-11,1],[-8,4],[-11,2],[-10,-4],[-10,-12],[0,-26],[3,-17],[-2,-6],[-18,-14],[-6,-9],[0,-8],[2,-23],[14,-21],[49,-32],[35,-37],[29,-40],[18,-15],[24,-11],[33,-8],[17,-5],[11,-6],[24,-6],[26,-1],[24,-10]],[[3814,2964],[-2,-1],[-6,-5],[-4,-7],[-6,-5],[-12,-2],[-21,0],[-9,-1],[-10,-4],[-8,-5],[-6,-4],[-6,-4],[-11,-3],[-95,3],[-21,3],[-27,11],[-47,13],[-14,8],[-16,21],[-6,23],[2,49],[4,11],[11,18],[3,10],[-1,8],[-2,7],[-9,16],[-11,9],[-2,6],[-12,17],[-12,12],[-22,8],[-11,6],[-11,3],[-11,-2],[-35,-45],[-16,-14],[-18,-9],[-18,-3],[-53,3],[-23,0]],[[3240,3115],[-1,21],[-7,28],[-3,47],[3,10],[32,17],[8,7],[7,7],[3,6],[4,12],[0,5],[-1,5],[-3,4],[-2,3],[-7,5],[-20,24],[-21,27],[-5,2],[-6,2],[-22,-5],[-27,-3],[-21,-5],[-4,-1],[-9,-7],[-5,-4],[-7,-5],[-5,-2],[-7,-1],[-7,0],[-12,3],[-6,3],[-3,3],[-3,2],[-4,0],[-10,-3],[-12,-1],[-33,-10],[-1,1],[-7,2],[-5,3],[-3,0],[-6,-2],[-40,11],[17,33],[2,9],[1,8],[-3,8],[0,8],[1,6],[10,21],[24,18],[5,9],[1,4],[2,4],[3,2],[9,3],[3,0],[2,3],[8,16],[-10,15],[-13,6],[-7,2],[-10,4],[-40,25],[-6,5],[-2,5],[1,5],[2,4],[4,8],[10,14],[2,16],[-8,10],[-60,23],[-12,3],[-8,1],[-10,1],[-8,-1],[-12,-2],[-3,-1],[-3,-1],[-7,-4],[-2,-2],[-12,-4],[-18,-1],[-19,-4],[-5,-2],[-11,-7],[-20,-7],[-21,1],[-31,-10],[-13,0],[-15,1],[-24,7],[-21,4],[-20,8],[-6,5],[-3,5],[-2,18],[-2,6],[-48,58],[-12,23],[-1,5],[0,5],[2,5],[8,20],[2,6],[1,7],[-2,5],[-8,20],[-3,13],[-2,11],[-21,18],[-60,33]],[[2458,3863],[7,5],[16,0],[12,0],[12,0],[8,5],[15,7],[13,-1],[10,-7],[7,-11],[5,-6],[7,-1],[13,3],[-6,-9],[-6,-12],[1,-10],[13,-5],[8,0],[14,-3],[8,0],[18,3],[8,0],[16,4],[12,7],[6,11],[0,9],[-4,8],[-8,9],[-10,8],[-10,3],[0,3],[14,0],[0,4],[-9,2],[-4,4],[0,5],[3,5],[-7,1],[-2,4],[1,4],[4,6],[-6,1],[-3,1],[0,4],[0,5],[12,-4],[9,4],[9,5],[9,3],[4,1],[6,1],[4,3],[-3,3],[-5,1],[-11,-5],[-6,0],[-10,5],[2,5],[8,3],[4,4],[5,-1],[11,-2],[12,-1],[9,2],[3,-3],[5,-5],[1,-3],[5,0],[-7,12],[-24,5],[8,10],[10,5],[10,1],[9,2],[8,7],[6,-2],[6,-2],[4,-3],[2,-5],[4,13],[-15,5],[-21,-3],[-14,-7],[-3,9],[-1,12],[4,12],[9,6],[9,-1],[6,-5],[6,-5],[7,-5],[8,-2],[2,2],[1,3],[3,5],[6,5],[3,2],[1,2],[-1,6],[-2,3],[-9,3],[-3,2],[0,3],[4,2],[3,7],[3,1],[2,1],[-3,6],[-4,2],[-6,-1],[-5,1],[-3,5],[-1,-4],[-1,-1],[2,-2],[-7,-4],[-8,-1],[-6,2],[-2,6],[-17,-13],[-6,-2],[1,7],[25,24],[15,18],[10,9],[51,36],[14,21],[8,12],[9,3],[11,-4],[3,5],[0,5],[2,6],[5,0],[6,-1],[4,3],[-4,6],[-10,4],[-11,-3],[-15,-1],[-2,5],[8,8],[17,12],[11,6],[16,5]],[[2868,4231],[27,-22],[4,-2],[9,-14],[7,-7],[3,-6],[1,-3],[1,-4],[2,-5],[8,-11],[6,-3],[10,1],[5,2],[4,1],[3,1],[3,1],[5,0],[17,-6],[1,-3],[-2,-2],[-1,-2],[0,-2],[5,-3],[3,1],[5,-1],[11,-11],[2,3],[1,0],[3,-3],[5,-1],[7,2],[4,2],[5,5],[3,2],[7,5],[6,5],[2,2],[6,4],[4,1],[5,-2],[4,1],[12,6],[14,4],[12,2],[31,-4],[33,-9],[5,-2],[11,-9],[1,-2],[1,-1],[2,-2],[7,-2],[39,-18],[20,-5],[12,-1],[11,1],[7,2],[4,1],[5,3],[12,11],[22,33],[9,-7],[35,-20],[15,-11],[12,-5],[9,-1],[6,2],[3,3],[3,3],[2,2],[4,1],[6,-8],[5,-6],[5,-1],[4,0],[2,2],[1,3],[1,1],[2,2],[1,1],[3,2],[3,2],[5,1],[4,-1],[3,-2],[9,-5],[10,9],[4,5],[7,12],[4,4],[9,3],[17,3],[7,3],[7,6],[6,8],[3,9],[0,20],[-2,4],[-9,8],[-2,5],[2,4],[15,14],[14,-5],[12,-5],[30,-5],[66,-5],[18,-4],[25,-16],[10,-3],[43,-8],[25,-8]],[[4869,4457],[-3,-16],[-16,-31],[-14,-21],[-50,-55],[-8,-20],[-3,-23],[-3,-46],[-3,-19],[-7,-18],[-20,-28],[-12,-9],[-32,-18],[-17,-14],[-20,-8],[-15,-9],[-7,-8],[-23,-33],[-19,-43],[0,-4]],[[3240,3115],[-20,-15],[-12,-1],[-3,4],[-2,2],[-2,0],[-2,-2],[-1,-7],[2,-12],[-1,-6],[-3,-5],[-9,-7],[-7,-4],[-48,-16],[-11,-2],[-1,-9],[-2,-23],[5,-32],[1,-3],[3,0],[3,0],[4,-1],[14,-9],[8,-3],[3,-2],[2,-5],[1,-5],[-7,-15],[-3,-5],[-32,-58],[-19,-27],[-13,-8],[-13,-14],[-41,-43],[-14,-13],[27,-22],[31,-21],[12,-7],[11,-4],[4,-4],[2,-5],[0,-9],[-2,-4],[-2,-2],[-3,-1],[-3,-3],[0,-6],[1,-6],[14,-26],[2,-9],[2,-17],[6,-11],[2,-11],[-1,-4],[-2,-4],[-4,-3],[-3,-1],[-2,-9],[-1,-3]],[[3111,2577],[-9,2],[-12,-2],[-34,-11],[-14,-1],[-11,3],[-10,4],[-13,4],[-71,12],[-24,7],[-18,12],[-7,14],[-3,17],[-6,19],[-4,59],[-9,27],[-28,6],[-3,0],[-20,-3],[-25,8],[-44,26],[-14,18],[-4,40],[-21,13],[-16,0],[-54,-17],[-13,-2],[-14,0],[-14,3],[-16,5],[-7,5],[-2,6],[1,6],[-3,6],[-6,6],[-4,0],[-3,-2],[-7,1],[-46,14],[-48,1],[-28,12],[-88,55],[-14,6],[-40,9],[-13,5],[-16,11],[-63,58],[-7,5],[-5,3],[-38,7],[-10,0],[-9,-5],[-4,9],[-14,12],[-3,6],[-1,11],[-6,2],[-10,-3],[-10,-1],[-16,4],[-13,8],[-10,12],[-7,12],[-7,10],[-20,13],[-14,16],[-39,23],[10,4],[-4,10],[-9,6],[-9,5],[-6,6],[-1,9],[2,10],[0,11],[-5,9],[-4,1],[-9,-4],[-13,-5],[-6,6],[-7,5],[-8,1],[-7,5],[-15,7],[-6,2],[-18,9],[-9,9],[-6,8],[3,10],[5,5],[11,4],[13,2],[12,10],[10,17],[10,10],[17,14],[14,14],[9,8],[14,9],[31,6],[15,-2],[12,1],[15,-2],[13,-5],[14,-3],[23,-1],[14,-3],[20,-2],[3,-2],[5,-4],[7,-4],[6,-2],[7,1],[-1,8],[1,4],[3,9],[9,8],[5,15],[-6,9],[1,8],[1,2],[3,3],[1,4],[0,5],[-2,3],[-2,-2],[-5,-7],[-8,-5],[-14,0],[-4,8],[0,10],[3,12],[1,8],[3,14],[1,7],[-2,4],[-6,6],[-7,5],[-7,2],[-7,-3],[-6,-8],[-6,-17],[-8,-4],[-5,5],[-1,11],[-2,16],[-8,19],[-6,27],[-6,19],[-2,24],[8,14],[8,15],[5,14],[18,7],[6,15],[20,30],[14,25],[8,17],[10,8],[-4,-9],[-1,-9],[2,-10],[3,-9],[10,25],[5,27],[8,11],[12,-2],[17,18],[17,16],[16,20],[15,5],[12,9],[14,11],[18,9],[8,0],[6,-13],[7,-15],[11,-15],[14,-16],[15,0],[-7,19],[-4,16],[1,17],[5,8],[10,8],[8,-10],[5,-17],[-5,-13],[7,-9],[6,-12],[6,-10],[9,-9],[6,-3],[24,-10],[11,-3],[7,0],[11,6],[13,4],[1,3],[0,4],[0,4],[-1,1],[3,3],[1,2],[0,21],[-3,8],[-3,9],[-7,9],[-3,10],[6,5],[15,-3]],[[2370,3886],[11,-5],[15,4],[14,-6],[4,-11],[5,-5],[2,-7],[-2,-4],[1,-2],[16,-16],[6,-12],[1,-19],[-8,-15],[-18,-5],[-16,8],[-18,15],[-15,17],[-6,12],[2,8],[5,4],[4,2],[3,6],[-5,6],[-9,16],[1,6],[7,3]],[[4922,2061],[-1,7],[-1,5],[-4,3],[-9,0],[-3,1],[-6,8],[-9,8],[-8,6],[-41,21],[-18,11],[-28,25],[-19,27],[-6,4],[-8,-1],[-5,-3],[-5,-2],[-3,-2],[-9,0],[-4,3],[-2,2],[-4,3],[-4,3],[-3,2],[-4,2],[-17,1],[-13,3],[-7,1],[-12,3],[5,8],[18,12],[-23,39],[-9,11],[-14,10],[-8,-1],[-17,-23],[-8,-5],[-6,0],[-11,3],[-23,4],[-15,6],[-9,5],[-27,25],[-5,3],[-6,2],[-12,0],[-5,1],[-8,7],[-27,30],[-13,8],[-14,6],[-30,7],[-14,2],[-10,-2],[-6,-6],[-3,-11],[-3,-7],[-8,-8],[-11,-7],[-10,-3],[-13,6],[-42,13],[-38,6],[-13,8],[-16,5],[-40,20],[-31,23],[-12,3],[-7,4],[-9,8],[-10,8],[-14,4],[-12,-1],[-29,-6],[-16,-1],[-15,1],[-13,2],[-11,4],[-19,9],[-27,17],[-6,7],[-41,21],[-16,13],[-8,9],[-3,11],[-3,7],[-45,48],[-3,6],[-7,9],[-15,-2],[-17,-4],[-12,-1],[-4,5],[-3,15],[-4,6],[-6,2],[-8,0],[-14,-1],[-17,1],[-14,3],[-14,5],[-13,7],[-18,16],[-7,3],[-8,-2],[-12,-8],[-3,-1],[-4,-3],[-17,-17],[-6,-2],[-7,-1],[-15,-1],[-6,1],[0,-3],[-1,-42],[7,-37],[-12,-7],[-67,-6],[-18,-8],[-9,-1],[-13,4],[-18,14],[-11,6],[-9,2],[-33,3],[-24,6],[-8,-3],[2,-22],[-10,-1],[-24,9],[-9,1],[-47,-6],[-10,1],[-10,3],[-11,7],[-15,12],[-7,4],[-11,3],[-8,1],[-27,1],[-20,5],[-26,25],[-14,3]],[[2868,4231],[-9,6],[1,12],[5,6],[8,7],[8,4],[7,-2],[11,3],[9,1],[3,1],[13,10],[16,-23],[9,-9],[17,-6],[-3,7],[-22,22],[-6,8],[-1,9],[3,9],[6,7],[3,-5],[4,-5],[5,-3],[2,3],[-2,4],[-6,7],[-1,2],[3,12],[7,9],[3,10],[-4,12],[6,0],[7,0],[-2,-3],[-1,-3],[-1,-3],[0,-5],[2,-4],[4,0],[7,4],[11,-1],[4,-1],[6,-5],[3,-2],[-1,5],[-3,5],[-4,3],[-6,2],[3,1],[3,2],[3,1],[-13,4],[-5,0],[2,5],[3,2],[3,-1],[6,-3],[2,9],[-10,3],[-14,-1],[-10,-3],[2,9],[8,1],[10,-1],[12,-1],[-4,2],[-7,4],[-3,1],[3,2],[3,1],[2,1],[6,1],[-2,2],[-3,6],[14,2],[14,1],[0,-3],[-3,-6],[6,1],[20,5],[-10,2],[-2,3],[3,6],[12,11],[4,7],[7,17],[7,-5],[6,-1],[5,2],[7,5],[7,3],[11,2],[4,2],[-10,3],[-9,-1],[-9,-3],[-7,1],[-3,8],[5,2],[10,1],[12,4],[6,7],[-12,-1],[-28,-6],[-9,3],[-3,9],[2,10],[3,8],[19,-11],[10,-3],[15,-1],[3,1],[-1,3],[-5,2],[-6,2],[-8,-1],[-5,1],[-4,2],[-4,5],[11,-1],[10,2],[7,4],[5,7],[-11,5],[-6,7],[1,7],[11,8],[5,-3],[3,-3],[1,-4],[0,-6],[10,8],[-4,12],[-2,10],[31,9],[8,9],[7,10],[10,8],[0,3],[-42,-7],[0,4],[5,1],[4,2],[-17,0],[-7,1],[-7,3],[2,-24],[-39,-19],[-49,-6],[-25,11],[1,5],[10,4],[2,5],[-2,2],[-12,5],[-8,4],[-3,0],[-2,2],[-1,5],[1,5],[2,4],[2,5],[4,15],[3,5],[7,3],[10,1],[6,-2],[1,-4],[-8,-6],[32,4],[10,3],[0,4],[-23,-4],[3,7],[5,7],[18,17],[11,20],[-8,-1],[-3,1],[-1,2],[-2,5],[-11,-2],[-7,5],[-8,7],[-11,6],[3,-6],[1,-6],[-1,-6],[-3,-5],[-6,2],[-6,1],[-6,-1],[-5,-2],[0,-4],[3,-3],[-1,-1],[-2,-4],[-3,2],[-2,1],[-3,0],[-6,1],[2,-11],[-2,-15],[-5,-15],[-7,-6],[-2,-3],[-2,-15],[-2,-5],[-11,0],[-8,4],[-4,8],[4,8],[-34,22],[-4,5],[-3,9],[3,9],[15,1],[-8,8],[-3,4],[-4,15],[-3,17],[0,16]],[[2888,4709],[1,0],[26,4],[30,19],[8,1],[7,-1],[8,-7],[3,-2],[5,-1],[4,1],[4,2],[4,3],[2,3],[0,2],[-1,5],[0,4]],[[2989,4742],[3,1],[10,8],[8,8]],[[3010,4759],[1,-1],[4,-8],[0,-15],[1,-5],[4,-5],[5,-4],[7,-4],[4,-1],[5,2],[4,3],[3,1],[15,4],[7,1],[6,-1],[13,-8],[8,-2],[29,-24],[8,-9],[3,-2],[11,0],[14,-1],[7,0],[6,1],[5,3],[6,7],[4,2],[4,0],[9,-2],[7,1],[7,-3],[9,-7],[27,-36],[17,-6],[21,2],[9,-2],[1,-2],[1,-2],[3,-2],[6,-3],[9,-2],[22,-8],[12,-1],[8,2],[23,18],[11,7],[10,8],[8,3],[7,1],[33,-8],[8,1],[5,2],[1,3],[0,5],[3,5],[16,18],[17,15],[15,7],[17,3],[18,15],[2,4],[2,7],[-10,8],[-28,12],[-3,14],[4,28],[-1,5],[-3,3],[-6,3],[-6,5],[-6,7],[-12,18],[-1,4],[1,2],[2,0],[8,-2],[5,0],[13,2],[7,2],[7,2],[5,1],[4,2],[9,7],[9,26],[-1,10],[-4,10],[0,7],[10,29],[6,8],[36,27],[17,11],[21,17],[9,12],[-2,9],[-4,5],[0,7],[4,8],[5,7],[5,5],[55,39],[27,26],[2,4],[17,41],[6,8],[11,9],[7,4],[20,16]],[[4583,8141],[-13,13],[-31,29],[-17,12],[-4,1],[-11,2],[-31,25],[-38,-6],[-19,25],[-10,5],[5,7],[0,1],[-2,3],[-2,1],[-9,2],[-11,2],[-26,2],[-5,2],[-2,3],[0,2],[-7,9],[-2,7],[1,3],[7,19],[1,8],[6,4],[7,3],[3,3],[1,3],[1,12],[-1,4],[-2,4],[-2,3],[-2,2],[-13,9],[-4,4],[-1,3],[0,3],[0,5],[1,3],[3,5],[1,1]],[[4355,8389],[0,-2],[5,0],[4,5],[14,11],[-3,4],[-1,5],[-1,4],[0,3]],[[4373,8419],[6,9],[-3,14],[-2,4]],[[4374,8446],[8,9],[8,2],[7,0],[8,2],[7,2],[43,24],[26,5],[13,6],[9,9],[0,9],[3,6],[3,12],[3,5],[6,4],[9,3],[13,1],[13,4],[8,8],[17,11],[1,9],[19,0],[23,2],[11,8],[-1,10],[-1,4]],[[4630,8601],[7,-8],[27,-21],[16,-15],[5,-8],[5,-23],[6,-7],[8,-6],[6,-7],[3,-10],[-4,-10],[-5,-11],[-3,-12],[1,-8],[11,-25],[1,-5],[1,-11],[-5,-48],[2,-36],[-2,-12],[-13,-19],[-39,-22],[-12,-20],[-4,-26],[-4,-12],[-8,-11],[-11,-10],[-36,-57]],[[4167,8187],[-7,-6],[-7,1],[-7,1],[-6,-2],[-2,-7],[-2,-4],[-6,0],[-3,6],[-1,10],[3,7],[4,4],[7,6],[5,-3],[8,-3],[13,-3],[1,-7]],[[4583,8141],[-4,-8],[-5,-19],[-9,-19],[-2,-11],[3,-16],[7,-7],[11,-3],[13,-7],[6,-2],[20,-4],[4,-2],[4,-3],[6,-7],[9,-17],[2,-2],[5,-1],[4,-3],[2,-5],[-1,-15],[-4,-8],[-8,-4],[-24,-10],[-7,-5],[-4,-8],[-2,-12],[1,-25],[3,-12],[5,-11],[7,-7],[23,-18],[4,-9],[-3,-12],[-5,-13],[-3,-10],[2,-12],[6,-8],[18,-13],[8,-9],[1,-9],[-7,-22],[-10,-50],[4,-22],[19,3],[6,-5],[13,-15],[9,4],[9,3],[9,-1],[8,-4],[3,-4],[3,-8],[3,-3],[4,-1],[9,0],[3,-1],[12,-5],[4,-4],[2,-4],[2,-7],[3,-6],[4,-5],[6,-3],[21,-12],[11,-10],[6,-18],[4,-5],[6,-4],[7,-2],[7,0],[4,4],[3,4],[5,4],[11,4],[10,1],[22,-2],[3,-3],[5,-15],[4,-5],[8,-2],[6,1],[6,3],[8,2],[12,-1],[15,-4],[13,-6],[6,-6],[1,-15],[4,-5],[27,-1],[12,-6],[17,-23],[10,-11],[29,-13],[9,-7],[-8,-5],[19,-7],[23,-4],[20,2],[12,12],[7,-6],[9,-5],[6,-7],[-4,-9],[22,-10],[56,-2],[19,-7],[-8,-16],[1,-17],[8,-15]],[[5288,7366],[11,-11],[23,-18],[9,-11],[3,-16],[-4,-12],[-12,-20],[-3,-12],[1,-37],[3,-11],[5,-6],[12,-12],[2,-7],[0,-19],[3,-13],[15,-22],[5,-13],[5,-40],[-2,-9],[-6,-8],[1,-5],[5,-5],[2,-6],[-2,-4],[-5,-7],[-3,-5],[1,-2],[-1,-15],[-1,-6],[-6,-11],[-2,-6],[-1,-2],[-6,-5],[-2,-2],[1,-4],[3,-5],[2,-10],[2,-5],[-1,-5]],[[4659,7025],[17,3],[6,3],[14,10],[7,2],[22,-2],[18,1],[16,4],[14,8],[10,10],[7,13],[2,14],[3,4],[2,1],[6,-2],[11,-1],[5,7],[10,21],[1,7],[-1,10],[-6,19],[-2,16],[0,12],[1,3],[-8,7],[-7,16],[-12,65],[6,12],[18,12],[8,13],[5,4],[4,4],[0,4],[-4,6],[-9,7],[-34,43],[-32,29],[-64,41],[-19,6],[-29,15],[-12,20],[-13,21],[-12,9],[-6,2],[-7,5],[-3,5],[-2,8],[0,7],[-7,24],[-9,16],[-3,11],[-1,6],[4,11],[-6,7],[2,6],[14,25],[8,12],[4,4],[-4,4],[-5,2],[-14,8],[-5,5],[-1,3],[-5,-1],[-9,-3],[-15,-3],[-14,2],[-10,4],[-5,4],[-1,4],[14,27],[-20,5],[-20,0],[-8,5],[-28,21],[-14,14],[-27,18],[-10,4],[-8,0],[-9,-1],[-9,1],[-20,11],[-12,4],[-10,1],[-9,-3],[-4,-5],[-12,-8],[-14,4],[-12,-9],[6,25],[5,6],[2,8],[0,11],[3,10],[7,17],[2,9],[-3,14],[5,17],[5,9],[-1,9],[-14,1],[-9,-4],[-9,1],[-54,15],[-15,6],[-5,6],[2,5],[10,11],[2,6],[0,5],[-6,10],[-1,7],[-1,20],[-12,-1],[-11,-3],[-9,0],[-7,3],[-2,5],[3,9],[32,45],[-65,-29]],[[4136,8042],[-5,9],[0,12],[4,4],[2,2],[5,1],[5,2],[3,3],[7,12],[4,6],[2,3],[3,7],[1,6],[0,6],[0,5],[3,6],[-21,-10],[-28,-15],[-27,-24],[-27,-13],[-13,2],[10,19],[19,9],[9,5],[6,6],[5,5],[4,7],[6,7],[1,6],[-2,7],[2,5],[15,-1],[-4,5],[-1,5],[1,5],[4,4],[6,-11],[13,3],[25,12],[7,6],[0,12],[-4,15],[-1,13],[-5,0],[-5,-3],[-4,4],[-4,15],[-5,0],[-2,-5],[-2,-4],[-4,-2],[-6,-1],[3,5],[3,10],[3,5],[4,3],[8,3],[5,3],[19,18],[6,3],[-3,-9],[-8,-12],[-2,-9],[11,-5],[9,6],[4,11],[0,15],[-2,11],[-2,2],[-5,1],[-7,1],[1,3],[3,7],[1,2],[-1,6],[0,6],[-2,5],[-9,1],[-3,3],[4,5],[6,5],[7,3],[8,1],[9,2],[7,4],[6,5],[0,3],[-5,5],[1,3],[2,1],[5,1],[2,2],[6,2],[6,0],[4,1],[2,6],[2,1],[6,5],[4,5],[0,3],[4,1],[17,7],[44,9],[6,4],[7,9],[5,5],[4,1],[4,-1],[4,-1],[3,-2],[1,-3],[-1,-2],[-3,-2],[0,-2],[4,-4],[0,-2]],[[4373,8419],[0,3],[-10,-8],[-3,-4],[-14,7],[-4,10],[6,10],[24,7],[2,2]],[[5932,8231],[-1,-8],[0,-11],[-13,-123],[-35,-99],[0,-22],[-6,-22],[0,-11],[4,-15],[6,-10],[3,-10],[-6,-15],[-21,-36],[-37,-47],[-17,-38],[-7,-10],[-11,-10],[-27,-14],[-10,-7],[-12,-25],[-54,-66],[-23,-48],[-9,-11],[-12,-9],[-25,-15],[-8,-11],[0,-12],[9,-4],[10,0]],[[5630,7522],[-30,-6],[-6,-2],[-14,-19],[3,-22],[-8,-77],[3,-22],[0,-5],[-5,-15],[9,-28],[5,-13],[0,-6],[-3,-6],[-9,-7],[-17,-9],[-4,-4],[-2,-4],[1,-5],[1,-4],[-2,-4],[-7,-6],[-25,-15],[-9,-8],[-5,-5],[-5,-6],[-3,-7],[-2,-7],[0,-7],[0,-5],[6,-14],[19,-22],[13,-26],[5,-1],[4,-8],[-8,-23],[-16,-16],[-1,-4],[1,-2],[5,-1],[11,-1],[5,-1],[4,-2],[4,-3],[11,-6],[1,-13],[3,-3],[5,-2],[3,2],[6,8],[4,5],[20,13],[-4,21],[-1,3],[-5,6],[-3,9],[1,3],[3,4],[5,0],[10,0],[15,-2],[8,-4],[4,-3],[3,-25],[-10,-35],[-10,-20],[-6,-17],[-7,-11],[-5,-11],[-3,-12],[3,-44],[10,-5],[10,-19],[0,-4],[1,-5],[-1,-14],[3,-8],[8,-8],[29,-2],[9,-11],[6,-2],[3,-1],[3,-1],[1,-3],[1,-4],[-1,-7],[-2,-8],[-9,-10],[-6,-5],[-8,-6],[-12,-4],[-6,-3],[-3,-7],[-2,-10],[2,-20],[-1,-11],[-2,-6],[-4,-5],[-15,-16],[-5,-9],[-8,-6],[-7,-8],[-10,-7],[-13,-8],[-21,-8],[-9,-2],[-6,1],[-7,3],[-12,8],[-5,2],[-7,2],[-6,1],[-6,4],[-7,7],[-6,3],[-6,2],[-26,5],[-3,0],[10,-6]],[[5288,7366],[18,46],[7,10],[7,17],[16,22],[-17,18],[-20,17],[-8,12],[-4,11],[-1,10],[-3,4],[-5,0],[-5,-1],[-6,0],[-26,4],[-9,4],[-3,3],[-2,4],[-1,3],[0,3],[1,2],[2,3],[3,2],[2,3],[0,3],[0,4],[-1,5],[-2,20],[-3,4],[-4,3],[-6,4],[-6,4],[-7,11],[-5,32],[-11,9],[-14,6],[-29,23],[-37,18],[19,12],[33,31],[12,6],[10,3],[15,1],[5,0],[6,-1],[7,-2],[10,-1],[6,-1],[9,-5],[6,-2],[25,-1],[5,0],[8,0],[5,2],[28,13],[5,1],[4,-2],[3,-3],[1,-2],[4,-4],[11,11],[-21,53],[-18,27],[4,9],[0,4],[-3,15],[-29,22],[-7,4],[-39,44],[-12,8],[-9,5],[-9,4],[-7,7],[-18,24],[-21,30],[-2,6],[0,8],[2,6],[5,18],[5,27],[12,13],[7,12],[7,6],[10,13],[21,18],[6,8],[7,14],[5,10],[13,11],[9,6],[9,3],[24,4],[9,2],[6,0],[5,-1],[6,-1],[7,0],[26,6],[24,15],[9,1],[11,4],[9,10],[7,2],[8,0],[9,1],[6,4],[4,9],[2,5],[5,1],[20,5],[15,6],[5,5],[0,6],[-6,4],[-6,3],[-4,3],[-2,5],[2,9],[1,8],[-4,21],[-4,8],[-6,11],[19,27],[7,7],[9,11],[-1,7],[-7,7],[-11,4],[-11,2],[-11,1],[-10,-1],[-5,2],[4,9],[22,27],[1,6]],[[2888,4709],[0,1],[1,8],[5,6],[7,6],[10,1],[9,0],[7,1],[2,7],[3,4],[6,4],[9,2],[7,-2],[12,-11],[4,-1],[10,2],[9,5]],[[2943,4772],[14,-6],[14,1],[14,3],[13,-2],[-12,-16],[-9,-7],[-9,3],[-11,12],[-17,-5],[-16,-2],[-35,0],[-14,3],[-8,0],[-10,-1],[-6,-4],[-5,-5],[-5,-5],[-25,-6],[-2,-2],[-3,5],[0,8],[3,7],[7,3],[9,3],[14,10],[9,3],[9,-1],[16,-3],[10,0],[-4,5],[-10,5],[-5,5],[24,0],[-16,4],[1,5],[11,6],[12,5],[-3,1],[-3,1],[-2,1],[-5,1],[0,2],[1,2],[4,3],[18,-7],[10,-7],[7,-8],[6,-10],[9,-10]],[[3010,4759],[12,13],[-57,0],[-11,2],[-9,9],[-25,35],[19,22],[4,9],[6,24],[6,9],[15,6],[0,3],[-13,-3],[1,15],[8,27],[0,77],[2,-6],[3,-4],[4,-3],[5,-3],[3,6],[2,9],[-3,8],[-16,7],[-2,8],[-1,9],[-1,7],[15,-2],[11,-6],[9,-10],[6,-9],[4,0],[-8,18],[-28,29],[-5,19],[-3,-2],[-8,-1],[-3,-2],[-6,23],[-8,72],[-4,10],[-4,84],[3,19],[6,18],[9,17],[-10,4],[-1,13],[2,12],[-3,6],[-6,4],[-4,11],[-2,23],[-10,-3],[-6,3],[-2,6],[0,9],[5,0],[3,-2],[2,-2],[3,1],[5,3],[-7,4],[-2,5],[-5,18],[0,2],[0,2],[-4,4],[-3,1],[-11,1],[-4,2],[-8,6],[-5,6],[-5,4],[-10,3],[-10,0],[-7,-2],[-4,-4],[-2,-6],[-8,6],[-8,0],[-7,-2],[-5,0],[-5,7],[2,5],[6,3],[9,1],[6,6],[15,27],[8,9],[6,2],[15,0],[7,2],[8,5],[6,5],[6,3],[10,2],[12,-3],[10,-5],[11,-4],[16,5],[4,3],[1,3],[1,4],[3,5],[1,2],[-1,7],[0,2],[3,1],[5,-1],[4,0],[2,2],[3,6],[7,5],[9,4],[6,5],[5,5],[3,7],[2,6],[2,7],[-2,23],[-10,20],[-28,37],[-2,2],[-5,2],[0,13],[-27,60],[-5,0],[0,-15],[-4,0],[-11,24],[-17,22],[-41,42],[-8,10],[-2,8],[0,23],[5,20],[1,10],[-6,7],[5,3],[25,-17],[16,-17],[7,4],[7,9],[9,21],[3,11],[0,10],[-1,8],[-2,6],[-12,14],[2,5],[15,4],[2,-3],[2,-2],[3,-1],[2,-2],[3,9],[-2,8],[-6,6],[-9,4],[0,4],[11,14],[3,9],[0,12],[9,8],[3,13],[-2,12],[-5,9],[-23,15],[-4,5],[-4,4],[-4,3],[-7,4],[1,6],[3,12],[1,7],[-2,7],[-5,3],[-7,1],[-23,11],[-15,-3],[-14,-9],[-8,-8],[3,-4],[2,-4],[-5,-1],[-4,-1],[-5,-2],[-4,0],[0,14],[1,7],[3,6],[-28,50],[-14,15],[-19,16],[-10,5],[-17,4],[-3,3],[-3,1],[-8,-2],[-2,-3],[0,-5],[-1,-4],[-6,-3],[-3,39],[6,16],[18,7],[8,10],[-8,21],[-21,34],[-5,0],[5,-7],[2,-2],[3,-3],[0,-4],[-5,0],[-11,13],[-50,44],[-7,4],[-12,1],[-7,3],[-4,7],[-5,7],[-10,2],[5,4],[-9,2],[-8,5],[-11,12],[-5,2],[27,73],[24,62],[16,-3],[15,2],[12,7],[10,10],[7,14],[-3,12],[-15,25],[-6,17],[-3,24],[4,21],[16,7],[7,-3],[34,-24],[7,-6],[-1,-1],[-2,-5],[0,-2],[1,-2],[6,-1],[2,-1],[19,-21],[5,-8],[8,-28],[7,-6],[15,1],[17,12],[31,25],[94,49],[20,15],[-4,10],[-14,11],[-9,16],[2,7],[20,21],[17,32],[15,12],[20,9],[23,6],[20,4],[25,0],[4,2],[-5,9],[-7,5],[-7,5],[-7,5],[-4,8],[-1,14],[-15,43],[-19,31],[-7,8],[-17,21],[-14,26],[-5,6],[-9,3],[-9,0],[-9,3],[-7,9],[-6,20],[-6,39],[-9,20],[-11,15],[-7,5],[-12,3],[-20,-1],[-6,3],[0,13],[5,16],[8,7],[19,17],[8,14],[-1,10],[-3,5],[1,5],[11,5],[11,2],[10,1],[7,4],[1,8],[1,3],[1,1],[1,2],[2,2],[10,-5],[7,-21],[8,-11],[8,-6],[7,-7],[6,-9],[5,-10],[5,-22],[6,-12],[44,-24],[34,-12],[10,-6],[7,-7],[54,-74],[15,-9],[9,-1],[19,-1],[3,0]],[[4630,8601],[0,6],[-2,3],[5,3],[16,-6],[16,-4],[36,-10],[65,-23],[50,-13],[33,-7],[35,-4],[45,-4],[45,3],[27,2],[-10,-6],[-34,-5],[-64,1],[-8,1],[-8,2],[-7,0],[-8,-3],[-1,-4],[0,-7],[0,-6],[-6,-2],[-2,-7],[7,-17],[17,-26],[-11,5],[-9,8],[-9,5],[-8,-6],[-5,5],[-16,0],[-9,4],[-6,-2],[-5,-9],[-4,-12],[-1,-7],[-1,-17],[1,-9],[4,-4],[9,3],[4,9],[3,10],[7,6],[0,-6],[2,-4],[5,-2],[7,0],[-1,-6],[1,-21],[10,-4],[11,1],[9,5],[2,9],[-7,-3],[-6,1],[-4,6],[-1,8],[2,8],[6,5],[3,4],[-2,7],[13,-2],[9,-8],[4,-11],[4,-27],[6,-7],[10,-1],[26,1],[5,1],[6,3],[13,10],[3,2],[2,5],[19,29],[1,4],[-1,16],[8,12],[1,5],[2,3],[10,9],[2,3],[5,22],[6,12],[42,50],[2,5],[-2,6],[-9,10],[-3,5],[0,6],[4,10],[1,5],[-1,6],[-6,10],[-2,5],[1,2],[7,5],[1,3],[-1,3],[-1,2],[-2,1],[-1,1],[2,6],[3,6],[9,10],[4,3],[3,2],[2,2],[1,6],[9,14],[10,0],[9,-1],[5,2],[-1,14],[5,0],[0,-4],[1,-2],[3,-5],[8,7],[1,4],[2,-1],[1,0],[1,-1],[1,-2],[4,0],[0,12],[7,-5],[5,-8],[8,-3],[6,3],[3,6],[3,3],[6,-4],[5,0],[1,4],[2,2],[5,1],[5,1],[17,-2],[13,-4],[11,-7],[12,-8],[5,-2],[31,-5],[22,-11],[26,-7],[82,-5],[76,5],[18,0]],[[3940,7867],[-2,0],[-1,0],[0,2],[1,0],[3,0],[1,0],[1,-1],[-1,-1],[-2,0]],[[3966,7877],[2,-1],[2,0],[1,-1],[-1,-2],[-1,0],[-4,-1],[-6,1],[-4,-1],[-4,0],[-1,1],[-1,1],[0,2],[4,2],[2,1],[3,-1],[4,0],[4,-1]],[[4057,7663],[1,0],[17,-4],[9,6],[26,18],[16,26],[13,36],[1,33],[-8,15],[-8,9],[-5,3],[-7,11],[-11,0],[-9,6],[-7,3],[-14,0],[-9,-3],[-8,-5],[-1,6],[38,31],[6,15],[11,31],[0,13],[4,12],[9,15],[7,19],[3,11],[-1,12],[10,32],[1,18],[-5,10]],[[8277,5814],[-67,-34],[-27,-4],[-143,4],[-22,-4],[-20,-10],[-6,-6]],[[7992,5760],[-22,8],[-11,11],[-1,10],[-2,5],[-5,5],[-16,11],[-13,6],[-45,14],[-8,6],[-4,6],[-2,6],[-4,6],[-5,4],[-20,10],[-5,4],[-8,10],[-6,4],[-22,8],[-10,2],[-17,1],[-23,0],[-19,-2],[-18,0],[-11,1],[-21,5],[-13,1],[-18,-2],[-46,-13],[-28,-12],[-14,-3],[-26,0],[-35,-2],[-52,-7],[-37,0],[-3,2],[-27,9],[-12,2],[-14,-2],[-14,-3],[-15,-4],[-7,-1],[-65,4],[-48,15],[-22,3],[-37,-1],[-16,2],[-21,7],[-22,3],[-14,-8],[-11,2],[-11,-2],[-8,1],[-7,-1],[-17,-9],[-24,-8],[-20,-1],[-13,-2],[-11,-3],[-10,-3],[-26,-8],[-17,-2],[-15,2],[-12,-1],[-20,-3],[-10,1],[-18,8],[-7,2],[-10,-2],[-15,-4],[-51,0],[-17,-4],[-73,-22],[-21,-1],[-12,1],[-14,0],[-14,-2],[-39,-15],[-36,-8],[-39,-23],[-10,0],[-17,3],[-22,12],[-27,11],[-11,7],[-10,6],[-16,27],[-27,22],[-15,21],[-3,14],[0,5],[2,8],[17,23]],[[6572,6310],[56,-11],[22,-1],[11,1],[7,4],[6,4],[9,5],[7,0],[8,-1],[4,2],[-2,10],[19,0],[16,3],[16,0],[19,-4],[-2,10],[4,4],[9,1],[23,-1],[5,-3],[4,-5],[8,-4],[4,-1],[5,1],[9,5],[6,1],[4,-2],[1,-3],[1,-2],[1,0],[13,-1],[0,1],[1,1],[12,2],[15,-3],[13,-9],[8,2],[18,6],[11,2],[10,-1],[22,-5],[11,0],[28,4],[10,-1],[6,-4],[2,-6],[0,-7],[4,-6],[9,-3],[33,-1],[8,-3],[5,-4],[6,-1],[12,3],[9,5],[5,5],[7,3],[47,-4],[37,4],[33,10],[29,17],[7,8],[3,5],[6,3],[14,1],[25,7],[30,2],[40,7],[20,1],[5,-2],[9,-7],[6,-2],[23,-4],[11,0],[19,5],[11,2],[5,-4],[34,-36],[7,-3],[10,-2],[8,0],[15,1],[7,0],[3,-2],[4,-5],[2,-1],[10,-3],[70,-28],[21,-1],[38,18],[24,5],[25,1],[20,-4],[22,-15],[11,-13],[51,-53],[51,-54],[51,-53],[52,-54],[51,-54],[51,-53],[51,-54],[51,-53],[19,-21],[8,0]],[[5630,7522],[74,1],[28,4],[24,9],[23,18],[12,7],[17,4],[15,7],[30,23],[15,0],[4,-4],[8,-20],[0,-3],[-2,-5],[-1,-2],[3,-2],[6,-6],[2,-2],[3,-14],[-2,-23],[4,-13],[12,-13],[12,-3],[14,4],[23,13],[5,2],[9,2],[7,0],[6,-2],[5,0],[5,5],[13,-10],[11,-6],[4,-6],[-10,-13],[12,-11],[3,-11],[8,-24],[7,-25],[8,-24],[8,-25],[8,-24],[7,-25],[8,-24],[8,-25],[7,-22],[14,-19],[12,-11],[13,-12],[13,-12],[14,-12],[13,-12],[13,-11],[13,-12],[14,-12],[13,-12],[16,-14],[8,-6],[6,-2],[7,-1],[6,-3],[8,-7],[7,-9],[4,-9],[2,-9],[-1,-10],[-6,-18],[-1,-9],[4,-12],[22,-35],[15,-39],[1,-21],[-11,-13],[-11,0],[-15,2],[-12,-1],[-7,-11],[-3,-10],[-6,-9],[-8,-8],[-10,-7],[-7,-3],[-8,-2],[-6,-4],[-2,-6],[3,-5],[14,-14],[5,-6],[3,-9],[2,-25],[-2,-10],[-13,-34],[-7,-59],[2,-11],[10,-22],[2,-11],[-3,-12],[-6,-12],[-4,-11],[3,-13],[18,-25],[25,-15],[12,-4],[17,-4],[33,-5],[55,0],[23,-5],[23,-25],[4,-2],[1,-3],[-6,-23],[0,-4],[1,-17],[5,-16],[8,-16],[37,-60],[11,-11],[8,-4],[19,-7],[9,-4],[15,-12],[8,-3]],[[7992,5760],[-14,-12],[-15,-19],[-48,-91],[-11,-16],[-29,-25],[-3,-8],[-23,-29],[-16,-14],[-21,-13],[-23,-12],[-19,-7],[-28,-5],[-53,-2],[-25,-4],[-42,-14],[-16,-2],[-14,-4],[-43,-27],[-45,-20],[-13,-8],[-13,-7],[-29,-10],[-11,-8],[-3,-10],[-3,-27],[-6,-6],[-11,-3],[-118,-86],[-12,-5],[-27,-6],[-10,-10],[-45,-89],[-14,-16],[-8,-6]],[[7181,5139],[-19,-14],[-8,-3],[-9,-2],[-11,-4],[-19,-9],[-33,-22],[-6,-4],[-40,-5],[-195,-70],[-53,-30],[-28,-12],[-61,-16],[-8,0],[-8,0],[-7,-1],[-7,-4],[-52,-48],[-51,-35],[-26,-13],[-26,-6],[-13,3],[-8,8],[-5,8],[-26,14],[-7,2],[-8,0],[-108,-20],[-9,-3],[-29,-37],[-15,-3],[-17,1],[-13,8],[-32,-15],[-16,-4],[-7,9],[-4,4],[-9,3],[-10,2],[-7,1],[-4,-3],[-15,-22],[-5,-2],[-4,2],[-4,4],[-5,2],[-2,-1],[-2,-1],[-3,-2],[-5,0],[-25,4],[-7,0],[-5,-2],[-9,-7],[-4,-3],[-8,-1],[-5,2],[-15,7],[-3,15],[0,5],[-5,2],[-6,-1],[-5,-1],[-5,1],[0,3],[1,4],[0,4],[-4,5],[0,4],[-2,4],[-12,11],[-2,5],[0,2],[-3,2],[-4,1],[-10,-1],[-60,54],[-46,70],[-31,25],[-4,6],[-4,16]],[[7178,3988],[16,2],[12,-6],[11,-1],[13,-3],[2,-4],[0,-5],[-2,-7],[1,-5],[4,-2],[4,1],[3,5],[0,8],[-2,9],[2,6],[5,0],[12,-7],[8,-10],[6,-4],[3,4],[0,7],[4,5],[6,1],[9,-7],[1,-7],[-1,-7],[1,-3],[17,7],[10,1],[11,-6],[8,-13],[6,-2],[11,2],[10,4],[9,5],[8,2],[5,-1],[3,-5],[0,-6],[2,-6],[4,0],[28,18],[4,5],[1,5],[-3,6],[-4,6],[-1,5],[2,3],[7,0],[6,-3],[17,-17],[6,0],[7,7],[14,0],[11,-2],[63,-32]],[[7558,3941],[-266,-92],[-9,-6],[-1,-5],[7,-5],[38,-10],[34,-15],[16,-4],[15,-7],[14,-12],[33,-39],[28,-45],[9,-17],[8,-7],[13,-7],[34,-8],[14,-4],[5,0],[6,-3],[6,-6],[1,-11],[25,3],[4,3],[9,3],[10,2],[9,-1],[37,-9],[8,-1],[16,-7],[9,-4],[7,3],[2,6],[-1,4],[0,4],[5,1],[11,0],[12,4],[9,0],[5,-2],[4,-3],[7,-2],[16,0],[20,4],[6,1],[6,0],[4,1],[1,3],[2,2],[7,2],[21,-1],[11,3],[8,5],[7,-1],[10,-5],[11,-16],[14,-13],[3,-3],[0,-4],[-3,-9],[-17,-8],[-6,-6],[-27,-14],[-20,-14],[-1,-12]],[[7824,3557],[-29,-17],[-16,-13],[-8,-5],[-12,-4],[-39,-4],[-30,-6],[-24,-7],[-13,-1],[-12,0],[-7,-3],[-12,0],[-27,-3],[-11,-5],[-10,-8],[-7,-4],[-9,-4],[-25,-4],[-14,-4],[-45,-9],[-21,-9],[-11,-2],[-11,-1],[-9,1],[-8,2],[-6,3],[-8,2],[-7,2],[-8,-1],[-26,2],[-62,-2],[-6,1],[-5,1],[-5,-2],[-11,-12],[-27,-23],[-17,-9],[-22,-11],[-35,-10],[-55,-24],[-32,-20],[-12,-11],[-15,-10],[-11,-6],[-13,2],[-7,2],[-13,12],[-23,7],[-19,12],[-11,-2],[-3,-47],[-2,-15],[-5,-13],[-18,-19],[-6,-9],[-6,-20],[-14,-28],[-8,-11],[-3,-15],[-6,-16],[-31,-61],[-5,-4],[-2,-6],[0,-5],[0,-13],[0,-7],[10,-14],[2,-6],[8,-11],[5,-8],[6,-6],[3,-7],[-2,-5],[-7,-2],[-8,3],[-5,5],[-2,6],[-1,7],[-1,5],[-4,2],[-4,-1],[-4,-3],[-1,-7],[1,-6],[-1,-4],[-10,1],[-5,-2],[-2,-6],[-1,-6],[1,-5],[-1,-6],[-8,-14],[-7,-8],[-13,-8],[-30,-26],[-8,-2],[-7,0],[-9,3],[-11,2],[-12,-3],[-9,-6],[-11,-13],[-4,-10],[-5,-8],[-21,-18],[-21,-13],[-126,-110]],[[5420,3290],[9,9],[2,272],[-1,72],[4,22],[5,5],[5,10],[6,7],[4,4],[0,5],[-2,4],[1,6],[5,5],[8,4],[6,2],[3,0],[1,-5],[0,-4],[4,-4],[6,-1],[7,2],[20,10],[4,0],[3,-3],[7,-10],[4,-4],[22,3],[6,-2],[4,-3],[5,-1],[3,4],[4,18],[8,-13],[-2,-6],[0,-7],[3,-4],[3,-1],[5,3],[5,4],[11,1],[6,-3],[3,-5],[4,-1],[2,4],[3,6],[4,4],[8,0],[3,-3],[-1,-8],[3,-3],[5,1],[4,4],[3,4],[6,1],[17,-5],[11,2],[17,1],[6,4],[0,5],[-5,4],[1,3],[22,9],[11,-3],[17,2],[4,-2],[2,-4],[2,-5],[5,-3],[6,0],[7,3],[3,4],[0,9],[4,3],[5,-2],[4,-2],[6,-3],[4,1],[10,8],[13,8],[11,3],[6,0],[4,-3],[7,-1],[9,5],[14,9],[12,5],[5,6],[6,5],[14,2],[2,5],[-2,5],[-4,4],[-4,3],[3,9],[13,5],[3,6],[6,8],[58,27],[12,4],[8,-1],[6,-8],[6,-4],[7,-8],[16,-4],[9,9],[6,12],[8,6],[22,4],[9,-3],[4,-19],[2,-5],[5,-2],[6,2],[5,23],[10,8],[7,-4],[11,-15],[-5,0],[2,-2],[8,-2],[0,16],[2,12],[8,6],[17,0],[0,4],[-4,2],[-4,2],[-4,3],[-2,3],[2,5],[4,0],[6,-2],[6,-1],[8,-1],[4,-1],[3,0],[16,10],[6,3],[24,1],[12,2],[11,5],[26,20],[12,0],[26,-12],[4,11],[6,8],[8,1],[10,-9],[8,-19],[3,-3],[3,11],[0,11],[-2,6],[2,4],[9,5],[9,4],[9,2],[9,0],[1,-1],[0,14],[-2,10],[-1,10],[3,8],[8,4],[26,3],[14,4],[10,-3],[9,-13],[10,-6],[16,-4],[25,-2],[8,-5],[3,2],[6,-7],[8,0],[10,2],[9,1],[3,1],[3,2],[2,1],[11,2],[58,9],[15,6],[7,6],[9,5],[5,-1],[5,-5],[5,-16],[7,-3],[5,6],[3,10],[0,17],[3,3],[5,0],[25,-21],[10,-2],[8,3],[5,5],[6,5],[4,0],[2,-3],[-1,-16],[3,-6],[14,-2],[29,11],[7,6],[5,6],[8,2],[9,0],[18,2],[13,-2],[15,-4],[8,2],[9,11],[5,0],[23,-12],[13,-5],[8,1],[3,6],[2,6],[4,4],[6,-1],[6,-4],[6,-5],[6,1],[4,6],[4,15],[4,5],[7,0],[5,-5],[3,-8],[5,-6],[6,-4],[12,0],[6,-2],[9,-4],[6,0],[8,2],[23,15],[7,-1],[7,-4],[7,-5],[7,-1],[6,2],[5,5],[5,-2],[15,-6],[12,3]],[[8002,3336],[-1,0],[-3,2],[-21,9],[-30,8],[-32,2],[-20,6],[-34,14],[-72,50],[-5,9],[2,10],[29,58],[7,29],[2,24]],[[7558,3941],[22,15],[56,20],[17,8],[8,7],[1,7],[3,7],[5,6],[35,18],[4,10],[0,14],[-3,11],[-6,9],[-2,6],[3,3],[7,2],[8,3],[2,5],[-1,5],[-6,4],[-6,2],[-10,1],[-6,1],[-2,4],[3,3],[6,3],[6,4],[11,17],[14,15],[10,7],[16,7],[2,5],[3,2],[3,0],[9,-7],[6,-2],[8,3],[2,7],[-2,7],[0,7],[3,2],[3,0],[3,-4],[2,-5],[2,-5],[4,-2],[7,3],[2,7],[-1,8],[-11,15],[1,11],[5,3],[7,2],[4,0],[2,3],[-2,4],[-6,7],[-9,6],[-6,7],[-1,8],[10,8],[4,7],[3,7],[3,2],[1,15],[27,-1],[7,5],[6,25],[4,9],[-15,17],[-4,6],[13,2],[19,1],[16,-2],[8,-3],[2,-4],[7,-3],[9,-2],[7,-1],[18,23],[6,6],[9,4],[13,2],[6,-3],[5,-6],[4,-5],[1,-4],[2,-3],[5,6],[7,10],[11,2],[47,-2],[16,3],[12,3],[11,0],[14,-9],[11,-9],[7,-2],[4,5],[2,29],[5,6],[8,0],[12,8],[4,22],[-2,6],[-5,4],[3,6],[6,3],[13,1],[10,-1],[15,1],[16,2],[20,7],[13,3],[10,-2],[7,-6],[6,-6],[6,-2],[6,2],[11,3],[14,3],[26,7],[14,-1],[11,-7],[5,1],[1,8],[5,6],[9,2],[9,-4],[5,-7],[5,-5],[8,0],[7,1],[5,-1],[8,-8],[12,-4],[4,-2],[1,-4],[-1,-7],[1,-2],[6,1],[16,9],[8,2],[6,-2],[6,-4],[6,-4],[5,0],[-2,-16],[3,-3],[4,-4],[5,-3],[11,2],[6,5],[9,13],[8,5],[8,-2],[44,-6],[9,5],[-1,22],[4,9],[5,2],[4,0],[4,-1],[5,-1],[1,-2],[0,-2],[1,-3],[3,-1],[2,-1],[10,1],[23,9],[7,2],[6,-4],[8,-7],[16,0],[-1,10],[-3,11],[8,6],[7,-1],[13,-2],[8,-1],[8,3],[3,6],[0,8],[0,6],[6,1],[14,3],[15,10],[8,-1],[11,-5],[11,-3],[21,2],[9,4],[7,6],[6,3],[9,0],[7,-5],[7,-2],[4,3],[4,9],[9,9],[10,7],[10,2],[7,1],[5,0],[3,7],[7,4],[8,2],[5,0],[-7,8],[-1,7],[4,7],[14,2],[29,0],[6,4],[2,9],[5,9],[7,7],[-3,6],[-9,9],[0,10],[9,4],[15,0],[29,-4],[15,-6],[4,-12],[1,-13],[6,-8],[26,12],[17,5],[7,-7],[-2,-6],[-4,-6],[-2,-5],[4,-5],[9,-1],[9,4],[16,15],[5,6],[7,14],[6,7],[9,2],[7,-5],[10,-15],[13,-8],[9,4],[14,20],[4,-8],[1,-20],[5,-7],[8,-1],[9,4],[16,9],[24,-11],[25,-8],[26,0],[28,17],[32,38],[10,6],[12,4]],[[9432,4645],[4,-2],[6,-13],[2,-35],[4,-12],[27,-39],[6,-14],[4,-28],[4,-13],[12,-12],[13,-5],[13,0],[12,2],[14,0],[25,-9],[19,-22],[46,-98],[9,-11],[10,-6],[25,-8],[23,-19],[-4,-24],[-17,-23],[-41,-43],[-8,-5],[-7,-2],[-15,-2],[-8,-4],[-12,-9],[-29,-23],[-29,-22],[-29,-22],[-29,-22],[-28,-22],[-29,-23],[-29,-22],[-29,-22],[-17,-13],[-11,-16],[-1,-38],[10,6],[6,8],[6,7],[14,3],[15,-1],[7,1],[13,5],[6,-2],[7,-7],[28,-11],[17,-3],[13,4],[13,3],[12,-8],[10,-13],[5,-10],[3,-25],[4,-13],[8,-5],[31,0],[12,-4],[10,-7],[3,-5],[4,-10],[3,-5],[6,-3],[14,-6],[3,-4],[3,-4],[10,-11],[3,-3],[8,-2],[5,-5],[4,-6],[4,-6],[6,-4],[15,-7],[7,-4],[3,-6],[3,-7],[4,-7],[6,-3],[7,-2],[7,-4],[13,-11],[6,-3],[24,-7],[23,-11],[5,-4],[3,-6],[0,-10],[4,-6],[4,-11],[-9,-11],[-13,-10],[-8,-8],[1,-10],[10,-22],[5,-17],[11,-24],[6,-7],[10,-5],[12,-3],[10,-5],[5,-9],[2,-30],[-2,-10],[-3,-4],[-11,-12],[2,-7],[4,-6],[5,-4],[6,-7],[12,-8],[3,-4],[2,-6],[12,-19],[58,-128],[2,-12],[0,-25],[2,-11],[7,-13],[14,-19],[7,-12],[2,-13],[-4,-23],[2,-8],[6,-5],[8,-5],[7,-6],[7,-12],[5,-13],[1,-14],[-12,-21],[3,-13],[14,-24],[-26,-4],[-43,-10],[-59,-14],[-14,2],[-6,14],[-2,29],[16,162],[-6,35],[-23,59],[-26,44],[-73,82],[-16,23],[-22,44],[-13,21],[-17,14],[-11,4],[-29,9],[-10,1],[-7,-3],[-11,-10],[-6,-3],[-24,-2],[-11,-6],[-18,-14],[-26,-10],[-52,-46],[-81,-90],[-21,-16],[-27,-12],[-22,-7],[-24,-5],[-24,0],[-22,5],[-23,16],[-18,21],[-14,25],[-15,36],[-6,10],[-10,8],[-16,5],[-14,2],[-5,2],[-5,5],[-2,4],[0,11],[-3,4],[-6,-4],[-40,-84],[-13,-16],[4,-3],[17,-1],[7,-7],[-2,-12],[2,-11],[25,0],[5,-3],[2,-5],[-1,-7],[2,-4],[6,-3],[12,-5],[-51,0],[-32,0],[-85,0],[-121,0],[-137,0],[-138,-1],[-120,0],[-85,0],[-32,0],[-28,3],[-51,18],[-49,9],[-26,-2],[-46,-17],[-28,-2],[-14,2],[-12,0],[-12,-2],[-28,-13],[-13,-3],[-22,0]],[[7181,5139],[-3,-874],[0,-277]],[[8002,3336],[-10,0],[4,-21],[0,-39],[0,-39],[0,-38],[-1,-39],[0,-38],[0,-39],[0,-38],[-1,-39],[0,-34],[16,-1],[28,15],[17,4],[8,0],[9,-1],[6,-3],[1,-13],[7,-1],[65,8],[15,-1],[29,-8],[7,-1],[23,1],[21,2],[6,-1],[6,-2],[3,-2],[2,-3],[4,-2],[13,-7],[6,-1],[32,19],[11,3],[11,-2],[34,-14],[9,-6],[12,-12],[11,-6],[5,-4],[2,-6],[1,-6],[2,-6],[14,-8],[-3,-20],[11,-8],[15,-5],[8,-4],[4,-5],[0,-8],[-4,-2],[-7,-1],[-4,-2],[-2,-12],[7,-25],[0,-13],[-4,-6],[-8,-4],[-4,-5],[2,-8],[5,-4],[15,-6],[5,-4],[7,-12],[3,-10],[-5,-7],[-12,-4],[-6,1],[-13,4],[-7,0],[-5,-3],[-7,-8],[-5,-3],[-11,-1],[-25,3],[-12,0],[3,15],[-6,6],[-13,0],[-14,-3],[-14,-5],[-4,2],[-48,40],[-12,6],[-14,3],[-17,-2],[-13,-5],[-22,-11],[-13,-1],[-13,-5],[-7,-13],[-10,-9],[-21,4],[-19,7],[-11,-1],[-25,-17],[-24,-10],[-25,-8],[-28,-4],[-46,-2],[-13,-4],[-13,-1],[-15,2],[-16,0],[-14,-6],[-13,-3],[-10,8],[-1,-39],[-1,-14],[-1,-38],[-2,-53],[-2,-62],[-2,-61],[-1,-53],[-2,-38],[0,-14],[-1,-28],[4,-20],[8,-12],[26,-25],[34,-26],[15,-19],[7,-5],[13,-4],[27,-5],[11,-6],[5,-5],[6,-13],[5,-5],[7,-4],[15,-6],[7,-4],[20,-19],[10,-6],[54,-17],[12,-5],[11,-9],[9,-10],[5,-11],[3,-12],[1,-17],[1,-5],[4,-6],[4,-4],[4,-5],[2,-7],[-5,-13],[-21,-27],[-4,-10],[7,-13],[25,-24],[5,-8],[-2,-14],[2,-6],[6,-8],[5,-3],[5,-2],[4,-3],[4,-6],[1,-7],[-2,-5],[0,-6],[4,-7],[6,-4],[15,-6],[6,-3],[15,-18],[4,-3],[7,0],[3,-2],[2,-2],[3,-4],[-2,-1],[4,-22],[-2,-6],[-4,-12],[0,-6],[26,-34],[7,-17],[-14,-31],[0,-1]],[[8277,5814],[1,0],[17,4],[32,13],[18,2],[13,-5],[29,-28],[15,-9],[39,18],[40,32],[14,7],[19,15],[13,5],[16,0],[14,-2],[26,-10],[11,3],[16,-3],[16,-5],[14,-2],[43,2],[14,-2],[43,-11],[16,-1],[13,-3],[28,-11],[17,-1],[9,3],[17,13],[8,3],[42,2],[49,12],[15,1],[14,-1],[44,-10],[25,0],[76,23],[30,3],[86,-7],[27,4],[24,6],[6,1],[7,2],[5,4],[3,6],[2,6],[3,7],[8,2],[9,-1],[7,2],[7,4],[13,11],[8,3],[6,1],[12,-3],[47,-4],[105,-20],[20,-10],[18,-15],[19,-11],[26,-2],[1,0],[-4,-3],[-14,-8],[-7,-7],[-3,-8],[0,-21],[25,-33],[17,-10],[5,-11],[2,-13],[-3,-10],[-8,-5],[-24,-9],[-10,-5],[-32,-29],[-6,-9],[-40,-31],[-16,-20],[-11,-23],[-5,-24],[0,-26],[7,-33],[2,-11],[2,-2],[10,-8],[2,-3],[-2,-7],[-4,-4],[-4,-4],[-4,-4],[-8,-21],[-4,-3],[-8,-1],[-7,-5],[-12,-11],[-6,-3],[-20,-6],[-3,-3],[-7,-6],[-4,-3],[-3,0],[-7,1],[-3,-1],[-25,-17],[-17,-22],[-6,-24],[6,-21],[6,-10],[5,-8],[2,-10],[1,-13],[-1,-5],[-6,-13],[-2,-7],[0,-6],[0,-6],[2,-6],[2,-5],[4,-6],[12,-11],[3,-4],[-2,-6],[-3,-4],[-3,-3],[-1,-3],[1,-25],[-1,-10],[-9,-22],[-5,-22],[0,-13],[1,-4],[6,-10],[2,-3],[0,-7],[-2,-4],[-1,-3],[3,-5],[-5,-11],[-1,-25],[-5,-9],[-7,-9],[-4,-12],[-2,-31],[-4,-15],[1,-18],[-1,-5],[-4,-5],[-4,-3],[-4,-3],[-1,-8],[2,-6],[4,-6],[6,-4],[6,-4],[0,4],[13,-7],[4,-8],[6,-19],[3,-3],[8,-2],[3,-3],[0,-5],[-4,-8],[-1,-4],[2,-8],[10,-12],[2,-7],[-2,-7],[-12,-18],[-3,-21],[4,-19],[5,-17],[3,-18],[6,-11],[13,-8],[12,-11],[6,-19],[8,-6],[4,-10],[-2,-10]]],"transform":{"scale":[0.0014850128004800518,0.0017816621349134886],"translate":[-81.72370357999998,-4.236484476999891]}};
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
