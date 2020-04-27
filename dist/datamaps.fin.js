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
  Datamap.prototype.finTopo = {"type":"Topology","objects":{"fin":{"type":"GeometryCollection","geometries":[{"type":"MultiPolygon","properties":{"name":"Lapland"},"id":"FI.","arcs":[[[0]],[[1]],[[2]],[[3]],[[4]],[[5]],[[6]],[[7]],[[8]],[[9]],[[10]],[[11]],[[12,13]]]},{"type":"Polygon","properties":{"name":"Central Finland"},"id":"FI.","arcs":[[14,15,16,17,18,19,20]]},{"type":"Polygon","properties":{"name":"Northern Savonia"},"id":"FI.","arcs":[[21,22,-15,23,24]]},{"type":"Polygon","properties":{"name":"Kainuu"},"id":"FI.","arcs":[[25,26,-25,27]]},{"type":"MultiPolygon","properties":{"name":"Northern Ostrobothnia"},"id":"FI.","arcs":[[[28]],[[29]],[[30]],[[31]],[[32]],[[33]],[[34]],[[35]],[[36]],[[37]],[[38]],[[39]],[[40]],[[41]],[[42]],[[43]],[[44]],[[45]],[[46]],[[47]],[[48,-28,-24,-21,49,50,-13]]]},{"type":"MultiPolygon","properties":{"name":"Central Ostrobothnia"},"id":"FI.","arcs":[[[51]],[[52]],[[53]],[[54]],[[55]],[[56]],[[57]],[[-20,58,59,60,-50]],[[61]],[[62]],[[63]],[[64]],[[65]],[[66]],[[67]],[[68]]]},{"type":"MultiPolygon","properties":{"name":"Ostrobothnia"},"id":"FI.","arcs":[[[69]],[[70]],[[71]],[[72]],[[73]],[[74]],[[75]],[[76]],[[77]],[[78]],[[79]],[[80]],[[81]],[[82]],[[83]],[[84]],[[85]],[[86]],[[87]],[[88]],[[89]],[[90]],[[91]],[[92]],[[93]],[[94]],[[95]],[[-60,96,97,98]],[[99]],[[100]],[[101]],[[102]],[[103]],[[104]]]},{"type":"Polygon","properties":{"name":"Southern Ostrobothnia"},"id":"FI.","arcs":[[-59,-19,105,106,-97]]},{"type":"Polygon","properties":{"name":"Päijät-Häme"},"id":"FI.","arcs":[[107,108,109,110,111,-17]]},{"type":"Polygon","properties":{"name":"Tavastia Proper"},"id":"FI.","arcs":[[112,113,114,-111]]},{"type":"Polygon","properties":{"name":"Pirkanmaa"},"id":"FI.","arcs":[[-18,-112,-115,115,116,-106]]},{"type":"MultiPolygon","properties":{"name":"Kymenlaakso"},"id":"FI.","arcs":[[[117]],[[118]],[[119]],[[120]],[[121,122,123,-109,124]]]},{"type":"Polygon","properties":{"name":"South Karelia"},"id":"FI.","arcs":[[125,-122,126,127]]},{"type":"Polygon","properties":{"name":"Southern Savonia"},"id":"FI.","arcs":[[-127,-125,-108,-16,-23,128]]},{"type":"Polygon","properties":{"name":"North Karelia"},"id":"FI.","arcs":[[129,-128,-129,-22,-27]]},{"type":"MultiPolygon","properties":{"name":"Finland Proper"},"id":"FI.","arcs":[[[130]],[[131]],[[132]],[[133]],[[134]],[[135]],[[136]],[[137]],[[138]],[[139]],[[140]],[[141]],[[142]],[[143]],[[144]],[[145]],[[146]],[[147]],[[148]],[[149]],[[150]],[[151]],[[152]],[[153]],[[154]],[[155]],[[156]],[[157]],[[158]],[[159]],[[160]],[[161]],[[162]],[[163]],[[164]],[[165]],[[166]],[[167]],[[168]],[[169]],[[170]],[[171]],[[172]],[[173]],[[174]],[[175]],[[176]],[[177]],[[178]],[[179]],[[180]],[[181]],[[182]],[[183]],[[184]],[[185]],[[186]],[[187]],[[188]],[[189]],[[190]],[[191]],[[192]],[[193]],[[194]],[[195]],[[196]],[[197]],[[198]],[[199]],[[200]],[[201]],[[202]],[[203]],[[204]],[[205]],[[206]],[[207]],[[208]],[[209]],[[210]],[[211]],[[212]],[[213]],[[214]],[[215]],[[216]],[[217]],[[218]],[[219]],[[220]],[[221]],[[222]],[[223]],[[224]],[[-114,225,226,227,-116]]]},{"type":"MultiPolygon","properties":{"name":"Satakunta"},"id":"FI.","arcs":[[[228]],[[229]],[[230]],[[231]],[[232]],[[233]],[[234]],[[-228,235,-98,-107,-117]]]},{"type":"MultiPolygon","properties":{"name":"Uusimaa"},"id":"FI.","arcs":[[[236]],[[237]],[[238]],[[239]],[[240]],[[241]],[[242]],[[243]],[[244]],[[245]],[[-124,246,-226,-113,-110]]]}]}},"arcs":[[[3835,5614],[0,-1],[-8,0],[0,4],[8,-3]],[[4050,5655],[-4,0],[-2,2],[-9,3],[-8,8],[3,1],[15,2],[7,-9],[-4,-1],[1,-2],[1,-4]],[[3966,5658],[-9,-2],[-10,5],[-5,5],[-2,7],[5,6],[8,-1],[4,-6],[6,-3],[-4,-3],[7,-4],[0,-4]],[[3720,5686],[5,-7],[-11,3],[0,5],[6,-1]],[[3898,5683],[-7,-4],[-7,2],[0,5],[5,3],[11,4],[1,-7],[-3,-3]],[[3863,5692],[-5,0],[1,7],[9,-1],[9,-2],[-1,-3],[-13,-1]],[[3535,5736],[-5,-1],[-4,3],[2,3],[7,1],[3,-3],[-3,-3]],[[3341,5753],[8,-7],[5,1],[2,-3],[-3,-4],[-4,0],[-8,13]],[[3659,5753],[5,-7],[-2,-5],[-5,1],[-6,3],[-6,4],[-8,2],[-9,-3],[-1,-7],[6,-7],[2,-5],[-2,-3],[-4,0],[-6,-1],[-4,-1],[-1,-3],[0,-4],[-2,-2],[-6,0],[-11,0],[-11,2],[-7,3],[-2,0],[-4,-1],[-6,2],[-5,2],[-5,2],[-1,5],[2,2],[4,0],[3,1],[9,0],[14,1],[16,7],[10,5],[1,1],[3,2],[3,5],[4,5],[9,1],[10,-2],[7,-1],[2,-1],[4,-3]],[[3560,5757],[-7,0],[-1,3],[5,6],[3,4],[3,6],[8,1],[2,-9],[-6,-7],[-7,-4]],[[3287,5821],[2,0],[2,1],[6,1],[-2,-5],[-4,-3],[0,-2],[0,-1],[-7,2],[-2,4],[-5,-1],[-10,2],[-4,6],[9,4],[9,-2],[6,-6]],[[3541,5805],[-11,-3],[-11,5],[-2,6],[15,9],[16,7],[7,3],[3,2],[1,1],[7,1],[5,-5],[-3,-5],[-9,-5],[-6,-8],[-4,-4],[-8,-4]],[[8151,6466],[-1,0],[-218,-2],[-79,-12],[-47,2],[-397,63],[-41,-11],[-4,-6],[-4,-14],[-4,-24],[-6,-12],[-11,-5],[-31,1],[-12,-2],[-18,-9],[-18,-14],[-16,-17],[-9,-23],[4,-33],[23,-23],[34,-16],[37,-10],[-1,-1],[-3,-7],[0,-1],[12,0],[34,7],[22,1],[13,-1],[13,-6],[-4,-7],[3,-2],[8,-1],[4,-1],[2,-1],[-2,-6],[-19,-22],[-4,-4],[1,-4],[5,-2],[21,-11],[-3,-7],[-27,-13],[-11,-10],[-2,-6],[-7,-14],[-12,-5],[-27,-5],[-45,-2],[-10,-6],[12,-16],[10,-9],[6,-4],[5,-5],[-8,-8],[-2,-1],[56,-21],[29,-7],[14,0],[13,-2],[0,-22],[-14,-15],[-17,-7],[-43,-5],[-116,6],[-80,-11],[-21,0],[-22,3],[0,1],[4,7],[0,2],[-3,2],[-4,0],[-19,0],[-2,-2],[2,-4],[4,-14],[2,-3],[0,-4],[-12,-2],[-6,-3],[16,-12],[20,-8],[74,-46],[16,-26],[-8,-15],[-32,-20],[-43,-10],[-84,-4],[-84,-16],[-41,-3],[-392,24],[0,2],[4,11],[-25,14],[-20,20],[-34,45],[-42,28],[-34,-2],[-29,-17],[4,-3],[-17,-6],[-17,1],[-96,25],[-27,-10],[-211,-152],[-62,-33],[-238,-44],[-597,14],[-21,6],[-6,16],[0,26],[4,39],[-31,5],[-231,-53],[-104,-13],[-234,7],[-107,-17],[-179,-85],[-63,-41],[-28,-14]],[[4083,5651],[-1,3],[-6,10],[-10,9],[-12,3],[-23,-3],[-12,7],[-16,5],[-44,-4],[-18,2],[-12,6],[-17,15],[-9,5],[-34,8],[-36,3],[-36,-3],[-32,-8],[-24,-13],[-11,-5],[-18,-1],[-10,4],[-4,9],[-1,37],[-2,7],[-8,4],[-58,14],[-11,8],[-15,13],[-12,14],[-4,18],[9,25],[14,18],[52,51],[12,18],[8,6],[15,6],[25,3],[9,4],[3,13],[-15,-8],[-48,-12],[-7,-1],[-8,1],[-7,-2],[-3,-8],[1,-10],[-1,-5],[-3,-1],[-22,-10],[-40,-44],[-23,-13],[-22,-1],[-19,2],[-19,0],[-20,-7],[-2,-3],[-2,-5],[-3,-5],[-7,-4],[-10,-3],[-43,10],[-27,18],[-10,4],[-36,7],[-36,13],[9,-13],[3,-15],[-6,-12],[-18,-6],[-17,4],[-16,11],[-14,13],[-9,12],[0,6],[0,18],[-36,27],[-20,38],[-24,19],[-19,20],[2,21],[-2,15],[-23,48],[-9,14],[-10,6],[-22,10],[-10,7],[-8,8],[-49,65],[-21,12],[-94,15],[-33,13],[-23,16],[-32,49],[-8,26],[-14,21],[-2,11],[1,10],[8,12],[3,11],[1,13],[-5,17],[-2,13],[-4,10],[-17,18],[-4,12],[9,22],[22,15],[27,8],[23,5],[0,15],[22,8],[28,7],[18,9],[2,11],[49,15],[19,9],[8,14],[2,17],[-4,18],[-6,17],[9,15],[6,18],[4,20],[0,20],[-10,35],[0,7],[30,22],[13,17],[20,3],[21,-1],[14,3],[4,9],[-2,7],[-37,48],[-25,26],[-19,14],[-36,21],[-52,49],[-22,13],[-28,5],[-16,7],[-22,15],[-33,32],[-7,9],[-3,7],[-2,8],[-1,12],[-3,11],[-8,6],[-9,4],[-25,20],[-20,11],[-16,12],[-7,20],[12,7],[10,9],[9,11],[7,12],[-17,4],[-5,7],[3,19],[8,15],[18,9],[103,20],[25,16],[21,30],[-31,9],[-1,22],[11,27],[2,22],[-11,7],[-20,4],[-63,5],[-62,17],[-37,-2],[-36,-7],[-34,-1],[-31,17],[-11,24],[11,18],[21,17],[17,20],[-10,12],[23,11],[33,10],[17,10],[-3,23],[-7,16],[-22,25],[-7,16],[-11,38],[-10,16],[-3,12],[0,57],[-5,20],[-2,24],[4,22],[16,17],[31,11],[64,9],[30,11],[23,18],[1,17],[-17,13],[-64,10],[-81,41],[-25,8],[-68,26],[-7,9],[-4,8],[-37,57],[-10,11],[-12,7],[-31,-1],[-78,-22],[-20,0],[-6,5],[-4,1],[-2,2],[-2,9],[0,5],[4,9],[5,24],[-1,8],[-8,7],[5,22],[-14,17],[-41,20],[-12,10],[-5,8],[-3,8],[-6,8],[-13,8],[-136,37],[-26,14],[-38,33],[-23,9],[-54,-9],[-27,13],[-27,18],[-25,10],[-18,0],[-16,-2],[-16,0],[-39,11],[-40,1],[-59,14],[-72,2],[-4,2],[1,10],[-3,2],[-62,7],[-211,1],[-31,11],[-2,5],[1,6],[-1,7],[-7,2],[-4,2],[-11,5],[-13,9],[-26,15],[-5,6],[-41,21],[-166,19],[-19,30],[-50,14],[-82,33],[-70,8],[-29,11],[-11,9],[-28,30],[-5,11],[-9,10],[-18,5],[-65,0],[-9,1],[-4,4],[-6,8],[-5,2],[-12,6],[-54,40],[-58,24],[-74,27],[-152,24],[-19,12],[3,20],[27,5],[15,16],[0,17],[-21,14],[-43,5],[-63,24],[-109,7],[-48,18],[85,60],[26,5],[263,-61],[36,-4],[25,7],[52,42],[-112,91],[27,33],[15,14],[17,10],[197,50],[297,-20],[22,-7],[258,-192],[71,-52],[126,-54],[12,-12],[13,-25],[11,-10],[70,-49],[73,-24],[13,-10],[23,-88],[11,-18],[18,-3],[105,16],[24,0],[25,-2],[233,-47],[153,10],[47,-5],[25,-11],[70,-47],[21,-3],[259,65],[146,9],[85,20],[31,40],[17,42],[60,16],[70,0],[184,-39],[30,-20],[21,-10],[133,-35],[136,-19],[167,-23],[82,-27],[69,-42],[29,-30],[17,-8],[23,2],[20,13],[11,17],[12,16],[27,10],[23,0],[59,16],[24,2],[18,4],[14,10],[11,19],[-11,9],[0,6],[6,5],[4,7],[1,46],[5,21],[12,19],[35,28],[170,60],[42,9],[43,3],[111,-15],[23,2],[22,9],[14,14],[11,14],[15,13],[29,16],[10,10],[4,13],[11,12],[38,15],[8,12],[-3,7],[-8,5],[-17,7],[-7,5],[-2,4],[2,4],[-1,4],[-14,16],[0,6],[7,9],[1,7],[2,32],[1,4],[4,3],[3,5],[2,7],[-3,7],[-12,17],[-5,5],[-14,26],[2,26],[35,78],[11,14],[82,56],[-4,8],[-28,37],[22,23],[11,6],[8,8],[-1,23],[6,11],[13,11],[-5,7],[-9,5],[-4,6],[12,11],[55,16],[24,17],[16,21],[1,23],[-22,22],[-15,8],[-2,10],[6,10],[11,12],[22,14],[25,7],[136,14],[16,4],[11,7],[11,9],[42,26],[44,35],[93,40],[27,19],[-11,18],[9,7],[32,17],[18,19],[30,6],[158,10],[60,-6],[84,9],[29,-4],[50,-13],[28,3],[24,-1],[67,-19],[18,-1],[193,27],[37,18],[-7,2],[-13,7],[-7,2],[11,9],[13,2],[14,1],[15,2],[59,28],[108,20],[6,17],[38,20],[48,6],[117,-9],[68,16],[28,-4],[27,-17],[49,-43],[170,-111],[20,-9],[176,-28],[-2,-33],[23,-20],[35,-10],[35,-6],[297,-54],[297,-54],[14,-10],[51,-76],[130,-117],[-106,-85],[-333,-156],[-11,-12],[-8,-22],[-15,-72],[0,-16],[11,-10],[105,-51],[-110,-42],[-110,-16],[-235,-66],[-42,-1],[3,-18],[12,-9],[16,-5],[184,6],[76,-7],[67,-28],[-50,-73],[-28,-32],[-234,-179],[-11,-13],[-1,-14],[12,-23],[19,-28],[167,-251],[24,-20],[34,-10],[261,-44],[261,-44],[29,-9],[27,-15],[75,-64],[35,-30],[156,-133],[57,-30],[270,-103],[-20,-13],[-9,-10],[-4,-13],[-8,-62],[-4,-13],[-24,-44],[-16,-17],[-362,-204],[-11,-10],[-10,-17],[-6,-7],[-9,-6],[-47,-23],[-301,-235],[-44,-81],[34,-68],[213,-152],[37,-52],[1,-2],[26,-19],[3,-9],[1,-9],[4,-10],[8,-8],[105,-75],[9,-16],[11,-41]],[[5037,3580],[10,-3],[20,-9],[-6,-13],[-59,-49],[-11,-11],[6,-17],[15,-8],[22,-25],[29,-58],[17,-28],[-1,-12],[-20,-4],[-6,-8],[1,-21],[4,-29],[38,-26],[30,-30],[34,-29],[26,-13],[12,-12],[-40,3],[-24,-4],[-9,-5],[3,-16],[10,-9],[22,-14],[27,-9],[16,-1],[5,-12],[-12,-13],[-19,-10],[-10,-1],[-36,7],[-51,2],[-110,-16],[-11,-16],[15,-13],[30,-15],[60,-19],[19,-11],[-4,-2],[-20,-14],[12,-12],[170,-72],[13,-3],[18,10],[19,15],[23,-1],[29,-12],[31,-18],[13,-12],[6,-13],[9,-19],[22,-13],[20,-31],[13,-31],[-5,-15],[-9,-9],[3,-1],[3,0],[3,0],[3,-6],[-11,-11],[-92,-56],[5,-13],[93,-39],[26,-7],[63,-3],[23,-9]],[[5562,2606],[-6,-19],[-7,-13],[-4,-7],[-6,-6],[6,-11],[67,-31],[-3,-7],[-44,-6],[-27,-8],[-12,-7],[-6,-11],[2,-1],[7,-1],[3,-1],[-3,-7],[-6,-5],[-13,-5],[-26,-5],[-4,-11],[4,-5],[6,-11],[2,-14],[0,-7],[10,-10],[9,-5],[-8,-4],[-23,1],[-24,8],[-25,14],[-10,3],[-23,3],[-11,-1],[-19,-4],[-15,-11],[4,-1],[5,-1],[3,-1],[-3,-6],[-5,-4],[-12,-7],[-13,-5],[-7,-2],[-26,11],[-22,0],[-60,-25],[-82,-59],[3,-35],[130,-107],[-3,-25],[-24,-7],[-12,-17],[-2,-25],[-10,-29],[5,0],[28,0],[8,-9],[0,-9],[-6,-36],[5,-16],[7,-7],[81,-45],[12,-10],[30,-32],[8,-13],[0,-15],[-13,-46],[-17,-8],[-93,25],[-20,-4],[-11,-15],[-3,-7],[1,-5],[-4,-7],[-22,-8],[-10,-1]],[[5203,1788],[-7,9],[-4,7],[1,8],[4,6],[-8,11],[-13,2],[-34,-2],[-80,-18],[-8,-5],[-9,0],[-25,16],[-37,8],[-10,5],[-9,9],[0,3],[4,1],[5,7],[4,10],[7,12],[2,5],[-3,5],[-7,3],[-5,6],[-12,8],[-20,-9],[-19,2],[-9,7],[-12,21],[-7,9],[-13,8],[-36,17],[-8,-5],[-4,-8],[-10,-10],[-14,-2],[-10,2],[-4,8],[5,7],[2,11],[-6,7],[-9,3],[-9,-11],[-6,-12],[-26,-38],[-34,-32],[-14,-8],[-14,0],[8,9],[-17,2],[-44,1],[-24,-2],[-28,-8],[-33,-16],[-14,-4],[-47,6],[-13,-3],[-13,-24],[-23,-86],[-15,-36],[-16,-23],[-15,-13],[-22,-6],[-398,-32],[-8,5]],[[3960,1641],[-15,30],[-5,29],[-14,21],[-19,6],[-3,5],[14,11],[-5,18],[-29,3],[-21,-10],[-21,-5],[-7,11],[-17,18],[-12,17],[7,21],[30,16],[37,-4],[60,-16],[20,5],[0,6],[1,4],[3,3],[5,5],[-2,10],[-22,16],[-13,12],[-5,13],[8,18],[13,7],[14,-2],[6,-4],[16,-4],[10,7],[-1,15],[-22,24],[-4,9],[5,2],[8,4],[-19,4],[-20,10],[-7,27],[9,38],[6,47],[-8,33],[-38,68],[-7,17],[-18,16],[-87,-20],[-28,-1],[-52,15],[-16,9],[-1,7],[-1,15],[1,17],[2,10],[-16,12],[-17,5],[-23,16],[-17,19],[-22,18],[-32,11],[-28,0],[-47,-12],[-15,-6],[11,-14],[-26,-5],[-36,4],[-11,7],[-29,9],[-36,31],[-11,21],[-32,25],[-74,9],[-41,9],[-39,12],[-21,10],[-17,13],[-11,21],[-3,32]],[[3103,2521],[27,26],[75,49],[34,17],[27,10],[20,2],[76,-14],[21,2],[7,10],[-5,11],[-1,11],[41,8],[13,-4],[8,0],[12,-2],[9,-7],[3,-6],[11,-2],[19,10],[20,7],[11,2],[12,1],[11,5],[-3,6],[0,4],[11,6],[3,13],[1,10],[2,3],[0,3],[-2,5],[0,5],[3,0],[9,-1],[2,0],[0,3],[-3,1],[-2,4],[0,6],[0,2],[5,2],[20,3],[1,3],[-2,4],[-4,10],[-1,4],[-2,3],[0,3],[20,-1],[4,3],[1,6],[-8,2],[-26,-2],[-28,1],[-3,9],[8,7],[46,25],[-12,15],[-19,11],[-30,24],[-70,81],[-57,46],[0,18],[14,2],[56,4],[9,15],[-7,12],[-22,15],[-31,6],[-20,0],[-16,16],[1,17],[-7,13],[-13,6],[-12,10],[-7,13],[-3,10],[-1,12],[0,9],[-3,8],[-4,-1],[-6,-2],[-7,3],[-11,24],[32,5],[23,11],[17,19],[16,23]],[[3416,3254],[151,38],[52,-2],[138,-19],[3,5],[-2,20],[6,17],[12,27],[7,23],[-3,12],[-2,18],[8,4],[23,7],[6,1],[-14,35],[-1,39],[26,28],[77,36],[121,39]],[[4024,3582],[48,13],[22,28],[15,37],[27,36],[36,21],[38,4],[72,-9],[43,-10],[80,-39],[42,-10],[224,-13],[46,-14],[73,-45],[41,-18],[54,-8],[53,4],[99,21]],[[7066,3869],[28,-13],[51,-34],[22,-8],[74,-4],[27,-6],[14,-5],[11,-8],[-3,-2],[-15,-14],[17,-34],[8,-26],[17,-22],[24,-11],[14,-12],[-11,-2],[-20,-1],[-18,-6],[-9,-7],[5,-18],[9,-10],[10,-21],[9,-23],[12,-20],[19,-16],[25,-14],[40,-16],[8,-13],[-4,-9],[-1,-8],[-3,-23],[-4,-12],[-11,-11],[-30,-21],[-4,-6],[7,-5],[3,-2],[-4,-5],[-48,-19],[-5,-5],[11,-4],[-2,-6],[-36,-27],[22,-11],[28,-10],[43,-22],[143,-101],[160,-59],[5,-17],[-11,-6],[-51,-15],[-12,-5],[-6,-9],[4,-2],[14,-8],[5,-2],[-4,-5],[-9,-2],[-16,1],[-15,5],[-6,3],[-6,-7],[6,-10],[15,-9],[28,-10],[21,-21],[27,-13],[45,-13],[-7,-12],[-114,-47],[-30,-6],[-40,12],[-37,20],[-39,12],[-24,-2],[-24,-31],[-16,-12],[-49,-14],[-24,-22],[51,-50],[-14,-7],[-7,-4],[-11,-11],[-8,-16]],[[7340,2802],[-9,-14],[-12,-14],[-14,-11],[-7,-4],[-3,-3],[19,-1],[-13,-8],[-18,-6],[-92,-3],[-15,-6],[52,-10],[-1,-12],[-13,-3],[-9,5],[-72,7],[-18,9],[-4,-6],[3,-3],[2,-1],[1,-1],[-10,-36],[-10,-13],[-10,-5],[-9,-10],[16,-14],[5,-11],[-7,-12],[-20,-3],[-67,12],[-8,-6],[3,-5],[15,-6],[2,-4],[-2,-6],[-7,-2],[-6,0],[-13,-1],[-12,-6],[-6,-4],[3,-7],[7,-2],[12,-6],[7,-9],[2,-7],[6,-8],[26,-9],[5,-1],[-4,-13],[-13,-8],[-32,-4],[-33,2],[-26,-1],[-110,-36],[-14,-19],[-6,-11],[-30,-6],[-56,2],[-14,-5],[20,0],[-3,-10],[-10,-7],[-18,4],[-21,11],[-22,10],[-15,-4],[-33,-1],[-8,-1],[-68,38],[-19,21],[19,23],[-27,6],[-42,6],[0,1],[3,6],[1,3],[-22,8],[-116,56],[-32,19],[-16,5],[-27,12],[-17,3],[-2,2],[-19,11],[-29,8],[-5,3],[-31,4],[2,-3],[7,-13],[-5,-6],[-7,-2],[-35,-16],[-24,-5],[-22,-1],[-48,-10],[-16,0],[-5,6],[-18,12],[-17,4],[-17,2],[-49,-14],[-33,-1],[-44,8],[-13,1],[-10,-3],[1,-15],[6,-9],[-14,-1],[-65,20],[-18,0],[-18,-8],[-10,-7],[-8,-9],[3,-1],[9,-2],[-14,-9],[-17,-5],[-28,1],[-53,18]],[[5037,3580],[27,24],[8,10],[4,12],[11,34],[6,14],[20,17],[22,9],[37,9],[4,33],[-34,154],[-13,24],[55,46],[361,147],[163,27]],[[5708,4140],[471,-59],[21,-8],[23,-18],[9,-1],[15,0],[25,2],[9,5],[-2,3],[-2,1],[25,1],[26,-4],[84,-27],[93,-16],[241,-107],[34,-9],[34,-13],[63,-52],[68,-21],[16,-13],[16,-8],[24,6],[17,12],[18,17],[17,19],[13,19]],[[8320,5559],[-5,-5],[-7,-36],[11,-86],[-9,-35],[-96,-58],[-32,-33],[42,-20],[128,2],[61,-12],[6,-37],[-9,-8],[-11,-6],[-8,-7],[-1,-9],[11,-9],[16,-2],[11,-3],[-4,-13],[-23,-14],[-139,-15],[-37,-15],[-27,-27],[-9,-42],[42,-82],[59,-66],[75,-42],[89,-10],[168,-1],[36,-8],[16,-8],[1,-6],[-5,-7],[-3,-9],[-2,-13],[-2,-6],[2,-5],[10,-11],[10,-7],[36,-19],[16,-19],[-7,-19],[-18,-16],[-22,-11],[-156,-35],[-6,-4],[-4,-6],[4,-2],[6,-2],[3,-2],[1,-16],[3,-9],[7,-10],[-2,-2],[-1,-3],[1,-3],[2,-2],[10,-3],[1,-2],[-2,-6],[41,-13],[32,-19],[-7,-22],[-20,-25],[-8,-25],[19,-19],[36,-16],[66,-19],[143,-23],[45,-17],[26,-17],[20,-18],[23,-13],[52,-7],[30,-9],[20,-14],[-7,-20],[-16,-20],[0,-16],[11,-15],[16,-19],[22,-41],[-5,-33],[-26,-28],[-39,-30],[-166,-92],[-57,-64],[-59,-36],[-137,-28],[-48,-17]],[[8564,3862],[-1,1],[-14,4],[-48,-4],[-134,-32],[-15,-1],[-7,2],[-14,9],[-7,7],[-45,122],[-14,11],[-14,4],[-659,-31],[-331,41],[-49,-2],[-48,-10],[-1,-4],[-2,-14],[-6,-11],[-14,-16],[-75,-69]],[[5708,4140],[-63,25],[-13,18],[-9,40],[-5,122],[-12,19],[-34,2],[-20,4],[-9,2],[-6,8],[5,27],[-12,7],[-14,1],[-63,-1],[-32,3],[-24,7],[-40,19],[-12,5],[-1,22],[-7,20],[-47,35],[-88,38],[-20,11],[18,8],[6,5],[2,7],[-1,-1],[-3,0],[-1,2],[29,6],[13,4],[62,31],[24,6],[70,8],[13,5],[-3,1],[-7,1],[-3,4],[11,4],[12,2],[13,12],[10,14],[13,6],[21,3],[9,2],[13,9],[1,7],[-5,8],[3,7],[112,5],[36,7],[56,31],[16,6],[15,9],[2,8],[3,12],[-1,5],[-12,0],[-2,0],[13,19],[20,14],[58,26],[112,32],[59,0],[107,-13],[34,0],[24,5],[17,14],[-12,4],[20,9],[4,10],[-5,10],[-2,10],[6,22],[6,14],[5,8],[2,9],[-15,7],[-4,1],[-2,2],[9,9],[-11,13],[-43,26],[-47,24],[1,32],[23,19],[51,16],[366,21],[86,-16],[23,2],[18,14],[12,20],[10,24],[12,22],[34,35],[42,20],[47,9],[437,42],[55,12],[-2,16],[-5,3],[-29,3],[8,1],[13,4],[20,15],[29,25],[7,8],[-2,3],[-4,5],[-3,2],[30,11],[244,50],[153,8],[73,18],[46,46],[33,3],[64,-9],[63,-15],[61,-8],[221,5],[1,0]],[[3330,4596],[-3,-3],[-9,0],[-5,3],[5,3],[5,-1],[7,-2]],[[3435,4724],[-4,0],[-1,3],[3,3],[2,-6]],[[3456,4760],[-5,-1],[-3,7],[5,2],[5,-2],[-2,-6]],[[3431,4769],[-3,0],[5,4],[3,-3],[-5,-1]],[[3499,4785],[-2,-3],[-17,0],[2,5],[9,3],[8,-5]],[[3444,4796],[-4,-2],[-2,1],[0,3],[6,-2]],[[3715,4936],[-2,0],[2,4],[5,0],[9,7],[1,-3],[-7,-6],[-8,-2]],[[3795,5003],[-7,-4],[-18,2],[4,5],[4,5],[8,3],[7,-1],[7,-6],[-5,-4]],[[4288,5077],[6,-1],[-8,-4],[-9,4],[-9,-1],[-8,2],[-3,1],[2,2],[5,-1],[13,0],[11,-2]],[[3882,5141],[9,-6],[22,1],[27,-1],[52,-4],[37,2],[26,-13],[-31,-9],[-60,0],[-78,10],[-53,-2],[-16,-18],[-73,-20],[26,-27],[57,3],[13,-6],[-10,-5],[-10,0],[-11,0],[-12,-1],[-8,-3],[-9,-7],[-8,-3],[-16,-2],[-20,1],[-11,6],[9,14],[-4,4],[-8,9],[-13,10],[-23,-24],[-24,-4],[-32,24],[-17,17],[-8,13],[-6,13],[21,12],[62,30],[79,3],[86,11],[44,-7],[13,-14],[-22,-7]],[[4307,5162],[-7,-7],[-17,6],[-2,11],[15,2],[13,1],[4,-2],[2,-3],[-1,-3],[-7,-5]],[[4216,5163],[-4,-1],[-6,1],[-4,1],[-7,2],[-8,1],[-8,1],[-3,2],[3,5],[5,3],[15,3],[5,-1],[7,-2],[4,-7],[2,-3],[-1,-5]],[[4178,5184],[-9,-1],[-8,-2],[-9,2],[-6,0],[-4,-5],[-7,-3],[-8,-1],[4,5],[5,3],[2,3],[2,2],[5,1],[4,1],[4,1],[8,-1],[7,-2],[5,-1],[5,-2]],[[4117,5205],[-7,-1],[-1,0],[2,4],[3,5],[5,3],[5,-5],[-2,-5],[-5,-1]],[[3925,5309],[-4,0],[-6,5],[7,-1],[3,-4]],[[4196,5332],[-10,-4],[-9,2],[4,2],[2,4],[11,1],[11,-1],[-9,-4]],[[4259,5401],[1,-4],[-7,2],[-17,-6],[-5,2],[-4,2],[-4,1],[-7,1],[11,4],[13,1],[11,1],[8,-4]],[[3841,5442],[-6,-1],[-2,1],[0,2],[-3,3],[0,5],[1,3],[7,0],[20,2],[-2,-6],[-11,-6],[-4,-3]],[[3997,5490],[15,-6],[5,-2],[-3,-2],[-6,-4],[-5,-1],[-7,-4],[-5,2],[-2,5],[4,5],[-4,3],[2,2],[3,0],[1,2],[2,0]],[[4303,5489],[2,-5],[-3,-2],[-7,5],[-4,-1],[-1,4],[3,2],[4,1],[3,-2],[3,-2]],[[8151,6466],[5,-19],[16,-33],[22,-31],[52,-57],[130,-104],[75,-45],[23,-25],[19,-38],[26,-75],[8,-17],[36,-41],[11,-16],[27,-48],[33,-42],[8,-17],[25,-90],[5,-24],[-3,-21],[-14,-9],[-31,5],[-56,16],[-218,-29],[-56,-18],[27,-20],[68,-23],[29,-20],[-12,-12],[-73,-40],[-13,-14]],[[4024,3582],[-25,25],[-212,117],[-127,53],[-60,42],[-106,104],[-36,24],[-48,15],[-77,18],[-26,15],[-3,9],[-12,24],[-3,7],[-27,10],[-45,23],[-16,18],[-23,45],[-8,23],[-52,29],[-141,32],[-161,56]],[[2816,4271],[16,10],[-6,0],[2,15],[5,14],[10,7],[20,-6],[14,-1],[42,12],[14,6],[7,9],[18,30],[18,-1],[40,-11],[17,-8],[-8,11],[-7,13],[-2,13],[4,16],[11,15],[27,18],[12,14],[11,29],[8,9],[19,8],[39,8],[15,9],[-4,16],[12,-1],[10,1],[10,3],[9,8],[4,-2],[36,11],[34,0],[4,4],[0,16],[1,8],[6,6],[10,2],[26,-3],[10,4],[6,7],[5,12],[5,5],[18,7],[18,2],[17,6],[15,17],[0,7],[-5,9],[0,8],[17,7],[1,8],[-4,7],[-2,1],[7,20],[6,11],[24,22],[5,8],[4,8],[4,8],[6,3],[11,2],[27,18],[37,10],[17,8],[14,15],[-8,10],[-4,4],[0,6],[10,10],[13,6],[27,10],[-34,15],[-11,9],[17,3],[20,-1],[73,-19],[9,1],[8,5],[0,5],[-10,7],[-3,6],[7,16],[18,5],[38,1],[4,19],[34,10],[113,7],[161,42],[20,2],[16,-4],[8,-9],[8,-11],[12,-9],[7,0],[7,3],[7,1],[10,-4],[2,-4],[4,-14],[3,-5],[14,-11],[14,-7],[16,-5],[22,-1],[0,-6],[-9,0],[-7,-1],[-15,-6],[31,-6],[87,13],[7,4],[-11,18],[1,8],[14,30],[2,7],[-9,12],[-10,1],[-12,-5],[-12,-2],[-14,4],[-24,13],[-36,7],[-16,9],[-30,27],[5,3],[9,8],[5,2],[-7,6],[16,4],[92,-7],[17,-6],[32,-16],[22,-8],[20,-3],[15,4],[5,13],[-6,13],[-11,9],[-7,9],[6,16],[-7,5],[-3,4],[1,5],[2,5],[-21,13],[-11,8],[-5,9],[-1,10],[-4,8],[-6,6],[-7,6],[-29,13],[-103,13],[6,22],[7,10],[31,15],[12,8],[9,11],[3,13],[-5,15],[11,-1],[11,0],[11,3],[10,4],[-6,2],[-12,4],[-7,1],[8,15],[5,5],[-15,5],[-8,2],[-8,-1],[13,10],[12,30],[13,14],[-4,3],[-6,7],[-4,3],[9,2],[6,2],[11,9],[-63,34],[13,3],[24,0],[14,4],[8,5],[15,15],[8,6],[-10,16],[13,36],[-7,18],[-25,22],[-28,18],[-68,31],[-20,5],[-25,0],[-21,-4],[-20,2],[-21,16],[-5,8],[-3,6]],[[2165,3946],[-7,-2],[-8,3],[4,3],[7,3],[6,-4],[-2,-3]],[[2454,4056],[-7,-11],[-14,4],[4,7],[3,2],[8,-1],[6,-1]],[[2373,4042],[-12,0],[-9,5],[-6,3],[-3,9],[4,5],[5,0],[4,1],[5,-3],[3,-4],[0,-1],[3,-4],[5,-1],[6,-3],[-5,-7]],[[2651,4191],[2,-4],[5,-2],[-3,-3],[-7,-1],[-1,0],[-7,8],[4,0],[3,2],[1,1],[3,-1]],[[2673,4176],[-2,-2],[-7,5],[-5,10],[-1,4],[4,1],[7,-3],[4,-15]],[[2548,4192],[-3,0],[-6,1],[3,4],[6,-5]],[[2766,4247],[-3,-1],[-8,4],[-7,2],[-2,3],[-1,4],[12,-3],[9,-9]],[[3416,3254],[-131,31],[-38,0],[11,8],[12,7],[20,7],[-21,17],[-83,45],[-62,24],[-158,18],[-33,8],[-32,11],[-27,15],[-24,18],[-22,21],[-18,23]],[[2810,3507],[4,2],[3,-1],[3,1],[0,3],[-21,21],[-11,16],[-21,86],[-11,19],[-21,11],[-17,4],[-19,9],[-9,27],[-1,7],[-20,7],[-49,0],[-27,4],[-17,4],[16,5],[4,2],[-1,3],[-1,4],[-1,3],[-2,2],[3,3],[4,1],[12,5],[4,1],[2,3],[-2,3],[-7,11],[-2,3],[1,4],[7,3],[11,3],[3,0],[8,-15],[9,-12],[26,-5],[61,17],[97,10],[14,5],[-17,20],[-114,50],[-80,26],[-25,1],[-24,-24],[-19,2],[-29,7],[-32,5],[-37,-5],[-26,-11],[-21,-12],[-22,-9],[-44,4],[-148,61],[-13,-4],[-11,-1],[-9,1],[-8,5]],[[2163,3902],[3,12],[0,6],[-3,9],[52,25],[14,11],[11,4],[42,-7],[10,3],[9,5],[10,5],[-2,2],[-9,4],[1,6],[12,8],[11,3],[28,4],[71,-2],[28,5],[18,16],[23,-11],[20,1],[19,10],[20,14],[-28,13],[-13,8],[0,9],[7,13],[-2,9],[-5,9],[-3,9],[2,6],[11,43],[13,8],[17,0],[32,-8],[6,-2],[10,-8],[9,-2],[9,1],[9,3],[9,2],[29,-9],[60,-5],[14,11],[-12,22],[-22,23],[-15,11],[7,11],[11,1],[26,-5],[7,4],[21,16],[10,6],[4,13],[18,11],[22,11],[2,2]],[[2793,4290],[7,-7],[-7,1],[-5,0],[0,5],[5,1]],[[2695,4291],[-4,-2],[-11,4],[1,3],[9,1],[5,-6]],[[2795,4278],[-5,-3],[-9,2],[-5,7],[-4,3],[-1,4],[2,7],[6,-9],[3,-2],[5,-4],[8,-5]],[[2767,4293],[-2,-6],[-5,0],[-4,3],[-12,-6],[-21,-1],[-6,3],[2,5],[4,1],[5,-2],[8,7],[10,2],[4,2],[2,2],[4,1],[4,0],[5,-3],[2,-8]],[[2764,4310],[-4,-4],[-5,3],[-1,3],[0,3],[6,0],[4,-5]],[[2798,4322],[0,-4],[-4,2],[1,5],[3,-3]],[[2769,4330],[-6,0],[-2,2],[2,5],[6,-3],[0,-4]],[[2642,4407],[-6,0],[3,4],[3,2],[3,-1],[1,-4],[-4,-1]],[[431,2720],[0,-9],[-8,-16],[2,-5],[2,-2],[0,-4],[-2,-2],[-19,5],[-3,3],[-8,2],[-1,4],[1,11],[10,8],[-2,0],[-6,-2],[-2,2],[1,1],[16,11],[6,1],[8,-3],[5,-5]],[[414,2856],[-4,-3],[-7,0],[-8,5],[-4,9],[0,16],[2,6],[8,3],[20,-9],[6,-8],[0,-6],[-6,-8],[-7,-5]],[[526,3007],[17,-5],[3,-4],[-2,-11],[-15,-9],[-56,-6],[-4,3],[-2,1],[-4,1],[-15,-4],[-3,-1],[-10,5],[-1,4],[15,10],[24,-1],[0,1],[-4,1],[-1,5],[3,6],[8,3],[9,1],[5,-2],[2,0],[2,2],[-1,6],[3,0],[17,-5],[10,-1]],[[563,3015],[-9,-2],[-11,4],[-9,4],[-2,6],[1,5],[-28,17],[-4,6],[3,9],[7,3],[22,-6],[2,-4],[25,-24],[3,-8],[0,-10]],[[429,3057],[-1,-1],[-6,8],[9,3],[4,-8],[-6,-2]],[[309,3098],[-4,0],[-7,6],[8,0],[4,-2],[-1,-4]],[[205,3114],[4,-2],[-4,-3],[-3,-2],[-1,-3],[-5,-1],[-4,2],[0,5],[3,4],[-6,-1],[2,4],[6,3],[5,-3],[3,-3]],[[542,3114],[4,-14],[1,-9],[-5,-4],[-7,-1],[-16,7],[-8,-3],[-13,-4],[-20,7],[-10,9],[1,4],[5,1],[6,-2],[2,-2],[4,4],[4,7],[-6,4],[-12,5],[-7,8],[-2,8],[6,5],[8,4],[6,0],[3,-3],[4,-3],[23,-5],[10,-5],[11,-7],[8,-11]],[[543,3148],[3,-2],[4,2],[4,1],[3,-5],[2,-5],[4,-2],[5,-2],[5,-3],[0,-5],[-2,-4],[-6,-2],[-8,5],[-8,7],[-24,2],[-6,7],[0,8],[3,11],[1,2],[4,1],[6,-3],[3,-1],[0,-3],[7,-9]],[[175,3244],[-6,-6],[-4,5],[-7,-8],[-4,6],[3,7],[5,7],[9,2],[4,-13]],[[38,3372],[-5,-2],[4,6],[14,3],[-3,-5],[-10,-2]],[[416,3417],[38,-15],[36,1],[36,7],[41,0],[0,-6],[-15,-3],[-11,-7],[-19,-24],[3,-7],[1,-2],[-4,-4],[14,-4],[50,-2],[7,-3],[7,-3],[6,-2],[8,4],[2,7],[-3,6],[-4,5],[1,5],[23,12],[36,9],[37,0],[24,-14],[-6,-13],[-1,-12],[5,-12],[8,-10],[-22,-5],[-25,-3],[-12,4],[15,12],[-16,0],[-66,-28],[0,-6],[7,-1],[18,-5],[-15,-9],[-17,-4],[-36,-1],[-12,8],[-10,10],[-11,14],[-17,8],[-12,-3],[-13,-7],[-13,1],[-13,15],[19,0],[0,8],[-11,4],[-26,17],[-10,8],[-6,9],[-13,31],[-3,10]],[[966,3447],[5,-3],[8,-9],[0,-7],[-14,-4],[-3,-7],[0,-8],[2,-5],[0,-6],[-2,-12],[-6,-1],[-18,5],[-11,6],[-1,18],[2,4],[7,5],[-5,2],[-2,3],[7,2],[1,2],[1,1],[-3,2],[-7,2],[0,1],[7,1],[5,3],[3,3],[3,2],[11,-2],[1,3],[2,1],[7,-2]],[[1288,3450],[25,-19],[-2,-7],[-11,-12],[-15,-5],[-15,0],[-6,4],[1,6],[-3,3],[-6,-2],[-2,-4],[-1,-4],[-5,-3],[-5,0],[-5,2],[-4,7],[3,12],[11,11],[12,3],[18,-6],[7,1],[-3,5],[-13,7],[-4,4],[4,1],[6,0],[3,-2],[4,-2],[6,0]],[[995,3443],[4,-4],[15,2],[4,0],[27,-16],[3,-4],[-1,-3],[3,0],[7,1],[5,-4],[1,-5],[-10,-3],[-8,-5],[0,-4],[-34,11],[-3,4],[-11,20],[-14,8],[-7,7],[-3,6],[1,2],[2,0],[16,-7],[3,-6]],[[1476,3442],[7,-6],[-2,-5],[-9,-9],[-11,-13],[-13,-6],[-19,0],[-28,15],[-39,-4],[0,-2],[23,-3],[17,-5],[5,-11],[-6,-6],[-7,-1],[-5,-2],[0,-2],[-7,-1],[-46,11],[-6,4],[4,4],[-5,4],[-10,4],[1,5],[7,2],[7,2],[5,7],[-6,9],[-9,8],[-3,6],[9,3],[12,1],[16,6],[13,-3],[7,0],[8,-4],[7,-6],[9,-4],[5,0],[1,5],[5,2],[8,-1],[7,-3],[4,-4],[4,-1],[7,3],[5,5],[2,7],[4,8],[6,5],[4,2],[5,-1],[4,-8],[1,-5],[2,-12]],[[671,3444],[-36,-27],[-3,16],[-8,2],[-12,-4],[-14,-1],[-44,27],[4,4],[4,1],[11,1],[24,5],[31,15],[32,8],[26,-14],[0,-16],[-15,-17]],[[1321,3511],[9,-1],[9,0],[6,0],[0,-3],[-6,-3],[-9,-1],[1,-3],[4,-6],[-8,-7],[-15,-2],[-30,8],[-13,-2],[-10,-10],[-4,-5],[-12,-7],[-16,-8],[-8,-1],[-8,2],[-1,4],[1,2],[2,3],[5,6],[4,4],[5,6],[5,5],[6,4],[5,4],[2,4],[9,7],[17,1],[14,-2],[15,4],[12,1],[5,-2],[4,-2]],[[968,3523],[5,-4],[-3,-2],[3,-3],[-9,-3],[-5,-5],[-11,0],[-5,1],[4,5],[2,1],[-3,0],[-6,4],[-9,-1],[1,7],[9,-2],[17,3],[10,-1]],[[402,3556],[5,-1],[8,0],[5,-3],[9,1],[0,-4],[-7,0],[0,-1],[0,-5],[-4,-2],[-11,1],[-5,5],[1,1],[-3,1],[-1,2],[0,2],[3,3]],[[1104,3562],[-3,-3],[-26,1],[-4,2],[4,2],[4,1],[0,2],[-2,4],[-2,4],[-4,2],[-7,1],[-1,2],[4,3],[3,3],[4,3],[6,-1],[4,-1],[2,-2],[8,-5],[7,-5],[3,-3],[1,-5],[-1,-5]],[[1671,3690],[-3,-1],[-5,0],[-3,-2],[2,-4],[4,-3],[2,-5],[2,-5],[2,-6],[-5,-2],[-7,8],[-3,8],[-10,11],[-2,5],[-1,4],[6,3],[21,-9],[0,-2]],[[1623,3714],[-7,-4],[-7,0],[-1,8],[-13,2],[-7,3],[-2,5],[0,7],[3,7],[10,1],[13,-7],[14,-12],[-1,-5],[-2,-5]],[[2004,3831],[-5,0],[-10,2],[-5,5],[2,4],[13,4],[8,0],[7,-4],[1,-6],[-9,-4],[-2,-1]],[[1845,3890],[8,-6],[-3,-2],[-19,3],[-6,-7],[-5,-8],[-11,-2],[-13,7],[0,8],[5,4],[1,3],[10,3],[18,1],[15,-4]],[[1778,3878],[-14,-14],[-5,2],[3,5],[1,7],[6,3],[-1,4],[-4,4],[0,8],[11,-9],[2,-1],[-1,-1],[1,-5],[1,-3]],[[1984,3892],[5,-1],[4,2],[3,1],[14,0],[5,-3],[-3,-4],[-4,-1],[-1,-2],[-1,-6],[-4,-6],[-3,-3],[-2,-7],[-7,-8],[-8,2],[-10,4],[-4,-3],[3,-7],[-4,-6],[-11,-1],[-7,-4],[-16,-2],[-18,6],[-15,9],[-10,14],[-5,4],[-3,4],[-2,4],[20,6],[8,4],[7,5],[16,7],[24,5],[17,-1],[7,-6],[5,-6]],[[2810,3507],[-43,15],[-36,18],[-18,12],[-27,27],[-13,10],[-40,13],[-51,8],[-51,3],[-40,-2],[-48,-13],[-32,-21],[-58,-59],[-38,-24],[-36,-6],[-97,10],[-21,-1],[-13,-12],[1,-14],[-18,-4],[-25,6],[-57,8],[-91,4],[-28,-2],[13,-11],[-79,-23],[-9,-5],[15,-15],[4,-3],[-11,-4],[-48,-8],[-29,-13],[-9,-10],[1,-13],[21,-5],[5,0],[0,-8],[-13,-10],[-8,-9],[-1,-2],[10,2],[10,1],[2,-4],[-12,-23],[-3,-4],[7,0],[11,2],[58,3],[11,-17],[-1,-26],[-1,-7],[-11,-4],[-14,-3],[-6,-8],[5,-5],[0,-11],[-13,-23],[-13,-6],[-20,4],[-11,-1],[-31,-7],[-9,-9],[3,-5],[10,-6],[-20,-2],[-17,-8],[-14,-12],[-64,-69],[-5,-17],[-2,-9],[-16,-27],[1,-25],[-9,-18],[-16,-7],[-81,-55],[-37,-19],[-30,-9],[-33,-3],[-171,20],[-69,16],[-39,14],[-75,42],[-21,-5],[-7,-10],[-13,-14],[-11,-18],[-6,-33],[1,-14],[10,-24],[7,-9],[20,-15],[10,-6],[-9,-20],[-68,-41],[-50,-23],[-46,-16],[2,-15],[3,-19],[4,-6],[13,0],[-2,-15],[-7,-15],[-17,-31],[-29,-40],[-6,-18],[3,-8],[1,-17],[-6,-15],[-6,-6],[-6,-10],[3,-5],[7,-1],[10,-1],[4,-2],[-1,-12],[0,-2],[71,10],[33,-6],[12,-7],[3,-13],[-19,-4],[2,-9],[6,-8],[5,-16],[1,-19],[-2,-11],[13,-12],[15,-2],[24,-5],[18,-11],[8,-8],[-4,-11],[-39,-5],[-26,-7],[-14,-11],[2,-14],[12,-9],[9,-12],[-2,-12],[-42,-5],[-11,-31],[-4,-57],[-3,-13],[3,-2],[4,-5],[2,-5],[4,-5]],[[935,2188],[-107,5],[-49,-3],[-46,-13],[-19,-13],[-17,-17],[-19,-15],[-26,-9],[-18,-14]],[[634,2109],[-4,1],[-21,9],[-11,2],[16,19],[-14,8],[-40,6],[37,63],[7,24],[4,45],[7,9],[14,-21],[16,28],[3,14],[-6,11],[13,12],[28,10],[12,8],[5,13],[-8,9],[-25,14],[19,34],[-20,-1],[-11,-10],[-10,-14],[-16,-9],[4,16],[11,28],[4,16],[1,45],[5,15],[-49,-10],[-14,4],[-7,10],[-2,12],[5,13],[11,11],[-7,14],[-59,-50],[-3,-10],[13,-14],[-20,2],[-4,15],[4,20],[7,17],[-5,1],[-9,4],[-5,1],[7,11],[5,5],[7,4],[-15,6],[-17,-2],[-18,-7],[-13,-10],[-2,12],[16,30],[5,17],[-16,-7],[-11,-3],[-7,5],[-4,18],[3,17],[8,14],[12,10],[15,7],[-5,8],[-20,18],[18,8],[19,13],[19,8],[19,-2],[-14,18],[-66,8],[-14,13],[-11,-3],[-10,-7],[-16,-16],[2,24],[14,38],[-4,18],[19,3],[24,9],[22,13],[10,15],[0,10],[-5,2],[-6,-1],[-8,2],[-16,10],[-5,6],[-8,17],[5,14],[14,9],[20,4],[18,-10],[12,-2],[5,8],[3,2],[16,14],[6,7],[5,16],[1,14],[3,13],[16,10],[22,0],[62,-13],[19,4],[7,5],[17,9],[7,6],[5,7],[3,13],[9,12],[10,21],[2,7],[5,2],[32,7],[-15,34],[-3,18],[0,21],[-1,7],[-1,4],[3,3],[11,6],[10,0],[7,-4],[5,0],[2,14],[12,14],[25,-8],[39,-23],[27,-5],[28,-11],[28,-6],[29,9],[-39,28],[-61,27],[-18,11],[-5,13],[17,15],[-11,-4],[-13,-2],[-13,2],[-10,7],[-4,10],[1,10],[-1,8],[-12,2],[7,10],[10,4],[27,-1],[0,6],[-35,7],[-11,8],[-4,16],[7,8],[18,8],[19,5],[12,2],[52,-28],[29,-6],[19,21],[19,-9],[24,-8],[25,-2],[20,6],[-14,4],[-28,5],[-14,4],[0,6],[38,13],[13,2],[36,-2],[21,4],[45,16],[22,1],[-9,-15],[-2,-9],[9,-38],[-2,-9],[-8,-10],[22,-2],[72,-31],[-11,21],[-15,19],[26,6],[10,5],[9,10],[5,9],[2,8],[3,8],[8,7],[17,6],[10,-4],[7,-9],[9,-6],[15,0],[24,10],[12,3],[11,-1],[18,-6],[15,1],[4,2],[1,5],[0,4],[1,2],[5,0],[7,-2],[6,-3],[1,-2],[38,27],[20,18],[11,15],[6,0],[21,-25],[20,8],[20,21],[20,16],[-9,5],[-6,7],[-9,15],[-12,10],[-26,12],[-46,33],[-4,5],[-17,0],[-13,3],[-11,6],[-10,10],[-4,27],[21,12],[30,-2],[26,-13],[27,-19],[28,-6],[29,-2],[32,-10],[-77,42],[-35,26],[-8,25],[10,12],[10,4],[24,-3],[17,-4],[0,-9],[-6,-11],[2,-9],[20,-5],[23,-2],[15,-9],[-2,-23],[12,4],[15,11],[11,4],[0,7],[-7,9],[3,8],[6,9],[4,11],[3,0],[16,36],[8,7],[11,5],[8,6],[4,12],[6,1],[38,-11],[-7,12],[-37,34],[16,13],[7,4],[9,4],[-3,6],[-1,3],[-3,4],[39,-5],[17,4],[7,17],[-2,19],[-2,9],[4,1],[18,-5],[13,-11],[9,-5],[3,6],[4,9],[8,5],[10,1],[10,-2],[14,-8],[10,-10],[5,-12],[-4,-13],[9,-8],[19,-21],[6,-5],[14,1],[16,3],[16,6],[11,7],[7,3],[9,1],[8,2],[4,7],[0,8],[0,5],[2,5],[4,5],[14,9],[29,8],[13,10],[-15,7],[-47,13],[62,0],[-18,16],[-6,4],[23,-6],[13,-1],[10,4],[3,5],[1,8],[-1,7],[-3,3],[-16,5],[-8,11],[3,11],[18,6],[19,-1],[11,-7],[17,-21],[15,-10],[10,2],[1,10],[-10,14]],[[1839,3917],[-15,-2],[-4,0],[-3,0],[0,-4],[0,-6],[-4,-2],[-7,7],[-8,14],[3,2],[4,1],[3,3],[19,-7],[7,0],[5,-3],[0,-3]],[[1857,3925],[-6,-2],[-7,0],[-3,5],[1,5],[-1,6],[0,4],[6,2],[7,-4],[4,-8],[1,-5],[-2,-3]],[[2016,3980],[8,-7],[-13,1],[-4,7],[9,-1]],[[1969,3971],[-5,-1],[-8,2],[-6,3],[-2,3],[-1,8],[9,1],[9,-2],[4,-4],[1,-6],[-1,-4]],[[2007,4023],[-14,-1],[-8,3],[3,6],[12,1],[6,-4],[1,-5]],[[1971,4025],[-3,-2],[-27,5],[0,3],[13,4],[12,0],[4,-3],[1,-3],[0,-4]],[[3103,2521],[-65,26],[-25,16],[-16,31],[1,9],[4,10],[0,10],[-9,11],[-14,2],[-13,-6],[-13,-9],[-8,-5],[-7,1],[2,23],[-7,1],[-8,-2],[-7,-4],[-2,-6],[2,-5],[-14,-7],[-17,-3],[-27,-9],[-51,-23],[-37,-9],[-118,-4],[-21,-4],[3,-5],[2,-10],[3,-18],[-9,-2],[-10,3],[-67,3],[-17,7],[-29,23],[-12,7],[-37,2],[-25,-12],[-41,-44],[-71,-42],[-96,-28],[-106,-14],[-98,-4]],[[2023,2431],[-122,13],[-78,19],[-29,-2],[-14,-30],[-12,-19],[-12,-15],[-34,-24],[-96,-50],[-17,-12],[-42,-22],[-100,-22],[-47,-18],[-104,-71],[-42,-16],[-78,-8],[-261,34]],[[5203,1788],[2,-11],[-2,-15],[1,-5],[-3,-3],[-32,4],[-1,-4],[3,-6],[5,-11],[2,-13],[0,-9],[-1,-8],[-3,0],[-9,-3],[-11,-8],[-5,-11],[4,-3],[12,-10],[3,-4],[3,-6],[-5,-9],[-17,-22],[-3,-7],[8,-13],[17,-11],[28,-11],[4,-5],[-5,-4],[-8,-7],[-10,-15],[9,-5],[13,-3],[49,-27],[29,-10],[69,-12],[18,-12],[15,-25]],[[5382,1464],[-45,-7],[-21,-7],[-9,-5],[-14,-34],[-20,-19],[-87,-43],[-94,-22],[-28,3],[-34,15],[-40,-13],[-23,-16],[-8,-13],[6,-17],[9,-2],[14,-6],[12,-6],[11,-9],[6,-9],[3,-10],[5,-10],[6,-5],[5,-6],[-16,-31],[-7,-7],[-14,-4],[-36,3],[-9,-1],[-3,-28],[31,-16],[63,-8],[12,-10],[-7,-8],[-15,-13],[-10,-13],[-1,-8],[-4,-9],[-6,0],[-14,-5],[-10,-10],[-2,-13],[9,-8],[56,-4],[23,-10],[15,-16],[10,-20],[7,-23]],[[5108,961],[3,-7],[0,-6],[2,-6],[4,-2],[-10,-17],[-17,-12],[-20,-6],[-43,-3],[-85,11],[-52,0],[-26,3],[-13,6],[-9,8],[-12,7],[-21,4],[-253,-45],[-36,1],[-44,15],[-2,26],[-10,26],[-16,21],[-17,12],[-29,0],[-62,-28],[-41,-6],[-23,5],[-23,11],[-48,32],[-10,9],[-5,9],[-3,2],[-12,3],[-77,-10]],[[4098,1024],[-6,1],[-6,1],[-3,-1],[-6,8],[-2,8],[4,10],[8,7],[40,52],[21,21],[24,18],[27,14],[16,5],[15,8],[1,5],[-5,7],[-5,4],[-16,9],[-13,5],[-3,3],[12,2],[8,1],[5,0],[14,14],[32,46],[1,26],[-20,11],[-23,6],[0,8],[-1,5],[-1,5],[4,9],[6,5],[6,10],[3,10],[1,7],[-8,11],[-26,13],[-13,13],[-3,9],[-16,11],[-102,13],[-40,1],[-11,8],[-4,12],[-12,7],[-12,-3],[-18,3],[-19,5],[-13,1],[-13,3],[-3,19],[0,11]],[[3923,1511],[-15,17],[-2,21],[3,23],[1,23],[-7,12],[-14,14],[-14,18],[-5,11],[9,8],[81,-17]],[[4098,1024],[6,-14],[11,-10],[20,-10],[6,-7],[0,-6],[-16,-5],[-15,-2],[-24,-8],[-19,-12],[-9,-10],[-5,-12],[3,-4],[33,14],[22,3],[45,-7],[9,-4],[-72,-18],[-10,-6],[11,-26],[2,-5],[-11,-3],[-61,15],[-31,1],[-28,-3],[-48,-11],[-147,-11],[-126,6],[-19,-5],[-16,-18],[-6,-18],[2,-28],[-3,-10],[-38,-20],[-57,-5],[-44,10],[-8,13],[-8,19],[-14,3],[-37,2],[-29,-7],[-5,-12],[0,-13],[-18,-3],[-29,31],[-16,10],[-38,12],[-224,32],[-47,-4]],[[2990,858],[-119,3],[-56,9],[-48,27],[-74,8],[-40,15],[-14,13],[-32,20],[-24,-2],[-86,-17],[-45,-4],[-37,5],[-32,11],[-51,23],[-12,16],[6,8],[14,14],[17,11],[11,6],[-3,9],[-42,5],[-22,11],[-4,24],[18,19],[32,5],[53,-4],[15,2],[-2,3],[-6,14],[-2,4],[8,1],[9,0],[13,6],[6,14],[0,10],[-14,11],[-14,3],[-23,11],[-39,26]],[[2351,1198],[72,19],[60,-12],[87,-36],[30,-5],[-9,15],[-2,2],[15,4],[102,0],[71,18],[40,2],[14,-4],[52,-9],[51,-42],[16,-4],[12,13],[-4,8],[-9,12],[-14,10],[-8,4],[-2,5],[25,9],[17,8],[6,10],[-11,8],[-11,0],[-45,-9],[-7,2],[1,3],[4,13],[2,3],[-4,4],[-30,5],[10,11],[18,7],[123,17],[92,27],[51,8],[47,-4],[-3,11],[-1,2],[46,8],[38,11],[49,25],[11,11],[-6,2],[-12,7],[-8,11],[2,15],[11,5],[59,1],[33,6],[125,45],[31,6],[30,-2],[65,-15],[30,-4],[24,9],[9,14],[11,12],[6,-6],[20,-27],[13,-8],[23,-1],[71,16],[9,8],[-1,6],[3,10],[9,7],[13,6]],[[2351,1198],[-25,8],[-19,13],[-24,10],[-39,3],[-42,-5],[-24,0],[-11,3],[-23,13]],[[2144,1243],[-3,11],[7,7],[14,5],[9,1],[1,8],[-10,3],[-45,-4],[-11,1],[-5,9],[6,5],[14,9],[22,11],[-5,6],[-11,4],[-17,11],[-10,17],[-3,12],[2,11],[26,0],[-6,19],[-17,14],[-52,19],[-111,13],[-60,-2],[-17,3],[-11,7],[-4,8],[-2,8],[-6,8],[-51,39],[-7,7],[-3,9],[19,6],[-1,7],[-4,6],[-18,34],[6,7],[27,-2],[24,-6],[11,3],[4,6],[5,5],[8,2],[8,2],[6,4],[-2,8],[-1,2],[-1,2],[5,4],[46,5],[3,5],[-4,5],[-3,10],[1,11],[3,7],[-22,8],[-25,5],[-30,15],[-37,32],[1,19],[56,30],[22,24],[-5,16],[4,6],[17,1],[16,16],[-4,19],[-12,7],[-18,-8],[-7,-8],[-10,-3],[-8,10],[-3,9],[2,10],[4,3],[15,18],[16,24],[19,14],[20,8],[33,11],[29,15],[15,16],[1,24],[-29,18],[-20,8],[-24,5],[1,5],[5,4],[32,4],[0,8],[-27,8],[-11,10],[-3,9],[-15,11],[-13,2],[-25,7],[-17,13],[-5,12],[-16,17],[-82,23],[-1,11],[41,25],[30,12],[34,9],[60,1],[20,6],[20,10],[3,4],[-3,7],[1,17],[-1,13],[-5,12],[-3,13],[4,15],[17,8],[36,0],[21,2],[5,11],[-14,68],[-2,27]],[[6116,506],[-8,-8],[-11,5],[3,5],[10,0],[6,-2]],[[5626,565],[-2,-4],[-6,2],[-10,6],[-17,13],[16,8],[13,-7],[8,-3],[3,-7],[0,-2],[-1,-4],[-4,-2]],[[5888,596],[-4,-3],[-11,1],[-11,4],[-13,15],[-5,10],[1,3],[5,3],[33,-8],[9,-3],[-4,-22]],[[5413,596],[-10,-1],[-11,7],[-17,18],[6,8],[43,5],[12,5],[6,5],[0,7],[4,7],[8,4],[7,1],[39,-14],[8,-5],[-3,-5],[-12,-7],[-58,-9],[-13,-8],[-9,-18]],[[6020,1355],[1,-16],[-6,-12],[-19,-18],[2,-8],[8,0],[12,-1],[6,-2],[10,-6],[-9,-6],[-15,-4],[-31,-13],[-17,-19],[3,-14],[7,-11],[-15,-13],[4,-5],[7,-2],[31,-3],[13,-4],[10,-8],[6,-8],[9,-7],[9,-4],[-2,-9],[-15,-5],[-28,-3],[-29,4],[-13,4],[-14,2],[-1,-6],[12,-11],[62,-36],[32,-11],[114,-25],[30,-14],[44,-34],[26,-16],[28,-9],[162,1],[27,-20],[11,-12],[34,-5],[41,3],[37,-7],[9,-9],[14,-27],[9,-10],[15,-9],[46,-17],[6,-6],[-4,-2],[-2,-2],[-2,-2],[3,-1],[21,-2],[9,0],[13,-2],[1,0]],[[6742,873],[-21,-14],[-80,-44],[-78,-50],[-15,9],[-13,11],[-14,6],[-21,-5],[4,-4],[6,-7],[3,-3],[-16,-4],[-2,-11],[6,-14],[12,-11],[-14,-5],[-5,-2],[13,-5],[6,-1],[-32,-17],[-12,-2],[-63,6],[9,11],[28,7],[14,8],[-37,4],[-18,-1],[-14,-10],[-7,-11],[2,-8],[8,-8],[9,-12],[-34,6],[-77,35],[-32,-8],[8,-1],[4,-2],[6,-10],[-5,-3],[-8,-7],[-5,-4],[10,-3],[8,-4],[7,-6],[6,-7],[-46,6],[-80,34],[-40,7],[-70,2],[-15,4],[-1,14],[23,3],[47,-3],[-21,10],[-66,23],[14,19],[-12,5],[-21,-5],[-13,-12],[6,-15],[12,-14],[3,-14],[-21,-11],[-1,13],[-6,3],[-18,-2],[-11,3],[-13,14],[-10,3],[-7,-3],[-9,-14],[-6,-3],[-9,2],[-15,14],[-7,4],[-9,-1],[-11,-4],[-8,-5],[0,-7],[3,-9],[-6,-5],[-8,-5],[-13,-21],[-19,-4],[-42,2],[22,-16],[9,-11],[-2,-11],[-8,3],[-27,17],[-9,7],[-84,-16],[-27,-1],[7,6],[5,7],[8,15],[-16,0],[-19,-3],[-18,-6],[-13,-8],[-3,-7],[1,-17],[-1,-6],[-7,-4],[-19,-7],[-9,-6],[-13,-2],[-16,10],[-17,13],[-14,9],[-17,2],[-21,-1],[-15,-4],[-3,-10],[-19,-4],[-24,6],[-23,13],[-18,15],[-7,18],[15,11],[24,7],[18,10],[24,27],[4,6],[-3,22],[3,8],[11,10],[41,18],[38,-3],[79,-31],[-19,37],[-30,27],[-36,11],[-40,-9],[-22,-14],[-35,-35]],[[5417,803],[-9,3],[-39,4],[-24,15],[-22,19],[-31,16],[-62,20],[-18,16],[0,13],[-1,15],[-7,5],[-17,21],[-12,8],[-16,3],[-32,-3],[-19,3]],[[5382,1464],[88,13],[21,-4],[10,-9],[7,-10],[7,-6],[5,-9],[-19,-22],[-5,-4],[8,-9],[14,-2],[32,4],[31,11],[26,13],[8,8],[14,18],[10,8],[18,5],[20,4],[31,0],[11,-11],[3,-11],[9,-11],[11,-8],[8,-14],[4,-16],[0,-6],[3,-13],[3,-5],[13,-13],[53,-20],[194,10]],[[8698,2023],[-153,-118],[-124,-66],[-18,-15],[-22,-34],[-17,-16],[-132,-80],[-28,-11],[-59,-14],[-21,-10],[-16,-15],[-17,-24],[-16,-20],[-132,-73],[-27,-22],[-11,-11],[-14,-14],[-54,-43],[-66,-32],[-137,-43],[-49,-20],[-65,-34],[-53,-16],[-15,-9],[-28,-25],[-56,-33],[-17,-14],[-15,-20],[0,-1],[-36,-28],[-81,-12],[-41,-16],[-133,-72],[-84,-66],[-87,-32],[-132,-91]],[[6020,1355],[107,7],[16,3],[17,9],[0,5],[1,6],[6,4],[8,3],[6,4],[-1,2],[-2,4],[-1,3],[-22,0],[-23,5],[-10,11],[7,7],[-2,16],[-49,35],[-33,15],[-14,11],[16,3],[12,5],[-14,5],[-89,-1],[-153,15],[-7,15],[15,10],[31,5],[67,-3],[19,1],[82,26],[44,4],[48,-3],[216,-39],[586,13],[146,43],[51,28],[11,11],[6,9],[4,8],[4,5],[21,16],[20,11],[23,3],[14,-4],[26,-26],[23,-8],[82,-3],[89,12],[54,15],[7,11],[-2,21],[5,7],[16,1],[50,-5],[147,1],[125,13],[51,11],[23,12],[63,48],[115,36],[60,26],[29,38]],[[8167,1901],[451,121],[78,2],[2,-1]],[[7340,2802],[138,-22],[16,-6],[79,-39],[17,-5],[21,-13],[8,-7],[23,-14],[38,-14],[8,-6],[-23,-9],[9,-5],[76,-18],[6,-7],[-6,-7],[-10,-14],[-7,-17],[-4,-10],[0,-12],[2,-2],[6,-1],[10,-2],[3,-2],[-5,-15],[0,-2],[9,-5],[29,-6],[14,0],[3,4],[19,20],[24,7],[37,-8],[29,-25],[29,-50],[24,-32],[15,-15],[34,-27],[18,-10],[7,-24],[-5,-20],[6,-38],[18,-35],[16,-25],[32,-36],[47,-35],[54,-28],[27,-9],[20,-14],[-20,-20],[-11,-17],[-5,-11],[7,-17],[57,-30],[6,-8],[-18,-16],[15,-7],[4,-18],[-37,-40],[-82,-57]],[[8564,3862],[-16,-5],[18,-25],[221,-130],[126,-48],[56,-39],[17,-18],[26,-11],[303,-84],[141,-84],[185,-62],[24,-12],[20,-16],[7,-20],[1,-18],[6,-20],[9,-20],[11,-15],[23,-15],[58,-22],[26,-14],[59,-44],[21,-10],[12,-5],[22,-18],[13,-24],[15,-23],[31,-13],[-81,-78],[-36,-36],[-28,-41],[-43,-92],[-15,-21],[-41,-33],[-17,-22],[-22,-47],[-15,-21],[-19,-11],[-1,0],[-48,-15],[-15,-9],[-10,-10],[-17,-21],[-130,-74],[-12,-10],[-23,-33],[-15,-12],[-17,-9],[-104,-38],[-82,-42],[-35,-10],[-16,-7],[-12,-8],[-25,-32],[-116,-81],[-128,-74],[-178,-137]],[[685,21],[5,-3],[4,0],[3,0],[-4,-7],[-9,-1],[-5,5],[-1,5],[7,1]],[[1567,42],[-5,-3],[-8,1],[-3,-1],[-1,-3],[-6,2],[-1,6],[3,4],[2,12],[2,2],[5,-9],[8,-6],[3,-2],[1,-3]],[[929,66],[-10,-5],[-11,-2],[-9,0],[-28,-9],[-2,1],[-2,1],[-4,1],[2,1],[23,12],[23,-1],[19,4],[-1,-3]],[[1619,92],[4,-3],[4,0],[1,-2],[-4,-11],[-3,0],[-20,5],[-1,3],[8,3],[5,5],[6,0]],[[1337,90],[-17,-1],[-1,1],[3,3],[5,1],[9,3],[10,-1],[-5,-4],[-4,-2]],[[1223,101],[-3,-9],[-8,3],[0,4],[11,2]],[[1445,101],[-18,-3],[-9,2],[-2,3],[9,6],[9,1],[11,-4],[0,-5]],[[1663,85],[-15,-2],[-10,3],[-2,8],[7,5],[5,0],[6,1],[21,6],[21,1],[8,2],[9,1],[11,-1],[2,-3],[-7,-5],[-56,-16]],[[1720,117],[-26,-9],[-3,3],[-1,4],[3,5],[43,11],[7,-2],[-3,-5],[-5,-5],[-6,-2],[-9,0]],[[1761,133],[-5,-5],[-4,5],[1,7],[13,-2],[0,-2],[-5,-3]],[[771,143],[-5,-9],[-2,4],[-4,5],[11,0]],[[1600,144],[-16,-7],[-6,4],[7,7],[11,7],[7,2],[7,-4],[-1,-2],[-9,-7]],[[1068,145],[-4,-1],[-5,3],[-3,4],[2,2],[-1,4],[1,4],[11,-1],[6,-6],[-3,-5],[-4,-4]],[[1694,154],[0,-5],[-2,0],[-14,7],[-1,6],[2,3],[2,7],[5,1],[3,-5],[-1,-4],[4,-5],[2,-5]],[[1784,178],[-18,-3],[10,8],[8,1],[10,2],[-10,-8]],[[906,186],[7,-3],[5,-4],[-12,1],[-10,-1],[-6,6],[3,-1],[1,1],[4,4],[7,-3],[1,0]],[[1846,170],[-1,-3],[-14,3],[-35,19],[9,3],[15,1],[9,-3],[4,-2],[0,-3],[8,-1],[8,-1],[5,-2],[-2,-2],[-7,-1],[-3,-2],[4,-6]],[[1591,176],[-19,-12],[-4,1],[-6,8],[-3,6],[4,11],[3,2],[12,1],[17,-3],[2,-6],[-1,-5],[-5,-3]],[[1045,174],[-9,-1],[-7,2],[3,4],[7,3],[0,3],[-3,0],[-2,4],[1,5],[4,1],[18,-1],[7,-6],[-5,-6],[-14,-8]],[[614,204],[-1,-3],[-5,6],[8,1],[3,-4],[-5,0]],[[1757,196],[-35,-7],[-4,4],[-1,6],[2,9],[11,7],[24,-1],[9,-4],[3,-7],[-3,-4],[-6,-3]],[[1673,206],[2,0],[4,0],[4,0],[2,-3],[0,-4],[-1,-5],[-3,-2],[-4,3],[-5,1],[-9,0],[-4,-4],[-4,-1],[-1,5],[-1,-1],[-1,-6],[-5,-12],[0,-8],[-3,-10],[-7,-4],[-5,-2],[-7,5],[-6,9],[-2,12],[8,8],[2,2],[12,4],[-3,1],[-2,3],[1,4],[6,5],[6,0],[3,-2],[4,3],[3,7],[8,2],[5,-5],[0,-4],[3,-1]],[[1848,192],[-10,-1],[-21,7],[-1,1],[-4,2],[-2,2],[2,6],[7,10],[6,1],[8,-6],[18,-18],[-3,-4]],[[1585,197],[-10,-2],[-8,6],[2,6],[4,5],[2,5],[13,10],[6,0],[4,-4],[-4,-8],[-8,-13],[-1,-5]],[[775,254],[-7,-2],[-5,1],[3,10],[9,-2],[0,-7]],[[2111,241],[-5,-7],[-4,-1],[-3,3],[-4,2],[-7,0],[-4,4],[2,5],[7,2],[4,2],[-1,2],[0,5],[4,7],[9,7],[13,6],[9,-1],[6,-4],[10,-9],[-2,-3],[-9,-6],[-4,-5],[-6,-3],[-8,-1],[-7,-5]],[[2003,266],[-5,-6],[-6,3],[-3,10],[1,6],[6,0],[6,-4],[1,-9]],[[2062,240],[-8,-5],[-11,5],[-8,16],[4,13],[26,2],[0,4],[-8,4],[-12,0],[-6,4],[7,6],[22,6],[28,0],[8,-3],[-6,-7],[-3,-8],[-5,-8],[-4,-3],[-6,-1],[-6,-4],[-9,-13],[-3,-8]],[[688,299],[-6,-3],[-5,1],[0,3],[-7,1],[-3,2],[10,3],[11,-7]],[[1668,293],[0,-36],[-1,-16],[-5,-15],[-6,0],[-10,9],[-14,3],[-14,-4],[-6,-11],[-5,-1],[-10,11],[-11,16],[-6,11],[-3,15],[-1,15],[6,12],[14,5],[11,-6],[1,-12],[3,-10],[20,1],[-6,22],[9,9],[17,-3],[17,-15]],[[2137,323],[-5,-8],[-9,-4],[-10,-1],[-4,2],[1,4],[-5,0],[-11,-5],[-15,-4],[-26,1],[-8,-1],[-15,2],[0,3],[10,6],[7,9],[8,8],[6,4],[11,5],[23,6],[19,-1],[12,-5],[6,-8],[4,-6],[1,-7]],[[1246,337],[-14,0],[-26,2],[-4,3],[-8,8],[5,6],[13,4],[11,3],[14,-7],[13,-1],[7,-2],[12,-5],[-5,-7],[-18,-4]],[[415,357],[-6,0],[-1,2],[4,0],[-5,5],[4,6],[7,2],[4,-5],[-1,-6],[-6,-4]],[[1378,366],[-10,-3],[-10,1],[-3,4],[5,10],[12,5],[8,-3],[0,-8],[-2,-6]],[[1173,379],[5,-5],[-5,-2],[-5,1],[-4,2],[-4,-1],[-5,-1],[0,-2],[11,-1],[-1,-5],[-11,-5],[-43,0],[-6,4],[1,3],[8,8],[24,3],[7,5],[6,1],[22,-5]],[[1499,357],[-10,-2],[-3,8],[-1,4],[2,7],[5,6],[9,3],[15,3],[0,-3],[-1,-13],[-4,-6],[-12,-7]],[[625,376],[-10,-3],[-2,4],[2,4],[1,6],[3,5],[5,1],[7,-3],[2,-7],[-8,-7]],[[926,363],[-22,-9],[16,-1],[6,-4],[-2,-8],[-8,-8],[-12,-5],[-12,0],[-25,5],[-10,-1],[-25,-5],[-9,-3],[-9,-1],[-9,6],[-10,7],[-10,4],[15,6],[18,2],[36,-1],[-8,11],[-15,4],[-33,-2],[30,23],[38,11],[40,-1],[36,-13],[-6,-11],[-10,-6]],[[1484,392],[-37,-5],[-6,1],[-5,6],[2,4],[7,4],[4,0],[48,-4],[-13,-6]],[[1385,404],[-38,-12],[-5,2],[8,6],[12,4],[4,2],[0,4],[3,3],[7,3],[9,2],[6,-2],[-6,-12]],[[1155,407],[0,-7],[-10,0],[-10,0],[-9,-2],[-9,-4],[6,-3],[14,-11],[-70,0],[32,-6],[-8,-4],[-9,-3],[-10,-1],[4,-2],[4,-4],[-20,-12],[-29,-8],[-29,-1],[-22,8],[8,5],[2,2],[-4,13],[13,6],[5,1],[0,6],[-16,5],[3,10],[14,12],[19,7],[51,5],[49,1],[31,-13]],[[947,409],[-29,0],[-16,6],[-7,4],[-1,5],[35,0],[10,-3],[9,-6],[2,-3],[-1,-2],[-2,-1]],[[1553,371],[-22,0],[-10,3],[4,2],[0,4],[-2,8],[3,6],[4,2],[1,3],[0,6],[5,7],[8,3],[56,12],[10,-9],[-16,-17],[-22,-8],[-22,-5],[-1,-4],[13,-6],[3,-5],[-12,-2]],[[704,414],[50,0],[0,-7],[-36,1],[-14,-6],[-6,-15],[-6,0],[-8,7],[-14,4],[-28,2],[-14,3],[-9,6],[-10,5],[-18,0],[14,12],[19,6],[43,1],[14,-14],[23,-5]],[[1266,362],[-29,-2],[-24,13],[-14,27],[13,5],[43,9],[27,14],[14,6],[16,-1],[11,-13],[-55,-26],[6,-3],[12,-8],[6,-3],[-26,-18]],[[1595,444],[-5,-2],[-3,0],[-5,1],[-5,-3],[-2,-2],[-3,-4],[-7,-3],[-10,-3],[-13,2],[-3,7],[24,13],[27,1],[6,-2],[-1,-5]],[[1333,459],[-15,-9],[-6,2],[-13,12],[0,3],[19,7],[9,-1],[8,-3],[4,-5],[0,-3],[-6,-3]],[[1504,419],[-34,-11],[-21,19],[12,19],[21,19],[24,9],[18,-7],[5,-24],[-25,-24]],[[1061,474],[-29,-8],[-1,3],[-1,4],[4,5],[9,3],[10,1],[9,-3],[-1,-5]],[[996,479],[-9,-4],[-12,1],[5,7],[19,1],[-3,-5]],[[890,478],[3,-2],[14,0],[10,-2],[-5,-9],[-10,-8],[-4,-7],[-4,-5],[-9,-1],[-4,1],[-9,-1],[-13,4],[-1,13],[8,16],[14,13],[17,-1],[1,-7],[-8,-4]],[[734,491],[-37,-2],[-4,3],[-1,4],[-1,4],[4,4],[29,2],[3,3],[10,1],[13,-1],[2,-5],[-2,-9],[-16,-4]],[[2019,416],[0,-11],[6,-11],[-6,-1],[-4,-2],[-4,-3],[-5,-1],[5,-2],[14,-5],[-4,-10],[-2,-3],[12,-31],[-31,-28],[-75,-34],[0,-7],[8,1],[6,-2],[11,-6],[-9,-6],[-12,-17],[-5,-3],[-22,1],[-10,-1],[-11,-8],[-12,19],[-13,15],[-8,-10],[-30,-20],[-5,-1],[-2,-4],[1,-11],[-6,0],[1,13],[-2,10],[-7,2],[-11,-5],[-4,11],[5,8],[8,8],[4,13],[-11,-8],[-32,-17],[-15,-12],[-40,-6],[-15,-5],[0,26],[2,11],[5,11],[-6,12],[2,12],[3,11],[-3,8],[-11,6],[-24,8],[-12,9],[19,4],[35,13],[18,3],[91,0],[0,7],[-169,7],[10,21],[7,27],[13,21],[27,4],[-20,-24],[-4,-11],[14,-5],[91,9],[33,13],[17,4],[177,16],[26,14],[20,23],[24,20],[27,11],[32,-4],[-6,-22],[-17,-13],[-22,-9],[-20,-12],[-7,-9],[-4,-10],[-5,-8],[-25,-6],[-6,-8]],[[1242,505],[-5,0],[-4,1],[6,3],[15,7],[11,1],[-2,-5],[-9,-5],[-12,-2]],[[958,504],[-26,-1],[-10,2],[-2,2],[8,9],[5,2],[14,-2],[13,-7],[-2,-5]],[[1122,505],[-7,-1],[-5,0],[-22,13],[5,2],[14,-5],[18,-2],[1,-4],[-4,-3]],[[1007,511],[-10,-1],[-8,4],[-3,3],[2,2],[6,4],[9,0],[6,-7],[5,-1],[-7,-4]],[[859,507],[-4,-3],[-29,3],[-6,3],[1,3],[7,3],[2,2],[13,1],[8,4],[15,-2],[9,-7],[-1,-4],[-5,-1],[-5,0],[-5,-2]],[[1221,532],[13,-3],[1,-7],[-17,-20],[-11,-5],[-17,1],[-15,2],[-12,10],[-10,0],[-9,14],[4,6],[14,0],[12,-1],[16,3],[31,0]],[[1568,506],[-2,-11],[-5,-5],[-18,-4],[-7,1],[-6,4],[-8,3],[-7,-4],[-4,-3],[-11,-6],[-4,-1],[-41,-6],[-14,1],[15,11],[-12,11],[-21,5],[-22,0],[-15,-3],[38,0],[-17,-19],[-24,3],[-25,9],[-19,-2],[-8,0],[-3,14],[6,17],[21,12],[23,2],[108,-4],[65,-14],[17,-11]],[[1650,553],[13,-1],[13,1],[10,-3],[8,-10],[-21,-12],[-27,-9],[-28,-6],[-25,0],[7,6],[5,7],[7,14],[-16,-6],[-18,-1],[-35,7],[16,16],[19,10],[21,6],[22,1],[4,-2],[0,-4],[-1,-5],[1,-2],[25,-7]],[[488,563],[-4,-4],[-9,0],[-2,8],[8,7],[9,4],[5,-2],[-1,-5],[-5,-1],[-2,-2],[1,-5]],[[995,565],[-1,-5],[-8,-2],[-24,6],[-13,-2],[-6,3],[-4,5],[-8,6],[3,5],[10,2],[22,-4],[13,-8],[9,-2],[7,-4]],[[1442,562],[-10,-2],[-19,3],[-12,7],[0,6],[7,3],[83,13],[27,0],[13,-7],[-9,-9],[-80,-14]],[[1064,592],[-5,-3],[-29,-5],[-17,1],[-3,4],[5,6],[8,1],[6,-5],[6,-1],[18,6],[8,0],[3,-4]],[[1447,593],[-87,-22],[-7,1],[16,17],[15,7],[8,2],[54,2],[1,-7]],[[958,597],[3,-7],[11,0],[8,-4],[2,-4],[-6,-2],[-22,8],[-12,3],[-11,3],[9,6],[10,-1],[8,-2]],[[779,578],[-4,-2],[-4,2],[1,4],[4,4],[2,3],[-1,4],[-6,8],[0,3],[12,2],[5,-2],[3,-3],[-2,-8],[2,-2],[1,-2],[-10,-7],[-3,-4]],[[666,588],[4,-12],[-1,-6],[-3,0],[-6,2],[-7,-1],[-4,3],[0,7],[-2,2],[-7,1],[-18,-2],[-9,6],[2,7],[6,6],[4,6],[11,1],[17,-7],[13,-13]],[[714,591],[-3,-5],[-33,13],[-9,11],[2,6],[7,6],[9,-1],[23,-7],[5,-5],[-1,-18]],[[735,638],[7,-10],[1,-7],[-6,-5],[-8,0],[-7,2],[-2,5],[1,6],[-1,1],[-5,-2],[-4,1],[1,2],[12,10],[5,3],[6,-6]],[[551,622],[0,-5],[-5,1],[-5,2],[-3,0],[-1,-2],[-3,-3],[-3,-1],[-5,5],[-1,7],[2,4],[7,0],[1,1],[-2,3],[1,5],[3,5],[4,1],[4,-2],[0,-4],[1,-7],[5,-10]],[[994,634],[-10,-6],[-8,5],[-2,5],[1,7],[3,5],[1,3],[-12,1],[-5,5],[2,4],[8,2],[13,-4],[7,-7],[3,-11],[4,-1],[-5,-8]],[[929,664],[3,-13],[-2,-8],[-5,-1],[-6,1],[-3,-1],[0,-5],[-2,-4],[-4,-5],[-4,-2],[-7,-2],[-7,2],[2,5],[3,1],[-2,4],[0,2],[-1,8],[1,5],[3,4],[4,1],[4,-1],[1,1],[-2,3],[1,3],[6,5],[10,2],[7,-5]],[[1212,619],[0,-6],[-26,5],[-13,0],[-12,-5],[13,-6],[26,-7],[12,-7],[-7,-7],[30,1],[12,-3],[8,-11],[-22,-7],[-9,0],[15,-5],[8,-1],[8,0],[0,-7],[-16,-6],[-17,-1],[-18,2],[-18,5],[-3,-2],[-4,-3],[-5,-2],[-6,0],[-1,2],[1,10],[0,2],[-21,9],[-10,3],[-28,4],[-21,6],[-18,9],[-8,12],[6,11],[15,8],[18,4],[16,0],[0,7],[-44,26],[4,13],[5,9],[9,5],[14,0],[14,-7],[40,-15],[9,-8],[3,-9],[7,-5],[9,-2],[9,-1],[16,-20]],[[956,677],[-12,-2],[-12,2],[-3,5],[4,3],[1,3],[-1,3],[3,1],[12,0],[6,-3],[6,-5],[-4,-7]],[[864,719],[-12,-11],[-2,-3],[0,-5],[-6,-2],[-9,6],[-6,3],[-15,3],[1,4],[8,12],[10,2],[9,-7],[5,-2],[5,1],[-1,5],[-4,5],[0,6],[4,2],[10,-4],[6,-5],[1,-5],[-4,-5]],[[984,675],[-11,-5],[-6,10],[8,18],[22,24],[25,17],[20,0],[-3,-14],[-9,-10],[-23,-19],[-10,-11],[-13,-10]],[[641,696],[-5,0],[-18,6],[-31,2],[-14,8],[9,21],[-7,11],[-13,10],[-8,18],[19,0],[26,-17],[24,-23],[2,-9],[16,-27]],[[766,752],[19,-13],[-4,-1],[-3,-1],[-4,0],[-7,2],[-4,-10],[-2,-9],[1,-8],[5,-6],[-15,1],[-12,-4],[-2,-8],[11,-9],[-23,6],[-23,12],[-20,18],[-10,24],[-12,-10],[-10,-3],[-7,5],[-2,18],[7,13],[17,5],[38,-2],[16,-17],[46,-3]],[[617,779],[-16,-1],[-7,6],[-3,9],[-5,6],[-19,3],[-10,3],[-9,7],[-8,14],[4,7],[23,5],[5,7],[4,8],[5,4],[10,-5],[1,-8],[3,-7],[6,-7],[9,-5],[-7,-14],[-5,-14],[3,-10],[16,-1],[0,-7]],[[636,917],[-20,-2],[-9,2],[-3,3],[3,3],[4,3],[10,1],[13,-4],[2,-6]],[[359,924],[-6,-1],[-4,4],[1,7],[9,5],[10,3],[2,-3],[-7,-7],[-1,-4],[-4,-4]],[[599,966],[-22,-3],[-3,3],[-1,5],[5,2],[7,1],[11,-4],[3,-4]],[[680,953],[-13,-3],[-8,5],[-6,6],[-7,3],[-2,5],[6,4],[12,1],[9,-3],[3,-3],[6,-4],[5,-5],[-5,-6]],[[614,969],[-5,-1],[-12,4],[-4,5],[1,3],[6,1],[17,-2],[2,-5],[-2,-3],[-2,-1],[-1,-1]],[[497,994],[3,-1],[3,1],[3,-4],[-1,-4],[-8,0],[-27,6],[-6,8],[-1,6],[4,1],[3,2],[3,3],[2,1],[5,-4],[1,-4],[16,-11]],[[595,1010],[-9,-2],[-11,0],[-7,3],[-2,4],[4,3],[21,5],[5,-2],[7,-6],[-1,-2],[-7,-3]],[[646,1024],[-2,-7],[-8,0],[-12,6],[1,3],[14,3],[7,-5]],[[632,1035],[-1,-3],[-3,-4],[-4,-1],[-10,1],[-2,-1],[0,-2],[-4,2],[-6,6],[3,2],[5,-2],[4,0],[2,4],[3,5],[7,-2],[6,-5]],[[378,1039],[-4,-1],[-21,8],[-5,4],[7,2],[11,-2],[11,-8],[1,-3]],[[549,1053],[2,-3],[8,2],[6,-1],[4,-2],[5,1],[7,6],[7,-2],[1,-13],[-4,-7],[-12,3],[-37,11],[-4,-1],[-3,1],[-1,3],[-5,4],[-9,4],[3,4],[16,3],[14,-4],[2,-9]],[[642,1091],[-7,-9],[-19,-1],[-20,4],[-10,-1],[-30,0],[-14,2],[-13,5],[23,10],[45,-10],[20,6],[-3,4],[-1,3],[-1,4],[-2,3],[6,2],[8,7],[5,4],[-26,19],[-17,7],[-19,1],[24,16],[14,4],[18,0],[15,-15],[14,-9],[34,-16],[-18,-10],[-15,-3],[-9,-7],[-2,-20]],[[518,1188],[-13,-1],[-2,1],[1,5],[5,1],[5,2],[3,-3],[1,-5]],[[652,1198],[-4,-3],[-1,5],[5,-2]],[[2990,858],[-14,-15],[-1,-13],[13,-8],[11,-3],[7,-11],[-6,-9],[-13,-17],[-18,-11],[-11,-3],[-5,-13],[6,-13],[2,-17],[-12,-10],[-98,-15],[-23,-10],[-18,-23],[73,-2],[13,-15],[0,-15],[-7,-25],[-19,-17],[-17,-5],[-12,-25],[-8,-25],[-37,-22],[-39,-13],[-10,-9],[-4,-11],[-7,1],[-10,-1],[-14,-4],[7,-4],[11,-4],[18,-10],[13,-15],[5,-11],[-9,-14],[-11,-1],[-50,6],[-11,0],[-19,-4],[-50,-24],[-44,-11],[-42,-3],[-38,2],[-16,3],[-16,7],[4,6],[3,6],[-12,2],[-14,-5],[-93,-57],[-73,-27],[-41,-6],[-37,12],[-6,5]],[[2191,332],[22,15],[-19,13],[-5,-6],[-10,-17],[-3,-4],[-8,-4],[-17,-4],[-8,-5],[-1,16],[-9,11],[-14,5],[-32,5],[-19,12],[-11,5],[9,10],[1,9],[-6,8],[-11,6],[49,46],[20,14],[59,30],[16,16],[6,9],[6,16],[7,8],[24,11],[10,7],[-2,9],[-19,2],[-24,-13],[-21,-19],[-12,-17],[-52,10],[-58,-15],[-129,-61],[-114,-18],[-53,-14],[-26,-1],[14,9],[49,18],[-18,3],[-2,7],[17,19],[10,6],[43,10],[-46,-3],[-21,-5],[-44,-18],[-21,-5],[-50,-1],[8,7],[1,6],[0,6],[4,7],[5,4],[17,8],[19,16],[29,17],[5,15],[46,28],[29,12],[3,14],[-6,9],[-40,-23],[-34,-3],[-73,3],[18,26],[-143,-19],[-32,0],[-10,4],[-28,17],[-63,25],[-18,4],[-41,3],[-5,6],[-3,13],[-6,5],[-17,-15],[-16,-10],[-16,2],[-27,18],[0,3],[1,8],[-1,3],[-4,0],[-11,-1],[-4,1],[-7,4],[-7,1],[-2,4],[4,11],[-44,0],[4,7],[5,12],[4,7],[-17,6],[-26,4],[-26,0],[-19,-3],[-9,-10],[4,-12],[24,-25],[-42,8],[-21,0],[-18,-8],[3,17],[13,29],[2,21],[0,15],[2,13],[11,9],[24,3],[-12,8],[-4,10],[2,10],[9,11],[-61,-24],[-18,-12],[-20,-9],[-49,-5],[-15,-9],[-2,-8],[8,-13],[-4,-9],[-5,-6],[-3,-4],[-1,-6],[0,-11],[-12,-12],[-27,-7],[-29,-1],[-20,4],[23,13],[-12,20],[-48,40],[15,1],[41,-8],[0,7],[-22,5],[-63,2],[-29,-7],[-10,0],[-8,2],[-15,9],[-9,2],[0,7],[6,0],[4,2],[9,4],[-13,14],[28,-6],[16,-1],[7,7],[-45,19],[-19,6],[-19,12],[-15,16],[-9,13],[1,5],[1,1],[1,1],[-3,6],[66,-10],[12,1],[6,12],[-4,10],[-9,9],[-8,12],[44,0],[0,6],[-20,1],[-20,4],[-18,7],[-18,8],[15,6],[7,1],[10,0],[-20,15],[-12,4],[-12,1],[6,13],[-6,14],[-12,8],[-13,-3],[-7,4],[-5,5],[-4,5],[-3,7],[10,10],[-17,19],[13,4],[45,-5],[24,1],[19,11],[-11,4],[-10,2],[-23,0],[-6,3],[-19,17],[10,2],[16,10],[8,2],[8,-3],[7,-5],[8,-5],[12,-1],[-6,10],[-4,11],[-5,9],[-7,4],[-11,1],[-4,5],[-3,6],[-4,8],[-41,45],[-16,7],[13,12],[6,2],[-25,11],[-9,8],[-3,14],[20,0],[40,-15],[21,-4],[20,2],[-1,5]],[[717,1245],[10,-1],[29,-31],[39,-11],[74,4],[24,8],[-2,7],[2,11],[7,8],[14,3],[11,-5],[5,-11],[3,-12],[5,-7],[23,-8],[28,-3],[31,3],[14,4],[10,14],[0,8],[12,7],[20,1],[12,-1],[9,-3],[-2,-2],[-11,-12],[32,-8],[56,-24],[21,-5],[21,-7],[-2,-5],[-1,-7],[-1,-6],[-2,-3],[5,-8],[25,-14],[9,-12],[1,-7],[15,-10],[133,-12],[20,3],[38,25],[29,9],[288,19],[10,4],[-7,3],[-28,18],[13,12],[20,4],[139,-3],[32,4],[39,9],[25,16],[-8,27],[8,5],[9,14],[-2,12],[-9,5],[0,12],[14,1],[74,-35],[44,-9]],[[681,1328],[-4,0],[-2,2],[1,4],[3,2],[4,-3],[-2,-5]],[[766,1391],[-18,-4],[-8,1],[-10,4],[-8,8],[7,4],[27,-7],[3,-2],[5,-2],[2,-2]],[[700,1385],[30,-15],[6,-4],[3,-1],[-8,0],[-32,9],[-17,-5],[-16,0],[-5,2],[1,0],[2,0],[-3,4],[-4,8],[4,6],[6,1],[4,2],[-1,3],[6,6],[15,5],[11,-4],[-5,-9],[3,-8]],[[795,1542],[16,-10],[1,-1],[-4,-3],[-10,1],[-13,4],[-8,2],[-4,-2],[-4,2],[4,4],[13,4],[9,-1]],[[668,1659],[-14,0],[-1,5],[12,5],[8,-2],[-5,-8]],[[808,1798],[-6,0],[-21,3],[-15,5],[-2,3],[10,1],[13,10],[33,-7],[3,-1],[2,-3],[-4,-4],[-7,0],[-3,-3],[-3,-4]],[[746,1814],[-2,-2],[-8,1],[0,-5],[20,-15],[-2,-5],[-11,2],[-11,7],[-13,14],[-6,4],[-1,4],[8,3],[15,-2],[11,-6]],[[717,1245],[0,3],[-15,7],[-23,2],[26,9],[54,-14],[26,5],[-13,6],[-12,11],[-4,13],[11,10],[-10,23],[-5,10],[-10,7],[9,0],[23,7],[-7,-1],[-6,1],[-7,2],[-5,4],[12,13],[-12,0],[12,6],[13,2],[30,0],[-4,9],[-2,4],[27,8],[29,4],[-13,21],[-18,9],[-44,11],[9,10],[12,5],[9,5],[-5,13],[38,0],[0,7],[-3,5],[3,18],[0,10],[-3,6],[-7,2],[-3,5],[-1,6],[2,9],[-1,5],[-6,19],[-5,7],[-14,7],[-12,4],[-26,5],[-12,4],[27,9],[58,-3],[28,7],[-13,15],[-14,10],[-30,16],[-62,16],[-18,10],[122,-10],[33,10],[-19,28],[-5,5],[-14,3],[-24,-5],[-13,2],[-36,27],[-8,10],[-1,5],[5,2],[15,3],[23,2],[106,-23],[58,-21],[27,-5],[0,7],[-63,33],[-31,24],[-20,42],[-17,7],[-19,5],[-14,9],[-1,8],[7,14],[-3,7],[-21,24],[0,6],[17,-3],[31,-13],[14,3],[-24,15],[-64,23],[-17,22],[2,12],[8,13],[7,13],[-3,12],[-12,6],[-16,3],[-10,6],[4,15],[-28,20],[-13,13],[-9,13],[9,4],[8,6],[1,7],[-18,6],[-4,8],[-2,9],[-6,7],[-8,1],[-42,-1],[-8,1]],[[2127,3],[-3,-3],[-3,2],[-2,1],[-2,1],[-5,2],[2,7],[7,-2],[5,-2],[1,-6]],[[2696,66],[-1,-13],[-5,4],[-5,-1],[-8,5],[10,4],[4,-1],[5,2]],[[2547,100],[-39,-5],[-1,1],[-6,5],[3,3],[4,0],[2,2],[-3,3],[-5,1],[-2,3],[3,3],[4,2],[50,0],[6,-2],[3,-2],[0,-2],[-3,0],[-2,-2],[-10,-4],[-4,-6]],[[2470,118],[-8,-3],[-18,1],[-13,5],[5,4],[21,0],[6,-2],[10,-3],[-3,-2]],[[2285,129],[-13,-1],[-6,5],[1,4],[-4,2],[-2,4],[2,4],[2,5],[4,1],[6,-6],[11,-3],[-3,-4],[1,-2],[4,-3],[-3,-6]],[[3012,189],[-11,-5],[-11,0],[-1,-2],[-1,-2],[-7,-2],[-14,-1],[-14,7],[-5,-1],[-3,2],[6,8],[15,9],[20,4],[21,-3],[8,-4],[-3,-1],[0,-9]],[[4032,358],[-6,0],[-2,3],[0,4],[4,7],[12,7],[15,-1],[10,-5],[-2,-4],[-6,0],[-3,-2],[1,-4],[-2,-1],[-13,0],[-8,-4]],[[4776,423],[-15,-4],[-13,1],[-6,10],[7,9],[17,2],[32,-2],[-12,-12],[-10,-4]],[[4577,441],[2,-14],[-22,7],[-8,4],[5,6],[13,16],[-28,4],[-20,15],[-5,20],[15,17],[16,-5],[78,-44],[-7,-7],[-15,-4],[-15,-6],[-9,-9]],[[5127,538],[-4,-2],[-6,1],[-25,-1],[-5,2],[-12,16],[-8,6],[-2,4],[5,3],[10,1],[21,-5],[10,-7],[17,-7],[4,-6],[-5,-5]],[[5417,803],[-80,-81],[-9,-33],[27,-30],[-15,-16],[-8,-6],[-8,-4],[-26,0],[-6,-5],[7,-15],[-10,2],[-10,4],[-17,14],[1,-12],[-3,-6],[-7,-2],[-10,0],[-11,-3],[-2,-7],[0,-7],[-6,-3],[-17,7],[-12,16],[-10,16],[-8,7],[-11,6],[-15,11],[-15,10],[-13,0],[-2,-12],[12,-14],[28,-21],[-86,8],[-8,-1],[-18,-11],[-7,-2],[-8,6],[-36,20],[-30,9],[-12,5],[-32,24],[-30,13],[-32,8],[-26,2],[0,-8],[50,-12],[10,-7],[19,-17],[23,-7],[7,-8],[2,-10],[1,-9],[-7,-5],[-14,1],[-9,-1],[5,-11],[10,-8],[34,-12],[17,-17],[8,-7],[12,-2],[6,-5],[-1,-12],[-6,-12],[-8,-5],[-47,-6],[-1,22],[-38,31],[8,13],[-11,-1],[-8,-4],[-7,-5],[-9,-3],[-10,1],[-8,3],[-54,29],[-20,8],[-23,5],[33,-24],[19,-10],[17,-6],[-9,-20],[-21,-20],[-1,-13],[8,-14],[27,-26],[8,-19],[-19,1],[-14,3],[-11,6],[-12,9],[6,7],[-13,11],[-18,4],[-20,1],[-18,4],[-27,20],[-15,7],[-14,-7],[6,-17],[32,-13],[62,-17],[-62,-13],[0,-6],[-17,-5],[-24,7],[-73,44],[-6,7],[2,13],[7,9],[11,4],[-20,7],[0,7],[50,0],[-12,21],[-20,1],[-21,-8],[-15,-8],[-24,-9],[-70,-11],[0,-6],[13,-4],[5,-11],[-1,-13],[-4,-13],[-4,-3],[-7,-1],[-6,-3],[-5,-16],[-5,-6],[-8,-2],[-129,-1],[2,14],[-11,7],[-34,5],[2,-4],[3,-12],[2,-4],[-29,-6],[-85,0],[-4,-2],[-2,-3],[0,-12],[-4,-5],[-11,2],[-16,7],[-1,-8],[33,-11],[11,-8],[-8,-3],[-12,-1],[14,-9],[-18,-7],[-55,-8],[-20,1],[2,7],[1,3],[3,4],[-39,-13],[-10,-8],[18,-6],[-6,-6],[-15,0],[-14,-9],[-17,4],[-12,11],[12,7],[10,13],[4,15],[-7,11],[-18,2],[-13,-13],[-21,-46],[-10,-8],[-78,-3],[-18,3],[-10,12],[33,6],[-2,17],[-24,15],[-32,-4],[18,-27],[-13,-5],[-25,-11],[-12,-4],[-47,-4],[-30,-6],[-8,-2],[-5,-5],[-2,-7],[3,-12],[-4,-4],[-13,0],[-6,8],[-3,11],[-4,8],[-10,7],[-57,17],[-13,2],[-5,-3],[10,-10],[15,-7],[13,-3],[6,-5],[-9,-12],[-11,-7],[-13,-3],[-12,-5],[-7,-11],[62,13],[-5,-9],[-8,-7],[-18,-11],[19,-7],[0,-6],[-62,-24],[-36,-29],[-18,-9],[-20,-4],[-27,-1],[7,14],[26,31],[11,9],[-17,1],[-23,-12],[-42,-29],[-7,16],[-15,-5],[-19,-13],[-16,-6],[6,17],[11,7],[12,5],[12,9],[3,7],[-1,8],[1,10],[7,11],[-44,2],[-22,-3],[-16,-12],[13,-7],[-29,-11],[-8,-2],[-12,0],[-32,7],[-25,1],[-17,-4],[0,-9],[23,-9],[-17,-5],[-15,2],[-15,6],[-16,4],[-8,0],[-34,-11],[-9,0],[-11,4],[-17,-15],[-17,1],[-6,10],[15,11],[0,7],[-17,-1],[-9,-7],[-8,-9],[-10,-10],[-14,-8],[-14,-4],[-61,-6],[-68,-35],[-25,11],[-150,-11],[-12,4],[-10,12],[-9,4],[-11,0],[-60,-9],[-39,-11],[-22,0],[11,14],[39,39],[13,7],[27,5],[12,5],[2,7],[-6,8],[-2,9],[3,9],[8,10],[-33,-6],[-11,-4],[-7,-7],[-4,-10],[-7,-9],[-13,-4],[-9,-4],[-4,-10],[-3,-12],[-6,-11],[-9,-5],[-20,-8],[-9,-6],[-30,-28],[-36,-22],[-81,-24],[-14,-12],[0,-17],[10,-16],[17,-4],[0,-6],[-156,-14],[-12,-6],[-56,5],[-21,-2],[-17,-5],[-55,-7],[-15,2],[16,6],[23,22],[14,5],[37,4],[129,34],[37,2],[-7,21],[5,7],[10,0],[11,-2],[30,0],[23,7],[20,13],[22,22],[14,20],[16,29],[6,20],[-15,-7],[-61,-72],[-24,-18],[-18,0],[1,3],[2,6],[3,4],[-9,5],[-10,1],[-10,-1],[-9,-5],[3,-7],[-36,6],[-10,-9],[-3,-9],[-7,-1],[-6,7],[-3,10],[9,29],[1,4],[15,8],[69,14],[13,11],[22,24],[14,6],[-48,10],[-90,-10],[-43,0],[-21,5],[-21,7],[-15,10],[-5,15],[6,12],[14,11],[8,5]]],"transform":{"scale":[0.001094745501550162,0.0010312276745674644],"translate":[20.623164510000038,59.76406484600001]}};
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
