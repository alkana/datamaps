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
  Datamap.prototype.gbrTopo = {"type":"Topology","objects":{"gbr":{"type":"GeometryCollection","geometries":[{"type":"Polygon","properties":{"name":"East Ayrshire"},"id":"GB.EA","arcs":[[0,1,2,3,4]]},{"type":"Polygon","properties":{"name":"East Dunbartonshire"},"id":"GB.ED","arcs":[[5,6,7,8]]},{"type":"Polygon","properties":{"name":"East Renfrewshire"},"id":"GB.ER","arcs":[[9,-5,10,11,12]]},{"type":"Polygon","properties":{"name":"Glasgow"},"id":"GB.GG","arcs":[[13,14,-13,15,16,-7]]},{"type":"Polygon","properties":{"name":"Inverclyde"},"id":"GB.IC","arcs":[[17,18,19]]},{"type":"Polygon","properties":{"name":"North Ayshire"},"id":"GB.ED","arcs":[[20,-11,-4,21,22,-19]]},{"type":"Polygon","properties":{"name":"North Lanarkshire"},"id":"GB.NN","arcs":[[23,24,25,-14,-6,26]]},{"type":"Polygon","properties":{"name":"Renfrewshire"},"id":"GB.RF","arcs":[[27,-16,-12,-21,-18,28]]},{"type":"Polygon","properties":{"name":"South Ayrshire"},"id":"GB.SA","arcs":[[29,30,-22,-3]]},{"type":"Polygon","properties":{"name":"South Lanarkshire"},"id":"GB.SL","arcs":[[-26,31,32,33,-1,-10,-15]]},{"type":"Polygon","properties":{"name":"West Dunbartonshire"},"id":"GB.WD","arcs":[[-8,-17,-28,34,35,36]]},{"type":"Polygon","properties":{"name":"Aberdeen"},"id":"GB.AR","arcs":[[37,38]]},{"type":"Polygon","properties":{"name":"Aberdeenshire"},"id":"GB.AS","arcs":[[-39,39,40,41,42,43,44]]},{"type":"Polygon","properties":{"name":"Moray"},"id":"GB.MO","arcs":[[-44,45,46]]},{"type":"Polygon","properties":{"name":"Falkirk"},"id":"GB.FK","arcs":[[47,48,-24,49]]},{"type":"Polygon","properties":{"name":"Stirling"},"id":"GB.ZG","arcs":[[50,51,-50,-27,-9,-37,52,53]]},{"type":"Polygon","properties":{"name":"Clackmannanshire"},"id":"GB.CC","arcs":[[54,55,-51,56]]},{"type":"Polygon","properties":{"name":"Perthshire and Kinross"},"id":"GB.","arcs":[[-42,57,58,59,60,-57,-54,61,62]]},{"type":"Polygon","properties":{"name":"Angus"},"id":"GB.AG","arcs":[[63,64,-58,-41]]},{"type":"Polygon","properties":{"name":"Dundee"},"id":"GB.DU","arcs":[[65,-59,-65]]},{"type":"Polygon","properties":{"name":"Fife"},"id":"GB.FI","arcs":[[-55,-61,66]]},{"type":"Polygon","properties":{"name":"East Lothian"},"id":"GB.EL","arcs":[[67,68,69]]},{"type":"Polygon","properties":{"name":"Edinburgh"},"id":"GB.EB","arcs":[[70,71,72,73]]},{"type":"Polygon","properties":{"name":"Midlothian"},"id":"GB.ML","arcs":[[74,-71,75,-69]]},{"type":"Polygon","properties":{"name":"West Lothian"},"id":"GB.WH","arcs":[[-73,76,-32,-25,-49,77]]},{"type":"Polygon","properties":{"name":"Scottish Borders"},"id":"GB.BO","arcs":[[78,79,80,-33,-77,-72,-75,-68,81]]},{"type":"Polygon","properties":{"name":"Darlington"},"id":"GB.DA","arcs":[[82,83,84]]},{"type":"Polygon","properties":{"name":"Durham"},"id":"GB.DH","arcs":[[85,86,87,88,-84,89,90,91,92]]},{"type":"Polygon","properties":{"name":"Hartlepool"},"id":"GB.HP","arcs":[[93,94,-88,95]]},{"type":"Polygon","properties":{"name":"Middlesbrough"},"id":"GB.MB","arcs":[[96,97,98]]},{"type":"Polygon","properties":{"name":"Redcar and Cleveland"},"id":"GB.RC","arcs":[[99,-97,100,-94,101]]},{"type":"Polygon","properties":{"name":"Stockton-on-Tees"},"id":"GB.ZT","arcs":[[-101,-99,102,-85,-89,-95]]},{"type":"Polygon","properties":{"name":"Northumberland"},"id":"GB.NB","arcs":[[103,104,105,-92,106,-79,107]]},{"type":"Polygon","properties":{"name":"Hampshire"},"id":"GB.HA","arcs":[[108,109,110,111,112,113,114,115,116,117,118,119]]},{"type":"Polygon","properties":{"name":"Southampton"},"id":"GB.ZH","arcs":[[120,-116]]},{"type":"Polygon","properties":{"name":"Milton Keynes"},"id":"GB.MK","arcs":[[121,122,123,124]]},{"type":"Polygon","properties":{"name":"Gloucestershire"},"id":"GB.GC","arcs":[[125,126,127,128,129,130,131,132,133]]},{"type":"Polygon","properties":{"name":"Buckinghamshire"},"id":"GB.BU","arcs":[[-123,134,135,136,137,138,139,140,141,142]]},{"type":"Polygon","properties":{"name":"Hertfordshire"},"id":"GB.HT","arcs":[[143,144,145,146,147,-136,148,149,150,151]]},{"type":"Polygon","properties":{"name":"Bath and North East Somerset"},"id":"GB.BN","arcs":[[152,153,154,155,156]]},{"type":"Polygon","properties":{"name":"Bristol"},"id":"GB.BS","arcs":[[-155,157,158,159]]},{"type":"Polygon","properties":{"name":"North Somerset"},"id":"GB.NS","arcs":[[-154,160,161,-158]]},{"type":"Polygon","properties":{"name":"South Gloucestershire"},"id":"GB.SJ","arcs":[[162,-156,-160,163,-129]]},{"type":"Polygon","properties":{"name":"Somerset"},"id":"GB.SM","arcs":[[-153,164,165,166,167,-161]]},{"type":"MultiPolygon","properties":{"name":"Devon"},"id":"GB.DO","arcs":[[[168]],[[169,170,171,172,173,174,175,176,-167]]]},{"type":"Polygon","properties":{"name":"Bournemouth"},"id":"GB.BM","arcs":[[177,178,179]]},{"type":"Polygon","properties":{"name":"Dorset"},"id":"GB.DS","arcs":[[-118,180,-180,181,182,-170,-166,183]]},{"type":"Polygon","properties":{"name":"Poole"},"id":"GB.BM","arcs":[[-179,184,-182]]},{"type":"Polygon","properties":{"name":"Cambridgeshire"},"id":"GB.CM","arcs":[[185,186,187,-152,188,189,190,191,192]]},{"type":"Polygon","properties":{"name":"Leicestershire"},"id":"GB.","arcs":[[193,194,195,196,197,198,199],[200]]},{"type":"Polygon","properties":{"name":"Kingston upon Hull"},"id":"GB.KH","arcs":[[201,202]]},{"type":"Polygon","properties":{"name":"North East Lincolnshire"},"id":"GB.NE","arcs":[[203,204,205]]},{"type":"Polygon","properties":{"name":"North Lincolnshire"},"id":"GB.NL","arcs":[[-205,206,207,208,209,210]]},{"type":"Polygon","properties":{"name":"Derby"},"id":"GB.DE","arcs":[[211]]},{"type":"Polygon","properties":{"name":"Derbyshire"},"id":"GB.DB","arcs":[[212,213,214,-198,215,216,217,218,219,220],[-212]]},{"type":"Polygon","properties":{"name":"Barking and Dagenham"},"id":"GB.BA","arcs":[[221,222,223,224,225]]},{"type":"Polygon","properties":{"name":"Bexley"},"id":"GB.XB","arcs":[[226,227,228,229,230,-222]]},{"type":"Polygon","properties":{"name":"Brent"},"id":"GB.BE","arcs":[[231,232,233,234,235,236]]},{"type":"Polygon","properties":{"name":"Bromley"},"id":"GB.BZ","arcs":[[-230,237,238,239,240,241,242,243]]},{"type":"Polygon","properties":{"name":"Camden"},"id":"GB.CN","arcs":[[244,245,246,247,248,-232,249,250]]},{"type":"Polygon","properties":{"name":"Croydon"},"id":"GB.CY","arcs":[[-240,251,252,253,254]]},{"type":"Polygon","properties":{"name":"Ealing"},"id":"GB.EG","arcs":[[255,256,257,258,-235]]},{"type":"Polygon","properties":{"name":"Enfield"},"id":"GB.EF","arcs":[[259,260,261,262,-145]]},{"type":"Polygon","properties":{"name":"Greenwich"},"id":"GB.GR","arcs":[[-244,263,264,265,-223,-231]]},{"type":"Polygon","properties":{"name":"Hammersmith and Fulham"},"id":"GB.HF","arcs":[[266,267,268,269,-256,-234]]},{"type":"Polygon","properties":{"name":"Hounslow"},"id":"GB.HU","arcs":[[-270,270,271,272,-257]]},{"type":"Polygon","properties":{"name":"Islington"},"id":"GB.IT","arcs":[[273,274,-245,275]]},{"type":"Polygon","properties":{"name":"Kensington and Chelsea"},"id":"GB.KC","arcs":[[276,-267,277]]},{"type":"Polygon","properties":{"name":"Merton"},"id":"GB.ME","arcs":[[278,-254,279,280,281]]},{"type":"Polygon","properties":{"name":"Redbridge"},"id":"GB.RB","arcs":[[282,-225,283,284,285]]},{"type":"Polygon","properties":{"name":"Richmond upon Thames"},"id":"GB.RU","arcs":[[286,287,288,-271,-269]]},{"type":"Polygon","properties":{"name":"Sutton"},"id":"GB.SU","arcs":[[-253,289,290,-280]]},{"type":"Polygon","properties":{"name":"Tower Hamlets"},"id":"GB.TH","arcs":[[-265,291,292,293,294]]},{"type":"Polygon","properties":{"name":"Waltham Forest"},"id":"GB.WF","arcs":[[-285,295,296,297,-261,298]]},{"type":"Polygon","properties":{"name":"Wandsworth"},"id":"GB.WW","arcs":[[-282,-287,-268,-277,299,300]]},{"type":"Polygon","properties":{"name":"Westminster"},"id":"GB.WE","arcs":[[301,-300,-278,-233,-249]]},{"type":"Polygon","properties":{"name":"Lincolnshire"},"id":"GB.LI","arcs":[[-204,302,303,-193,304,305,-200,306,-207]]},{"type":"Polygon","properties":{"name":"Belfast"},"id":"GB.BF","arcs":[[307,308,309,310,311,312]]},{"type":"Polygon","properties":{"name":"Derry"},"id":"GB.LD","arcs":[[313,314,315]]},{"type":"Polygon","properties":{"name":"Omagh"},"id":"GB.OM","arcs":[[316,317,318,319,320]]},{"type":"Polygon","properties":{"name":"Armagh"},"id":"GB.AM","arcs":[[321,322,323,324,325]]},{"type":"Polygon","properties":{"name":"Newry and Mourne"},"id":"GB.NM","arcs":[[326,327,-324,328]]},{"type":"Polygon","properties":{"name":"Banbridge"},"id":"GB.BB","arcs":[[329,-329,-323,330,331]]},{"type":"Polygon","properties":{"name":"Craigavon"},"id":"GB.CR","arcs":[[332,-331,-322,333,334,335]]},{"type":"Polygon","properties":{"name":"Dungannon"},"id":"GB.DN","arcs":[[-334,-326,336,337,-319,338]]},{"type":"Polygon","properties":{"name":"Lisburn"},"id":"GB.LB","arcs":[[339,340,-332,-333,341,-311]]},{"type":"Polygon","properties":{"name":"Cookstown"},"id":"GB.","arcs":[[342,-335,-339,-318,343]]},{"type":"Polygon","properties":{"name":"Antrim"},"id":"GB.AN","arcs":[[344,-312,-342,-336,-343,345,346]]},{"type":"Polygon","properties":{"name":"Magherafelt"},"id":"GB.MF","arcs":[[347,-346,-344,-317,348,349,350,351]]},{"type":"Polygon","properties":{"name":"Ballymena"},"id":"GB.BL","arcs":[[352,353,-347,-348,354,355]]},{"type":"Polygon","properties":{"name":"Larne"},"id":"GB.LR","arcs":[[356,357,-353,358,359]]},{"type":"Polygon","properties":{"name":"Carrickfergus"},"id":"GB.CF","arcs":[[360,361,-357]]},{"type":"Polygon","properties":{"name":"Newtownabbey"},"id":"GB.NW","arcs":[[-362,362,-313,-345,-354,-358]]},{"type":"Polygon","properties":{"name":"North Down"},"id":"GB.ND","arcs":[[363,364,-309,365]]},{"type":"Polygon","properties":{"name":"Down"},"id":"GB.DW","arcs":[[366,-327,-330,-341,367,368]]},{"type":"Polygon","properties":{"name":"Coleraine"},"id":"GB.CL","arcs":[[369,-351,370,371,372]]},{"type":"Polygon","properties":{"name":"Ballymoney"},"id":"GB.BY","arcs":[[-355,-352,-370,373]]},{"type":"Polygon","properties":{"name":"Limavady"},"id":"GB.LM","arcs":[[-371,-350,374,-314,375]]},{"type":"Polygon","properties":{"name":"Castlereagh"},"id":"GB.CS","arcs":[[376,-368,-340,-310,-365]]},{"type":"Polygon","properties":{"name":"Carmarthenshire"},"id":"GB.CI","arcs":[[377,378,379,380,381,382]]},{"type":"Polygon","properties":{"name":"Ceredigion"},"id":"GB.","arcs":[[-383,383,384,385,386]]},{"type":"MultiPolygon","properties":{"name":"Pembrokeshire"},"id":"GB.PE","arcs":[[[387]],[[388]],[[389]],[[-382,390,-384]]]},{"type":"Polygon","properties":{"name":"Halton"},"id":"GB.HL","arcs":[[391,392]]},{"type":"Polygon","properties":{"name":"Cornwall"},"id":"GB.CO","arcs":[[393,-176]]},{"type":"Polygon","properties":{"name":"Powys"},"id":"GB.PO","arcs":[[394,395,396,397,398,399,400,401,-378,-387,402,403,404]]},{"type":"Polygon","properties":{"name":"Bridgend"},"id":"GB.BJ","arcs":[[405,406,407,408]]},{"type":"Polygon","properties":{"name":"Caerphilly"},"id":"GB.CP","arcs":[[409,410,411,412,413,-399,414]]},{"type":"Polygon","properties":{"name":"Merthyr Tydfil"},"id":"GB.MT","arcs":[[-414,415,-400]]},{"type":"Polygon","properties":{"name":"Rhondda, Cynon, Taff"},"id":"GB.RT","arcs":[[-416,-413,416,417,-409,418,-401]]},{"type":"Polygon","properties":{"name":"Cardiff"},"id":"GB.CA","arcs":[[419,420,421,-417,-412]]},{"type":"Polygon","properties":{"name":"Vale of Glamorgan"},"id":"GB.VG","arcs":[[-422,422,-406,-418]]},{"type":"Polygon","properties":{"name":"Neath Port Talbot"},"id":"GB.NP","arcs":[[-402,-419,-408,423,424,-379]]},{"type":"Polygon","properties":{"name":"Swansea"},"id":"GB.SW","arcs":[[-425,425,-380]]},{"type":"Polygon","properties":{"name":"York"},"id":"GB.YK","arcs":[[426,427]]},{"type":"Polygon","properties":{"name":"Telford and Wrekin"},"id":"GB.TK","arcs":[[428,429]]},{"type":"Polygon","properties":{"name":"Blackburn with Darwen"},"id":"GB.BW","arcs":[[430,431,432]]},{"type":"Polygon","properties":{"name":"Lancashire"},"id":"GB.LA","arcs":[[433,434,435,436,-433,437,438,439,440,441,442,443,444,445]]},{"type":"Polygon","properties":{"name":"East Riding of Yorkshire"},"id":"GB.EY","arcs":[[446,-203,447,-210,448,449,-427,450]]},{"type":"Polygon","properties":{"name":"Denbighshire"},"id":"GB.DI","arcs":[[451,-404,452,453,454,455]]},{"type":"Polygon","properties":{"name":"Flintshire"},"id":"GB.FL","arcs":[[456,457,-456,458]]},{"type":"Polygon","properties":{"name":"Wrexham"},"id":"GB.WX","arcs":[[459,-405,-452,-458,460]]},{"type":"MultiPolygon","properties":{"name":"Anglesey"},"id":"GB.AY","arcs":[[[461]],[[462]]]},{"type":"Polygon","properties":{"name":"Conwy"},"id":"GB.CW","arcs":[[-454,463,464]]},{"type":"MultiPolygon","properties":{"name":"Gwynedd"},"id":"GB.GD","arcs":[[[465]],[[-453,-403,-386,466,-464]]]},{"type":"Polygon","properties":{"name":"Blaenau Gwent"},"id":"GB.BG","arcs":[[467,468,-415,-398]]},{"type":"Polygon","properties":{"name":"Monmouthshire"},"id":"GB.MM","arcs":[[-131,469,470,471,-468,-397,472]]},{"type":"Polygon","properties":{"name":"Newport"},"id":"GB.NO","arcs":[[473,-420,-411,474,-471]]},{"type":"Polygon","properties":{"name":"Torfaen"},"id":"GB.TF","arcs":[[-475,-410,-469,-472]]},{"type":"Polygon","properties":{"name":"Strabane"},"id":"GB.SB","arcs":[[-375,-349,-321,475,476,-315]]},{"type":"Polygon","properties":{"name":"Fermanagh"},"id":"GB.FE","arcs":[[-320,-338,477,-476]]},{"type":"Polygon","properties":{"name":"Ards"},"id":"GB.ND","arcs":[[-369,-377,-364,478]]},{"type":"Polygon","properties":{"name":"Dumfries and Galloway"},"id":"GB.DG","arcs":[[-81,479,480,-30,-2,-34]]},{"type":"Polygon","properties":{"name":"Cumbria"},"id":"GB.CU","arcs":[[-91,481,-446,482,-480,-80,-107]]},{"type":"Polygon","properties":{"name":"North Yorkshire"},"id":"GB.NY","arcs":[[-451,-428,-450,483,484,485,486,487,-434,-482,-90,-83,-103,-98,-100,488]]},{"type":"Polygon","properties":{"name":"Plymouth"},"id":"GB.DO","arcs":[[489,-174]]},{"type":"Polygon","properties":{"name":"Torbay"},"id":"GB.TB","arcs":[[490,-172]]},{"type":"Polygon","properties":{"name":"Essex"},"id":"GB.EX","arcs":[[491,492,493,494,495,496,-286,-299,-260,-144,-188]]},{"type":"Polygon","properties":{"name":"Suffolk"},"id":"GB.SF","arcs":[[497,-492,-187,498]]},{"type":"Polygon","properties":{"name":"Norfolk"},"id":"GB.NF","arcs":[[-499,-186,-304,499]]},{"type":"Polygon","properties":{"name":"Brighton and Hove"},"id":"GB.BH","arcs":[[500,501,502]]},{"type":"Polygon","properties":{"name":"Havering"},"id":"GB.HV","arcs":[[503,-227,-226,-283,-497]]},{"type":"Polygon","properties":{"name":"Thurrock"},"id":"GB.TR","arcs":[[504,505,-228,-504,-496]]},{"type":"Polygon","properties":{"name":"East Sussex"},"id":"GB.ES","arcs":[[506,-501,507,508,509]]},{"type":"Polygon","properties":{"name":"Medway"},"id":"GB.MW","arcs":[[510,511]]},{"type":"Polygon","properties":{"name":"Southend-on-Sea"},"id":"GB.SS","arcs":[[512,-494]]},{"type":"MultiPolygon","properties":{"name":"Orkney"},"id":"GB.MO","arcs":[[[513]],[[514]],[[515]],[[516]],[[517]],[[518]],[[519]],[[520]]]},{"type":"MultiPolygon","properties":{"name":"Highland"},"id":"GB.HI","arcs":[[[521]],[[522]],[[523]],[[524]],[[525]],[[526]],[[-46,-43,-63,527,528]]]},{"type":"MultiPolygon","properties":{"name":"Argyll and Bute"},"id":"GB.AB","arcs":[[[529]],[[530]],[[531]],[[532]],[[533]],[[534]],[[535]],[[536]],[[537]],[[538]],[[539]],[[540]],[[-62,-53,-36,541,-528]],[[542]]]},{"type":"MultiPolygon","properties":{"name":"Shetland Islands"},"id":"GB.AR","arcs":[[[543]],[[544]],[[545]],[[546]],[[547]],[[548]],[[549]],[[550]],[[551]]]},{"type":"Polygon","properties":{"name":"West Sussex"},"id":"GB.WS","arcs":[[-508,-503,552,-112,553]]},{"type":"Polygon","properties":{"name":"Northamptonshire"},"id":"GB.NA","arcs":[[-191,554,-124,-143,555,556,-195,557,558]]},{"type":"Polygon","properties":{"name":"Warwickshire"},"id":"GB.WR","arcs":[[-557,559,-134,560,561,562,563,564,565,566,-196]]},{"type":"Polygon","properties":{"name":"Oxfordshire"},"id":"GB.OX","arcs":[[-142,567,568,569,570,-126,-560,-556]]},{"type":"Polygon","properties":{"name":"Luton"},"id":"GB.LU","arcs":[[571,-150]]},{"type":"Polygon","properties":{"name":"Hillingdon"},"id":"GB.HD","arcs":[[572,-258,-273,573,-137,-148]]},{"type":"Polygon","properties":{"name":"Kingston upon Thames"},"id":"GB.KT","arcs":[[-281,-291,574,-288]]},{"type":"Polygon","properties":{"name":"Surrey"},"id":"GB.SR","arcs":[[-272,-289,-575,-290,-252,-239,575,-509,-554,-111,576,577,578,-138,-574]]},{"type":"Polygon","properties":{"name":"Swindon"},"id":"GB.SN","arcs":[[-571,579,580,-127]]},{"type":"Polygon","properties":{"name":"Wiltshire"},"id":"GB.WL","arcs":[[-581,581,-119,-184,-165,-157,-163,-128]]},{"type":"Polygon","properties":{"name":"Isle of Wight"},"id":"GB.IW","arcs":[[582]]},{"type":"MultiPolygon","properties":{"name":"Portsmouth"},"id":"GB.PS","arcs":[[[583]],[[584,-114]]]},{"type":"Polygon","properties":{"name":"Peterborough"},"id":"GB.PB","arcs":[[-192,-559,-305]]},{"type":"Polygon","properties":{"name":"Leicester"},"id":"GB.LC","arcs":[[-201]]},{"type":"Polygon","properties":{"name":"Rutland"},"id":"GB.RL","arcs":[[-558,-194,-306]]},{"type":"Polygon","properties":{"name":"Nottingham"},"id":"GB.NG","arcs":[[585]]},{"type":"Polygon","properties":{"name":"Nottinghamshire"},"id":"GB.NT","arcs":[[-307,-199,-215,586,587,-208],[-586]]},{"type":"Polygon","properties":{"name":"Hackney"},"id":"GB.HK","arcs":[[588,-294,589,-274,590,-297]]},{"type":"Polygon","properties":{"name":"Haringey"},"id":"GB.HY","arcs":[[-298,-591,-276,-251,591,-262]]},{"type":"Polygon","properties":{"name":"Harrow"},"id":"GB.HR","arcs":[[-236,-259,-573,-147,592]]},{"type":"Polygon","properties":{"name":"Lambeth"},"id":"GB.LT","arcs":[[-241,-255,-279,-301,-302,-248,593]]},{"type":"Polygon","properties":{"name":"Lewisham"},"id":"GB.LW","arcs":[[-264,-243,594]]},{"type":"Polygon","properties":{"name":"Newham"},"id":"GB.NH","arcs":[[-224,-266,-295,-589,-296,-284]]},{"type":"Polygon","properties":{"name":"Southwark"},"id":"GB.SQ","arcs":[[-292,-595,-242,-594,-247,595]]},{"type":"MultiPolygon","properties":{"name":"Eilean Siar"},"id":"GB.WI","arcs":[[[596]],[[597]],[[598]],[[599]],[[600]],[[601]],[[602]],[[603]],[[604]],[[605]],[[606]]]},{"type":"MultiPolygon","properties":{"name":"Moyle"},"id":"GB.MY","arcs":[[[-359,-356,-374,-373,607]],[[608]]]},{"type":"Polygon","properties":{"name":"Warrington"},"id":"GB.WT","arcs":[[609,610,611,612,613,614,615]]},{"type":"Polygon","properties":{"name":"Herefordshire"},"id":"GB.HE","arcs":[[616,-132,-473,-396,617]]},{"type":"Polygon","properties":{"name":"Worcestershire"},"id":"GB.WC","arcs":[[618,619,-561,-133,-617,620,621]]},{"type":"Polygon","properties":{"name":"Staffordshire"},"id":"GB.ST","arcs":[[-197,-567,622,623,624,625,-622,626,-430,627,628,629,630,-216]]},{"type":"Polygon","properties":{"name":"Stoke-on-Trent"},"id":"GB.SO","arcs":[[631,-630]]},{"type":"Polygon","properties":{"name":"Shropshire"},"id":"GB.SP","arcs":[[-429,-627,-621,-618,-395,-460,632,633,-628]]},{"type":"MultiPolygon","properties":{"name":"Kent"},"id":"GB.KE","arcs":[[[634]],[[635,-510,-576,-238,-229,-506,636,-511]]]},{"type":"Polygon","properties":{"name":"City"},"id":"GB.IT","arcs":[[-293,-596,-246,-275,-590]]},{"type":"Polygon","properties":{"name":"Newcastle upon Tyne"},"id":"GB.TW","arcs":[[637,638,639,-105]]},{"type":"Polygon","properties":{"name":"North Tyneside"},"id":"GB.TW","arcs":[[640,-638,-104,641]]},{"type":"Polygon","properties":{"name":"South Tyneside"},"id":"GB.TW","arcs":[[642,643,-639,-641,644]]},{"type":"Polygon","properties":{"name":"Sunderland"},"id":"GB.TW","arcs":[[645,-86,646,-643]]},{"type":"Polygon","properties":{"name":"Gateshead"},"id":"GB.TW","arcs":[[-644,-647,-93,-106,-640]]},{"type":"Polygon","properties":{"name":"Knowsley"},"id":"GB.MS","arcs":[[647,648,649,650,651,-441]]},{"type":"Polygon","properties":{"name":"Sefton"},"id":"GB.MS","arcs":[[-652,652,653,-442]]},{"type":"Polygon","properties":{"name":"Liverpool"},"id":"GB.MS","arcs":[[654,-653,-651]]},{"type":"Polygon","properties":{"name":"Merseyside"},"id":"GB.MS","arcs":[[655,-615,656,-648,-440]]},{"type":"Polygon","properties":{"name":"Blackpool"},"id":"GB.LA","arcs":[[657,-444]]},{"type":"Polygon","properties":{"name":"Kirklees"},"id":"GB.WY","arcs":[[658,659,-221,660,661,662,663,664]]},{"type":"Polygon","properties":{"name":"Calderdale"},"id":"GB.WY","arcs":[[665,-663,666,-435,-488]]},{"type":"Polygon","properties":{"name":"Bradford"},"id":"GB.WY","arcs":[[667,-664,-666,-487]]},{"type":"Polygon","properties":{"name":"Leeds"},"id":"GB.WY","arcs":[[668,-665,-668,-486]]},{"type":"Polygon","properties":{"name":"Wakefield"},"id":"GB.WY","arcs":[[669,670,-659,-669,-485]]},{"type":"Polygon","properties":{"name":"Salford"},"id":"GB.MN","arcs":[[671,672,673,-610,674,675]]},{"type":"Polygon","properties":{"name":"Wigan"},"id":"GB.MN","arcs":[[676,-675,-616,-656,-439]]},{"type":"Polygon","properties":{"name":"Bolton"},"id":"GB.MN","arcs":[[677,-676,-677,-438,-432]]},{"type":"Polygon","properties":{"name":"Bury"},"id":"GB.MN","arcs":[[678,679,-672,-678,-431,-437]]},{"type":"Polygon","properties":{"name":"Rochdale"},"id":"GB.MN","arcs":[[-662,680,681,-679,-436,-667]]},{"type":"Polygon","properties":{"name":"Oldham"},"id":"GB.MN","arcs":[[-220,682,683,-681,-661]]},{"type":"Polygon","properties":{"name":"Tameside"},"id":"GB.MN","arcs":[[-219,684,685,-683]]},{"type":"Polygon","properties":{"name":"Stockport"},"id":"GB.MN","arcs":[[-218,686,687,-685]]},{"type":"Polygon","properties":{"name":"Manchester"},"id":"GB.MN","arcs":[[-684,-686,-688,688,689,-673,-680,-682]]},{"type":"Polygon","properties":{"name":"Trafford"},"id":"GB.MN","arcs":[[-690,690,-611,-674]]},{"type":"Polygon","properties":{"name":"Rotherham"},"id":"GB.SY","arcs":[[-587,-214,691,692,693]]},{"type":"Polygon","properties":{"name":"Sheffield"},"id":"GB.SY","arcs":[[-692,-213,694]]},{"type":"Polygon","properties":{"name":"Barnsley"},"id":"GB.SY","arcs":[[695,-693,-695,-660,-671]]},{"type":"Polygon","properties":{"name":"Doncaster"},"id":"GB.SY","arcs":[[-209,-588,-694,-696,-670,-484,-449]]},{"type":"Polygon","properties":{"name":"Birmingham"},"id":"GB.WM","arcs":[[-566,696,-562,-620,697,698,699,-623]]},{"type":"Polygon","properties":{"name":"Sandwell"},"id":"GB.WM","arcs":[[-699,700,701,702]]},{"type":"Polygon","properties":{"name":"Dudley"},"id":"GB.WM","arcs":[[-701,-698,-619,-626,703]]},{"type":"Polygon","properties":{"name":"Wolverhampton"},"id":"GB.WM","arcs":[[704,-702,-704,-625]]},{"type":"Polygon","properties":{"name":"Walsall"},"id":"GB.WM","arcs":[[-700,-703,-705,-624]]},{"type":"Polygon","properties":{"name":"Solihull"},"id":"GB.WM","arcs":[[705,-563,-697,-565]]},{"type":"Polygon","properties":{"name":"Coventry"},"id":"GB.WM","arcs":[[-706,-564]]},{"type":"Polygon","properties":{"name":"Central Bedfordshire"},"id":"GB.BD","arcs":[[-151,-572,-149,-135,-122,706,-189]]},{"type":"Polygon","properties":{"name":"Bedford"},"id":"GB.BD","arcs":[[-707,-125,-555,-190]]},{"type":"Polygon","properties":{"name":"Reading"},"id":"GB.BK","arcs":[[707,708,-569]]},{"type":"Polygon","properties":{"name":"West Berkshire"},"id":"GB.BK","arcs":[[-709,709,-120,-582,-580,-570]]},{"type":"Polygon","properties":{"name":"Wokingham"},"id":"GB.BK","arcs":[[710,711,-109,-710,-708,-568,-141]]},{"type":"Polygon","properties":{"name":"Bracknell Forest"},"id":"GB.BK","arcs":[[-577,-110,-712,712]]},{"type":"Polygon","properties":{"name":"Royal Borough of Windsor and Maidenhead"},"id":"GB.BK","arcs":[[713,-578,-713,-711,-140]]},{"type":"Polygon","properties":{"name":"Slough"},"id":"GB.BK","arcs":[[-579,-714,-139]]},{"type":"Polygon","properties":{"name":"Barnet"},"id":"GB.EF","arcs":[[-263,-592,-250,-237,-593,-146]]},{"type":"Polygon","properties":{"name":"Cheshire East"},"id":"GB.CH","arcs":[[-689,-687,-217,-631,-632,-629,-634,714,-612,-691]]},{"type":"Polygon","properties":{"name":"Cheshire West and Chester"},"id":"GB.WT","arcs":[[-633,-461,-457,715,-392,716,717,-613,-715]]},{"type":"Polygon","properties":{"name":"Halton"},"id":"GB.WT","arcs":[[-614,-718,718,-649,-657]]},{"type":"MultiPolygon","properties":{"name":"Isles of Scilly"},"id":"GB.IS","arcs":[[[719]],[[720]],[[721]],[[722]],[[723]]]}]}},"arcs":[[[6105,5292],[7,-18],[14,-23],[11,-11],[14,-11],[4,-10],[0,-7],[-6,-9],[-16,-15],[-3,-11],[10,-7],[12,0],[17,0],[36,0],[20,1],[11,10],[12,7],[12,1],[12,-3],[14,-14],[6,-13],[0,-17],[-2,-13],[-6,-25],[-6,-18]],[[6278,5086],[-10,-3],[-7,-3],[7,-15],[-3,-2],[-44,-19],[-15,-17],[-2,-22],[8,-22],[-18,-28],[0,-15],[-14,-15],[-11,4],[-14,18],[-10,5],[-28,3],[-4,-10],[-4,-1],[-26,5],[-8,-2],[-16,-30],[-18,-11],[-3,-20],[-15,-22],[-5,-32],[-11,-8],[-1,-18],[-10,-10],[-8,0],[-4,30],[-8,0],[-5,-14],[-6,-2]],[[5965,4810],[0,6],[8,18],[6,15],[2,21],[0,16],[0,22],[-2,15],[-5,12],[-14,14],[-19,14],[-19,12],[-10,10],[-7,13],[-11,16],[-1,6],[6,7],[16,-2],[19,0],[19,-7],[13,0],[3,8],[0,15],[-3,11],[-7,9],[-5,11],[3,11],[15,9],[15,15],[3,13],[1,18],[-10,25],[-32,11],[-25,15],[-23,8],[-10,8]],[[5891,5205],[3,3],[23,12],[20,13],[6,13],[0,9],[-21,9],[-16,0],[-19,0],[-15,2],[-10,6],[5,11],[17,14],[22,21],[18,28],[8,12]],[[5932,5358],[8,-7],[102,-37],[41,-18],[20,-5],[2,1]],[[6186,5583],[0,-20],[3,-19],[7,-9],[7,3],[16,1],[17,0],[5,-4],[0,-10],[-3,-16],[-7,-12],[-9,-3],[-20,0],[-32,2],[-14,-5],[1,-4],[5,-8]],[[6162,5479],[-8,-2],[-10,0],[-15,0],[-15,7],[-12,12],[-9,5],[-5,-1],[-4,-8],[-8,-7],[-6,-1],[-7,0],[-10,3],[-12,3],[-1,2]],[[6040,5492],[-6,6],[-2,20],[-1,38]],[[6031,5556],[3,0],[38,-17],[18,1],[5,9],[-1,18],[-13,26],[7,8],[19,-5],[32,0],[15,-8],[6,4],[5,10],[10,2],[2,-7],[-1,-11],[5,-4],[5,1]],[[6112,5390],[0,-9],[-3,-10],[-5,-7],[-4,-4],[4,-10],[11,-8],[6,-6],[4,-13],[-1,-15],[-3,-12],[-9,-3],[-7,-1]],[[5932,5358],[0,1],[1,3]],[[5933,5362],[1,3],[17,9],[31,9],[37,22],[17,8]],[[6036,5413],[0,-13],[6,-10],[7,-1],[11,0],[18,2],[13,6],[10,2],[11,-9]],[[6162,5479],[2,-2],[16,-13],[10,-6],[14,0],[12,0],[6,-6],[0,-6],[-9,-13],[0,-13]],[[6213,5420],[-15,-1],[-29,5],[-16,0],[-11,-4],[-2,-6],[5,-12],[-1,-11],[-8,-10],[-15,0],[-8,7],[-1,2]],[[6036,5413],[0,1],[0,11],[1,18],[0,11]],[[6037,5454],[0,4],[0,19],[3,15]],[[5862,5514],[5,-14],[9,-15],[9,-15],[4,-17],[-2,-11],[-13,-8],[-13,0],[-16,0],[-16,2],[-18,1],[-14,3],[-15,7],[-1,1]],[[5781,5448],[-16,11],[-15,1],[-34,0],[-22,-5],[-2,0]],[[5692,5455],[-2,25],[4,25],[9,16],[15,10],[20,7],[12,2],[9,-1],[41,-16],[11,-1],[7,3],[14,-7],[30,-4]],[[5781,5448],[9,-22],[14,-20],[31,-26],[22,-15],[36,-3],[23,1],[17,-1]],[[5891,5205],[-19,-13],[-25,-13],[-5,0],[-6,0]],[[5836,5179],[0,1],[-3,19],[-14,19],[-19,13],[-35,12],[-21,1],[-6,3],[5,9],[0,6],[-38,20],[-21,15],[-12,15],[28,25],[10,19],[-3,31],[-4,11],[-4,8],[-3,9],[-4,39],[0,1]],[[6260,5589],[2,-7],[23,2],[3,-6],[-5,-13],[25,-1],[1,-14],[8,-11],[37,-1],[2,-3],[-2,-3],[-18,-15],[24,-15],[27,-9],[4,-11]],[[6391,5482],[-8,-5],[18,-16],[42,11],[14,-6],[-3,-6],[-15,-4],[-7,-8],[17,-41],[-1,-8],[-10,-14],[1,-4]],[[6439,5381],[-31,-19],[-42,-18],[-23,-10],[-10,2],[-17,11],[-37,27],[-54,33],[-12,12],[0,1]],[[6186,5583],[10,3],[18,16],[42,0],[4,-13]],[[5951,5510],[5,-4],[11,-5],[15,-10],[28,-19],[27,-18]],[[5862,5514],[78,-10],[11,6]],[[5965,4810],[-14,-6],[-32,9],[-8,-2],[-39,-17],[-24,-19],[-2,-11],[4,-20],[16,-8],[2,-6],[-2,-9],[-7,-6],[-46,-11],[-40,0],[-7,-6],[-17,8],[-45,-7],[-7,-6],[-5,-14],[-16,-13],[-7,-2],[-22,9],[-18,0],[-30,-13]],[[5599,4660],[0,2],[-9,18],[-2,10],[0,21],[2,6],[2,8],[12,22],[4,12],[2,19],[5,17],[13,10],[26,14],[42,46],[4,2],[6,2],[1,3],[0,10],[1,4],[15,31],[2,8],[1,9],[-2,20],[1,8],[4,6],[21,22],[12,8],[5,5],[4,9],[5,21],[6,10],[21,16],[43,16],[16,18],[6,25],[-6,22],[-16,16],[-23,6],[13,17]],[[6439,5381],[2,-5],[5,0],[9,9],[14,6],[49,8],[14,-2],[16,-13],[28,-2],[42,-14]],[[6618,5368],[-1,-8],[15,-24],[0,-15],[8,-5],[15,1],[4,-6],[-55,-54],[-1,-10],[6,-4],[1,-6],[-5,-13],[-25,-3],[-7,-8],[15,-20],[1,-11],[10,-5],[2,-7],[-4,-9],[3,-25],[-18,-21],[0,-12],[-14,-38],[22,-25]],[[6590,5040],[-43,-24],[1,-17],[-4,-15],[0,-17],[-23,-10],[-4,-6],[-2,-18],[-17,-3],[-18,19],[-20,10],[-4,9],[0,29],[-23,7],[-17,35],[-36,34],[-34,8],[-51,-1],[-13,8],[-4,-2]],[[5951,5510],[5,3],[-71,12]],[[5885,5525],[-1,3],[-4,14],[-1,18],[0,1],[0,9],[-1,8],[1,2],[1,9],[0,7],[0,6],[1,34],[-1,13]],[[5880,5649],[15,0],[17,-4],[18,-1],[13,-9],[35,-8],[12,-7],[-1,-5],[-26,-11],[-2,-10],[10,-13],[17,-4],[15,-21],[12,-4],[16,4]],[[7533,6701],[-2,-4],[-15,-48],[-4,-18],[2,-17],[12,-8],[2,-8],[-10,-16]],[[7518,6582],[-2,4],[-4,4],[-19,1],[-18,-3],[-28,-5],[-19,-3],[-22,-4],[-19,-3],[-17,-7],[-16,-1],[-10,0],[-8,5],[-4,11],[-1,14],[2,12],[4,6],[16,0],[20,1],[9,12],[5,13],[-4,14],[-7,8],[-9,7],[-2,13],[1,9],[4,6],[7,9],[10,4],[24,1],[15,-1],[11,-8],[10,-9],[9,0],[9,0],[7,5],[6,8],[7,2],[9,0],[8,0],[13,0],[12,-2],[2,-2],[4,-2]],[[7518,6582],[0,-1],[-59,-72],[-20,-33],[-8,-33],[2,-8],[4,-5],[3,-7],[0,-11],[-3,-5],[-12,-12],[-3,-5],[-4,-16],[-9,-10],[-23,-14],[-17,-19],[-15,-22],[-11,-10],[-36,-18],[-11,-7],[-11,-11],[-7,-10]],[[7278,6253],[-6,5],[-13,0],[-18,-1],[-27,25],[-38,4],[-16,8],[-32,37],[1,12],[-4,17],[11,18],[1,11],[-13,7],[-7,18],[-26,15],[-11,16],[-10,7],[-32,0],[-15,14],[-27,10],[-13,-2],[-23,-11],[-63,1],[-22,-7],[-12,-8],[-6,-9],[-13,-44],[-9,-6],[-25,15],[-24,2],[-50,19],[-6,-2],[-2,-19],[-4,-6],[-33,-6],[-18,-12],[-15,1]],[[6658,6382],[-24,1],[-19,-7],[-27,14],[-30,-4],[-8,3],[-5,4],[0,25],[-12,8],[-23,-6],[-25,6],[-16,-9],[-13,-1],[-13,3],[-10,10],[-34,-3]],[[6399,6426],[9,31],[18,16],[5,9],[-2,33],[6,30],[-3,6],[5,9],[37,17]],[[6474,6577],[15,-10],[24,-2],[43,0],[48,0],[33,0],[31,2],[22,4],[15,10],[0,12],[-7,15],[-5,9],[-3,8],[2,13],[7,12],[16,6],[17,6],[15,15],[15,16],[14,16],[15,15],[29,12],[15,7],[19,-3],[17,-5],[14,-2],[9,0],[14,8],[15,20],[12,27],[0,18],[-2,16],[-11,17],[-12,16],[-4,16],[1,28],[12,26],[36,25],[29,15],[24,1],[29,-1],[23,-8],[27,-6],[16,7],[1,15],[-10,16],[-18,20],[-20,15],[-28,44],[0,33],[1,23],[0,7]],[[7029,7131],[41,0],[5,-2],[6,-9],[7,-2],[7,2],[5,3],[5,0],[7,-5],[22,8],[56,-15],[20,1],[10,-12],[5,1],[5,7],[8,4],[12,-1],[30,-12],[5,7],[5,-1],[6,-4],[7,-2],[7,3],[11,9],[6,1],[13,-6],[8,-1],[3,4],[2,5],[5,5],[6,4],[5,2],[14,-2],[29,-14],[13,-3],[16,3],[39,22],[10,2],[72,-2],[0,-4],[4,-7],[6,-9],[5,-5],[8,-1],[11,7],[8,0],[4,-4],[8,-12],[55,-47],[5,-15],[3,-17],[3,-16],[10,-14],[0,-6],[-2,-11],[6,-11],[19,-15],[-9,-1],[-5,-7],[1,-8],[6,-4],[8,-2],[-4,-6],[-15,-10],[-27,-27],[-11,-17],[-2,-12],[-67,-49],[-17,-20],[-40,-80]],[[6474,6577],[3,1],[22,18],[17,1],[18,16],[20,10],[16,16],[36,14],[15,-1],[10,10],[6,13],[-2,9],[7,9],[-23,13],[7,45],[-25,11],[-2,6],[9,11],[18,11],[17,26],[18,12],[4,10],[-9,36],[-26,4],[-38,29],[-52,-8],[-11,-4],[-10,-9],[-36,-3],[-23,-21],[-11,-2],[-4,5],[4,10],[22,22],[-2,14],[5,29],[-1,13],[-4,13],[-16,9],[1,16],[-3,9],[4,6],[0,11],[-13,6],[-5,20],[-11,17],[0,1]],[[6426,7061],[45,26],[38,7],[-4,-10],[-4,-5],[-5,-4],[9,-5],[8,0],[9,3],[10,2],[-14,24],[24,-6],[13,-1],[12,2],[9,5],[11,10],[6,11],[-4,11],[7,9],[5,1],[7,-3],[8,-1],[8,3],[17,8],[8,2],[81,-3],[48,-24],[85,-23],[28,0],[26,6],[40,22],[11,3],[61,0]],[[6436,5624],[8,-11],[3,-7],[6,-2],[12,2],[5,0],[4,-5],[3,-6],[5,-5],[7,-3],[37,7],[14,0],[47,-11]],[[6587,5583],[-5,-5],[-17,-12],[-18,0],[-8,6],[-12,-2],[-24,-24],[-19,-10],[-2,-11],[-33,-9],[-36,-27],[-22,-7]],[[6260,5589],[14,10],[44,13],[63,6],[36,7],[19,-1]],[[6381,5754],[-3,-11],[-7,-22],[-10,-14],[-4,-11],[2,-10],[7,-10],[6,0]],[[6372,5676],[0,-1],[39,-21],[5,-7],[6,-3],[14,-20]],[[5880,5649],[-8,10],[-14,33],[-22,44],[-9,23],[-2,24],[0,1],[0,2],[-1,19],[3,8],[0,-1],[4,13],[7,7],[4,2],[-7,8],[-2,7],[0,3],[14,19],[-36,5],[-9,1],[-5,-1],[-34,-8],[-3,4],[0,1],[1,3],[5,8],[0,4],[-1,3],[-37,18],[-2,6],[17,21],[2,7],[3,7],[21,17],[29,10],[2,12],[0,3],[14,6],[23,0],[17,10]],[[5854,6008],[25,19],[22,7],[23,1],[6,4],[0,8],[5,4],[9,1],[11,-8],[8,1],[51,13],[26,13],[18,-7],[21,-42],[4,-5],[32,9],[38,17],[14,3],[6,-1],[15,-9],[17,-31],[-20,-5],[-14,-9],[-25,4],[0,-60],[-3,-6],[-1,0],[-4,-5],[-16,1],[-3,-7],[-4,0],[4,-1],[0,-15],[8,-6],[-2,-18],[32,-26],[32,-6],[14,-14],[11,-4],[4,0],[5,10],[4,1],[11,-12],[31,-4],[22,-16],[36,-16],[19,-18],[23,4],[3,-2],[1,-18],[5,-5],[3,2]],[[6506,5695],[-12,-6],[3,-6],[8,-3],[0,-5],[-39,-9],[-15,1],[-6,-12],[-11,-9],[-3,-2]],[[6431,5644],[-23,18],[-14,14],[-9,4],[-13,1],[0,-5]],[[6381,5754],[42,21],[7,-4],[9,-17],[7,-3],[38,-2],[6,9],[18,-3],[10,4],[33,-11],[4,-4],[-5,-4],[-52,-20],[4,-20],[4,-5]],[[6658,6382],[2,-27],[8,-23],[6,-6],[10,-21],[0,-18],[0,-16],[7,-21],[6,-12],[20,-23],[17,-20],[10,-6],[19,-4],[20,-4],[13,-3],[17,-9],[5,-8],[1,-11],[11,-10],[16,-2],[13,-6],[0,-8],[-18,-7],[-20,-20],[-16,-35],[-1,-13],[15,-24],[22,-10],[18,-2],[3,-2]],[[6862,6011],[9,-6],[6,-11],[1,-4]],[[6878,5990],[-4,0],[-25,-9],[-22,-14],[-67,-54],[-28,-9],[-28,8],[8,-9],[12,-3],[20,0]],[[6744,5900],[0,-2],[2,-4],[4,-11],[-8,-6],[0,-4],[15,-9],[-1,-7],[-10,-4],[-20,1],[-3,-2],[2,-13],[-5,-4],[-23,0],[-18,-16],[0,-3],[10,-6],[-1,-16],[39,-4],[16,-12],[2,-21],[-24,-10],[-4,-5],[8,-7],[14,-3],[-3,-3],[-11,-3],[-21,5],[-16,-3],[-7,-2],[-4,-16],[-14,-7],[-55,6],[-37,-2],[-14,10],[-11,-3],[-4,-10],[-6,-3],[-30,-6]],[[5854,6008],[-16,4],[-8,7],[0,7],[17,25],[0,7],[-2,2],[-5,5],[-18,4],[-4,5],[0,2],[1,2],[63,24],[13,-6],[7,-4],[4,6],[-16,23],[-8,11],[-4,1],[-17,3],[0,11],[7,7],[-2,14],[-9,2],[-25,-9],[-23,2]],[[5809,6163],[0,20],[4,6],[37,5],[38,15],[-8,15],[3,7],[13,10],[-3,25],[17,8],[5,13],[20,24],[12,-1],[13,-15],[18,-7],[7,0],[28,31],[8,6],[1,3],[8,4],[22,-2],[19,19],[32,7],[34,15],[4,5],[-5,16],[16,14],[9,1],[42,-13],[43,7],[36,-6],[7,3],[4,27],[7,13],[5,4],[28,-18],[13,-3],[40,9],[13,-4]],[[7278,6253],[-3,-5],[-7,-40],[-8,-11],[-8,-9],[-7,-14],[0,-7],[4,-12],[1,-6],[-4,-6],[-12,-10],[-6,-16],[-10,-9],[-61,-34],[-11,-20],[-13,-7],[-25,-10],[-6,-7],[-12,-24],[-6,-2],[-5,2],[-5,4],[-8,2],[-35,-4],[-1,0]],[[7030,6008],[-1,5],[-7,15],[-1,12],[-7,9],[-25,2],[-29,-2],[-26,-6],[-41,-4],[-21,-4],[-7,-12],[-3,-12]],[[7030,6008],[-152,-18]],[[6744,5900],[7,0],[14,3],[27,13],[25,4],[129,52],[7,6],[6,9],[13,7],[16,2],[11,-6],[12,-9],[22,-1],[8,-12],[1,-17],[-4,-16],[-9,-14],[-10,-9],[16,0],[2,-3],[3,-13],[1,-3],[8,-3],[5,0],[5,-2],[4,-7],[59,-3],[15,-6],[22,-16],[5,-3],[23,-16],[0,-6],[-34,-26],[-12,-18],[-15,-6],[-31,-6],[-41,-22],[-15,-3],[-16,2],[-40,16],[-31,1],[-15,-3],[-7,-7],[-5,-9],[-34,-19],[-36,-32],[-11,-5],[-13,-4],[-7,-10],[-9,-30],[-7,-14],[-10,-5],[-45,-2],[-13,-5],[-22,-12],[-26,-9],[-25,-4],[-26,2],[-104,24],[-58,-1],[-24,7],[-23,13],[-1,0]],[[7327,5535],[-3,-6],[0,-1],[-8,-11],[-38,-35],[23,-8],[4,-8],[-1,-5],[-9,2],[-10,-9],[-31,-2],[-10,-10],[-7,7],[-21,-2],[-10,-13],[-12,2],[-8,-12],[-10,-3],[-30,5],[0,8],[-9,6],[-53,-19],[-28,10],[-26,-16]],[[7030,5415],[-16,11],[-46,28],[-73,43],[-17,15],[-3,15],[-1,3]],[[6874,5530],[30,3],[49,17],[15,10],[10,14],[11,12],[17,1],[-4,11],[-2,4],[-3,4],[12,8],[19,18],[13,5],[109,-6],[12,-5],[18,-20],[12,-6],[-6,-15],[-3,-4],[9,-3],[17,2],[9,-5],[3,4],[7,4],[4,4],[9,-8],[27,-14],[24,-7],[35,-23]],[[6863,5530],[0,-1],[0,-9],[-4,-20],[-2,-22],[-31,-1],[-35,-6],[-40,-25],[-57,-30],[-13,-10]],[[6681,5406],[-5,5],[-12,3],[-6,-3]],[[6658,5411],[0,19],[3,42],[-2,8],[-12,5],[-15,5],[-9,12],[-1,27],[0,21],[1,21],[0,4]],[[6623,5575],[28,-6],[31,0],[11,4],[7,0],[6,-8],[11,-7],[118,-8],[4,-3],[12,-13],[4,-3],[8,-1]],[[7030,5415],[-8,-4],[-15,-3],[-20,-23],[-13,-6],[-17,4],[4,18],[-5,8],[-5,0],[-85,-58],[-14,-14],[3,-9],[-2,-7],[-18,-6],[-15,10],[1,15],[-14,24],[-1,14],[-11,19],[-30,-23],[-26,-2],[-14,6],[-4,12],[-25,0],[-15,16]],[[6863,5530],[11,0]],[[6658,5411],[-17,-9],[-8,-9],[-3,-16],[-12,-9]],[[6587,5583],[36,-8]],[[7546,5401],[-30,-9],[-3,-2],[-3,-3],[-3,-7],[-1,-14],[-2,-5],[-3,-4],[-16,-14],[-3,-2],[-11,-4],[-3,-2],[-7,-6],[-6,-4],[-3,-2],[-3,-4],[-2,-7],[-4,-6],[-35,-43],[-5,-4],[-6,-3],[-10,-2],[-25,0],[-8,-2],[-3,-2],[-3,-2],[0,-5],[0,-3],[1,-4],[1,-3],[3,-2],[10,-5],[3,-1],[1,-4],[0,-3],[2,-3],[2,-3],[7,-6],[2,-3],[1,-3],[1,-3],[2,-6],[10,-24],[11,-16],[8,-10],[7,-11],[1,-3],[0,-3],[0,-1],[0,-1],[0,-3],[0,-3],[2,-3],[14,-17],[2,-2],[2,-3],[1,-3],[0,-4],[-1,-4],[-3,-4],[-6,-8],[-8,-7],[-14,-7],[-7,-3],[-19,-3],[-8,-6],[-7,-6],[-19,-7],[-4,-3],[-5,-7],[-2,-5],[-3,-8],[-3,-5],[-5,-4],[-13,-7],[-6,0],[-4,1],[-2,2],[-6,4],[-4,1],[-9,2],[-16,-3],[-7,-2],[-57,-42],[-35,-35],[-9,-6],[-3,-3],[-1,-4],[0,-6],[1,-4],[2,-3],[1,-2],[0,-2],[0,-4],[-2,-7],[-2,-4],[-4,-3],[-8,-3],[-11,-7],[-16,-20]],[[7117,4840],[-8,-10],[-14,-11],[-17,-10],[-29,-11],[-11,-3],[-10,-6],[-18,-21]],[[7010,4768],[-5,22],[-16,9],[-4,9],[4,42],[13,15],[0,12],[-4,5],[-19,1],[-4,5],[5,9],[16,8],[-4,9],[-8,6],[-21,2],[-14,7],[-17,-6],[-17,-12],[-9,8],[-15,-4],[-7,7],[1,11],[-8,13],[-27,21],[0,15],[-4,5],[-17,4],[-22,-6],[-11,12],[-17,8],[-33,-16],[-17,-12],[-12,2],[-3,5],[3,11],[0,22],[14,15],[27,16],[0,6],[-8,3],[-24,1],[-17,8],[-13,-21],[-5,-3],[-43,0],[-21,-7],[-37,5]],[[7327,5535],[6,-4],[28,-12],[104,-16],[6,-3],[4,-7],[1,-9],[1,-6],[5,-3],[14,-5],[12,-11],[38,-58]],[[7928,4193],[-3,8],[-7,7],[-8,1],[-5,-4],[0,-11],[13,-29],[-1,-6],[-8,-2],[-7,6],[-8,21],[-7,7],[-20,2],[4,-13],[-8,-2],[-30,23],[-8,17],[-6,3],[-19,-3],[-4,1],[-4,12],[-13,7],[-13,0]],[[7766,4238],[0,11],[0,15],[1,18],[5,12],[13,3],[15,0],[21,-7],[16,-14],[15,-1],[17,0],[26,1],[21,7],[19,17],[5,1]],[[7940,4301],[0,-2],[10,-12],[-1,-11],[-1,-7],[-16,-9],[-6,-18],[15,-21],[-5,-18],[-8,-10]],[[7834,4562],[11,-6],[4,-6],[1,-14],[11,-15],[8,-8],[2,-14],[3,-12],[6,-3],[20,-3],[22,0],[19,4],[6,9],[-1,21],[6,17],[3,7],[14,4],[10,4],[8,3]],[[7987,4550],[28,-85],[14,-28],[19,-21]],[[8048,4416],[-2,-2],[-29,-11],[-7,-17],[-14,-10],[-5,-31],[-29,-8],[-6,-11]],[[7956,4326],[-6,-11],[-10,-8],[0,-6]],[[7766,4238],[-20,1],[-8,-6],[-15,5],[-12,-2],[0,-13],[-8,-12],[-5,-18],[-24,20],[-8,1],[-9,-10],[0,-12],[-52,-23],[-16,-1],[-33,17],[-25,7],[-35,-11],[-26,-17],[-10,6]],[[7460,4170],[3,15],[-5,12],[-3,39],[-19,3],[-11,19],[-49,32],[-7,14],[-6,23],[12,11],[5,9],[-1,7],[-7,7],[-35,15],[-6,8],[18,33],[14,51]],[[7363,4468],[21,9],[40,-13],[5,4],[8,16],[9,4],[11,-1],[5,10],[12,7],[3,6],[-1,7],[31,-6],[58,32],[47,-18],[4,-9],[6,-1],[25,13],[13,23],[16,18],[1,10]],[[7677,4579],[35,-6],[42,-4],[33,2],[35,-3],[12,-6]],[[8082,4319],[-1,-2],[-3,-3],[-6,-7],[-2,0]],[[8070,4307],[-33,1],[-36,4],[-34,7],[-11,7]],[[8048,4416],[3,-4],[10,-6],[35,-12],[0,-7],[-14,0],[1,-4],[1,-3],[3,-6],[2,-7],[2,-7],[4,-6],[5,-5],[-5,-7],[-6,-5],[-15,-6],[1,-6],[3,-4],[4,-2]],[[8066,4279],[-1,-8],[1,-12],[5,-13],[7,-13],[8,-12],[5,-7]],[[8091,4214],[-14,1],[-22,-5],[-9,-11],[-1,-1]],[[8045,4198],[-15,7],[-12,7],[-5,12],[1,14],[3,13],[5,9],[7,10],[4,6],[6,5],[7,0],[11,0],[9,-2]],[[8350,4262],[-6,-9],[-17,-6],[-10,-10],[-5,-13],[0,-26],[-28,8],[-33,-8],[-15,10],[-14,2],[-34,-7],[-29,12],[-26,-7],[-42,6]],[[8066,4279],[1,19],[3,9]],[[8082,4319],[1,0],[6,0],[2,1],[1,3],[1,3],[3,-1],[1,-2],[3,-5],[2,-4],[-2,-2],[8,1],[4,5],[6,26],[11,-13],[11,-7],[13,-4],[27,-3],[31,-17],[133,-34],[6,-4]],[[8045,4198],[-49,-22],[-5,4],[-18,0],[-5,20],[-8,4],[-4,-4],[-13,3],[-5,-13],[-10,3]],[[7912,4730],[-8,-3],[-16,-16],[-14,-1],[-29,3],[-17,8],[-41,7]],[[7787,4728],[-25,4],[-6,-5],[-2,-10],[13,-6],[0,-7],[-11,-8],[-20,-4],[-14,-23]],[[7722,4669],[-9,-6],[-2,-11],[-17,-6],[-4,-5],[-14,-39],[-19,-9],[1,-7],[19,-7]],[[7363,4468],[-37,25],[-24,34],[-8,-2],[-12,-11],[-45,-26],[-22,3],[-19,14],[-4,12],[4,9],[-2,11],[-14,13],[-4,9],[16,9],[7,21],[11,7],[-10,13],[-5,19],[-17,8],[15,17],[1,18],[4,6],[51,25],[-9,17],[3,7],[-3,6],[6,6],[-12,7],[-28,-6],[-5,9],[-21,12],[-6,19],[-28,8],[-9,10],[-15,38],[-5,5]],[[7546,5401],[8,-14],[85,-87],[10,-21],[6,-12],[14,-8],[4,-6],[3,-7],[3,-3],[6,2],[4,4],[3,5],[2,2],[8,-1],[8,-4],[8,-7],[6,-13],[-14,0],[0,-6],[8,-4],[23,6],[14,-2],[44,-25],[0,-7],[-4,-6],[2,-6],[4,-7],[7,-6],[-9,-6],[0,-6],[6,-3],[12,-9],[0,-7],[-5,-8],[3,-4],[6,-3],[5,-4],[3,-11],[2,-61],[-1,-9],[-3,-15],[-1,-5],[0,-8],[4,-19],[16,-24],[2,-16],[-1,-4],[-1,-4],[-2,-4],[-3,-4],[-3,-7],[2,-6],[2,-6],[2,-6],[3,-10],[8,-11],[15,-13],[-5,-12],[3,-5],[6,-5],[5,-9],[-2,-9],[-5,-8],[-3,-8],[3,-10],[11,-14],[3,-6],[2,-20],[6,-19],[3,-6],[2,-2],[8,-3],[3,-1],[1,-3],[1,-5]],[[8186,1342],[23,7],[20,-5],[30,3],[21,-8],[22,-1]],[[8302,1338],[22,-2],[13,-9],[22,-7]],[[8359,1320],[23,-36],[3,-20],[-4,-23],[-11,-12],[-33,7],[-11,-2],[-9,-10],[-7,-20],[11,-19],[0,-28],[21,-5],[7,-21],[22,-11],[1,-7],[-6,-14]],[[8366,1099],[-13,-7],[-9,-19],[-26,3],[-6,-3],[-16,-15],[-2,-14],[-16,-17],[-2,-15],[-24,-45],[0,-10],[6,-11],[-20,-26],[1,-7],[18,-18],[0,-14],[-5,-9]],[[8252,872],[-6,3],[-20,4],[-16,0]],[[8210,879],[-2,3],[-19,5],[-18,2],[-12,0],[-9,-8]],[[8150,881],[-40,-3],[-10,-2],[23,-17],[4,-6],[2,-18],[-3,-9],[-8,-7],[-9,0],[-12,4],[-10,6],[-5,6],[-4,8],[-21,10],[-15,12],[-21,7],[-9,4],[-11,12]],[[8001,888],[3,12],[4,19],[1,16],[-2,11],[-19,15],[-20,7],[-19,0],[-17,-4],[-10,-6],[-4,-8],[-2,-12]],[[7916,938],[-11,6],[0,-6],[7,-3],[12,-7],[8,-1],[16,-17],[50,-51],[6,-12],[-2,-11],[-15,-5],[-41,-3],[-10,-3],[5,-3],[4,-3],[0,-6],[-29,-5],[-17,-5],[-7,-6],[-3,0],[-21,3],[-21,-34],[-2,-4],[-1,0],[-13,3],[-13,9],[-45,7],[-1,0]],[[7772,781],[-3,13],[-37,0],[2,20],[-2,2],[-34,-9],[-8,13],[-6,18],[1,15],[7,12],[-6,33],[-18,-2],[-4,23],[18,13],[4,22],[-20,4],[-17,-10],[-11,2],[-18,17],[-27,41]],[[7593,1008],[15,10],[37,6],[3,-2],[-3,-7],[7,-2],[7,12],[6,2],[18,-15],[28,-6],[17,-8],[28,-3],[17,-18],[10,-4],[29,9],[7,15],[-14,16],[4,10],[12,11],[-4,8],[-12,7],[1,19],[-7,29],[6,20],[-5,8],[-15,8],[3,22],[-5,20],[-19,30],[-7,29],[10,3],[34,-5],[8,4],[10,12],[13,5],[27,-11],[7,6],[-8,22],[13,24],[-5,25],[26,2]],[[7892,1321],[35,2],[4,6],[-6,11],[24,16],[99,-1],[81,-13],[6,2],[0,13],[22,4],[11,-2],[6,-11],[12,-6]],[[8001,888],[-13,14],[-72,36]],[[8483,2018],[-29,-20],[-3,-2],[5,-9],[-16,-6],[-12,-15],[13,-2],[5,-8],[-3,-22],[-12,-15],[8,-24],[-10,-12]],[[8429,1883],[-19,0],[-24,1],[-36,25],[-38,31],[-19,21]],[[8293,1961],[7,6],[0,17],[14,2],[5,3],[-1,7],[-15,12],[-10,16],[-7,3],[0,9],[34,10],[8,10],[0,7],[4,6],[20,-5],[9,14],[21,0],[48,28]],[[8430,2106],[22,-16],[-7,-26],[28,-26],[10,-20]],[[7785,1916],[-3,-23],[25,-13],[4,-5],[0,-7],[-22,-20],[6,-15],[-13,-9],[-12,-26],[-2,-53],[-20,-20],[11,-11],[8,-29],[3,-24],[18,-17],[2,-6],[-3,-5],[-22,4]],[[7765,1637],[-11,2],[-16,-16],[-16,-4]],[[7722,1619],[-5,-1],[-13,2],[-12,31],[-6,4],[-4,-5],[-3,-21],[-11,-12],[-21,15],[-14,0],[0,-10],[12,-14],[-4,-5],[-13,10],[-29,10],[-6,-3],[1,-18],[-13,-5],[-13,10],[-45,17],[-28,-40],[-31,-28],[-28,8],[-31,-18],[-20,-1]],[[7385,1545],[-10,10],[0,7],[9,15],[-9,9],[-14,1],[5,-16],[-28,2],[-14,-12],[-8,-1],[-4,8],[4,14],[2,14],[-3,2],[-42,11],[-22,-8],[-6,19],[-29,11],[-2,1]],[[7214,1632],[24,22],[22,26],[11,6],[28,8],[10,9],[5,10],[-2,10],[-9,9],[-3,-17],[-12,-10],[-14,-4],[-13,-1],[-12,-4],[-9,-10],[-8,-12],[-9,-12],[-39,-22],[-6,-6],[-6,-9],[-42,-44]],[[7130,1581],[-5,19],[0,9],[-3,6],[-4,4],[0,3],[2,2],[10,4],[2,3],[0,3],[-1,5],[-2,5],[-5,16],[-5,12],[-1,5],[0,3],[4,6],[3,4],[2,7],[0,5],[-4,8],[-3,6],[0,7],[1,5],[2,8],[14,19],[5,13],[-1,-1]],[[7141,1767],[0,1],[1,0],[3,23],[4,6],[4,0],[6,-15],[15,8],[8,-1],[4,8],[18,7],[20,-3],[9,20],[23,2],[23,13],[3,6],[-2,11],[-14,13],[-3,17],[-14,9],[2,15],[7,11],[-3,10],[7,20],[13,-6],[8,-17],[10,-4],[13,4],[16,16],[11,2]],[[7333,1943],[6,1],[15,-21],[7,-17],[37,-10],[11,1],[17,25],[21,-3],[10,7],[-11,11],[4,24],[4,6],[32,2],[-18,-33],[8,-10],[16,11],[22,0],[26,-7],[39,24],[19,4],[15,-3],[9,4],[17,-3],[22,-19],[8,1],[4,10],[-1,14],[-14,17],[-10,4],[1,4],[13,10],[19,-4],[23,27],[13,7]],[[7717,2027],[13,-15],[14,-4],[6,-18],[21,-31],[11,-4],[23,3],[6,-4],[-14,-23],[-12,-11],[0,-4]],[[8429,1883],[-9,-11],[-11,-30],[17,-6],[23,-19],[15,4],[27,-23],[6,-15],[11,-11],[1,-7]],[[8509,1765],[-12,3],[-18,-19],[-22,8],[-26,1],[-15,16],[3,7],[-2,6],[-17,6],[-7,-1],[-11,-19],[13,-17],[8,-1],[12,-11],[3,-9],[0,-15],[8,-10],[19,-9],[28,0],[15,-15],[16,6],[9,-4],[2,-6],[-16,-10],[-2,-8],[8,-13],[1,-17],[20,4],[6,-4],[0,-7],[-17,-24],[-1,-15],[4,-16],[17,-15]],[[8535,1557],[14,-37],[-9,-51],[-8,-15]],[[8532,1454],[-10,-2]],[[8522,1452],[-5,11],[1,11],[-3,6],[-22,-2],[-2,16],[-5,5],[-7,-1],[-4,-5],[-20,9],[-18,-4],[-4,-6],[5,-15],[4,-8]],[[8442,1469],[-16,-2],[-11,2],[-15,12],[1,9],[7,11],[2,18],[-7,9],[-14,4],[-16,-1],[-11,-6],[-9,1],[-47,-13]],[[8306,1513],[-14,3],[-9,5],[-3,-3]],[[8280,1518],[-29,21],[2,9],[11,8],[1,7],[-4,5],[-11,-2],[-7,17],[9,14],[-8,9],[11,4],[3,17],[6,2],[23,-5],[1,3],[-5,15],[4,15],[-5,15],[-18,22],[-35,14],[-16,-6],[-18,2],[-14,-8],[-17,7],[-9,20],[-18,6],[-3,31],[-10,13],[2,6],[6,3],[30,-12],[14,8],[-1,11],[-9,16],[0,14],[-9,9],[-3,9],[4,20],[18,18],[0,4],[-17,0],[-5,8],[4,14],[15,23],[-4,3],[-32,12]],[[8137,1939],[-22,7],[15,16],[14,8],[39,9],[9,10],[21,-1],[26,10],[6,-2],[26,-49],[7,1],[15,13]],[[8906,1932],[1,-17],[18,-9],[2,-20],[8,-17],[3,-24],[7,-21],[31,6],[-2,-10],[7,-6],[1,-6],[-16,-16],[0,-21],[11,-8],[-18,-10],[-3,-14],[-32,-12],[-47,-8],[-23,-32],[-8,-51]],[[8846,1636],[-88,11],[-7,-12],[-4,-5]],[[8747,1630],[-5,-4],[-18,-4],[-11,-7],[-7,13],[-6,3],[-5,-4],[-6,-21],[-25,-6]],[[8664,1600],[-18,-3],[-34,-18],[-17,0]],[[8595,1579],[-21,0],[-17,-4],[-7,6],[-8,-1],[-3,-17],[-4,-6]],[[8509,1765],[12,-15],[4,-1],[11,12],[6,18],[11,11],[8,1]],[[8561,1791],[22,-4],[25,-17],[10,2],[4,9],[12,7],[3,6],[-8,14],[-1,14],[-12,10],[-3,14],[-8,12]],[[8605,1858],[-9,13],[0,18],[8,15],[7,6],[2,-20],[3,-6],[4,0],[11,12],[-5,11],[3,6],[23,2],[14,9],[15,-12],[8,-1],[11,16],[24,12],[-3,19],[13,15],[17,8],[8,13]],[[8759,1994],[8,-4],[2,-6],[-3,-14],[11,-8],[1,-10],[5,-4],[27,13],[25,6],[11,10],[8,-2],[33,-5],[19,-38]],[[7373,1315],[-36,-23],[-39,-1],[-11,-15],[-23,-9],[-19,3],[-4,12],[-30,10],[-17,-4],[-16,-12],[-19,0],[-9,5],[-3,10],[-15,3],[-4,9],[-29,7]],[[7099,1310],[1,6],[-2,15],[4,10],[5,0],[7,-8],[7,-3],[7,0],[9,2],[5,5],[6,17],[3,13]],[[7151,1367],[17,-2],[29,0],[14,12],[8,14],[3,9]],[[7222,1400],[13,-12],[19,-1],[21,0],[28,-1],[47,11],[29,5]],[[7379,1402],[2,-20],[-6,-12],[4,-12],[-34,-23],[4,-4],[19,-2],[5,-14]],[[7151,1367],[1,5],[1,11],[0,16],[0,11],[0,12],[-9,11],[-16,11],[-11,5],[-13,7],[-11,11],[-4,4]],[[7089,1471],[8,3],[13,12],[11,17]],[[7121,1503],[2,-3],[6,-7],[20,-11],[24,-10],[18,-9],[16,-5],[11,-2],[7,-7],[0,-10],[0,-17],[-1,-18],[-2,-4]],[[7099,1310],[-11,3],[-53,4],[-4,-5],[2,-3],[17,-14],[2,-2],[-2,-4],[-31,-2],[-27,6],[-3,-13],[-4,-1],[-26,12],[-18,-8],[-12,3],[-1,17],[-7,5],[-2,3],[0,1]],[[6919,1312],[2,8],[1,14],[5,9],[9,8],[4,9],[-10,9],[14,13],[21,-4],[24,21],[43,51],[12,8],[11,6],[13,4],[15,1],[6,2]],[[7385,1545],[6,-9],[0,-19],[11,-26],[-23,-8],[-21,-14],[-5,-9],[6,-4],[16,1],[3,-6],[-4,-14],[5,-35]],[[7121,1503],[46,69],[6,4],[6,2],[6,4],[2,9],[2,7],[3,8],[5,8],[4,5],[13,13]],[[7373,1315],[6,1],[9,-9],[-5,-9],[2,-10],[18,-10],[5,-19],[-11,-18],[-9,-32],[-53,-83],[-2,-12],[3,-9],[16,-11]],[[7352,1094],[-8,-17],[7,-20],[-26,-24],[-5,-9],[1,-7],[20,-8],[1,-6],[-41,-16],[-20,4],[-3,-1],[-3,-15],[-7,-1],[-12,10],[-16,30],[-30,6],[-2,-2],[2,-10],[-5,-9],[-7,-2],[-9,6],[-16,-6],[3,-18],[-7,-11],[0,-19],[-7,-12],[5,-19],[-4,-4],[-25,1],[-40,-17],[-28,-1],[-20,-11],[-12,6],[-10,-8],[-63,-11],[-18,-17]],[[6947,856],[-9,26],[-10,9],[-10,-2],[-6,3],[-18,-9],[2,15],[-14,9],[3,19],[-2,6],[-28,2],[-37,-10],[-20,16],[14,31],[-42,-4],[-30,3],[-34,29],[-32,2],[-2,25],[-4,8],[-13,2],[-14,9],[-15,-3],[-20,9],[-21,-5],[-4,-4],[-2,-12],[-7,-5],[-46,4],[-5,12],[8,13],[4,14],[-5,8],[-26,-1],[-27,18],[-24,1],[-23,22],[-15,4],[-25,16],[-8,12],[-1,27],[4,5],[33,-4],[29,5],[5,24],[-2,15],[3,8],[1,2],[1,6]],[[6453,1236],[47,-11],[52,1],[81,-16],[19,-17],[13,-5],[74,3],[46,13],[23,3],[43,-2],[25,3],[19,11],[5,-6],[-9,-13],[9,-6],[11,19],[2,6],[1,12],[-1,6],[-3,5],[-2,8],[1,35],[-2,17],[-7,11],[12,-4],[7,3]],[[5838,1169],[-5,-5],[-5,7],[-1,12],[3,11],[3,2],[3,-7],[1,-3],[1,-6],[0,-11]],[[6947,856],[17,-12],[21,-3],[5,-8],[-42,-24],[9,-8],[-10,-25],[2,-8]],[[6949,768],[-11,-2],[-23,-14],[-15,-1],[-25,6],[-7,-2],[-15,-11],[-3,-2],[-11,-8],[-6,-3],[-7,1],[-13,5],[-7,1],[-12,-2],[-22,-9],[-26,-6],[-8,-9],[-6,-12],[-9,-12],[-47,-19],[-15,1],[-11,3],[-9,7],[-8,14],[-8,22],[-3,3],[-1,1],[-2,2],[-2,2],[-4,1],[-2,-2],[-1,-4],[1,-4],[8,-9],[9,-31],[5,-12],[-11,-10],[-10,-13],[-10,-15],[-8,-19],[-8,-25],[1,-11]],[[6587,570],[-3,0],[-13,1],[-18,0],[-19,0],[-15,-10],[-12,-15],[-9,-17],[-2,-15],[-2,-13],[8,-11],[11,-13],[17,-6],[20,-11],[24,-9],[4,-2]],[[6578,449],[-1,-1],[-4,-23],[-8,-5],[-10,3],[-10,8],[-5,-20],[-14,-8],[-14,-3],[-7,-9],[-3,-15],[-7,-19],[-4,-22],[5,-23],[-10,-4],[-26,-7],[-11,-1],[-14,3],[-12,6],[-10,1],[-10,-10],[-24,20],[-37,42],[-43,35],[-7,3],[-6,-1],[-16,-9],[-7,-2],[-3,-2],[-9,-9],[-5,-2],[-7,2],[-7,3],[-10,8],[1,4],[3,8],[-15,4],[-14,9],[-5,11]],[[6192,424],[10,11],[15,5],[15,8],[10,4],[1,5],[0,5],[-3,8],[-12,10],[-13,8],[-16,9],[-13,6],[-10,0],[-9,0],[-9,-7],[-10,-1],[-1,0],[-1,0]],[[6146,495],[2,5],[9,12],[7,13],[-13,-5],[-7,0],[-7,5],[-2,-7]],[[6135,518],[-6,12],[-7,0],[-4,-7],[-4,5],[4,7],[7,13],[1,9],[18,0],[5,4],[0,7],[-14,5],[-3,13],[-5,7],[-35,8],[-2,21],[-7,13],[-11,7],[4,35],[-26,15],[-7,33],[-9,13],[-1,24],[-10,21],[0,20],[-11,6],[-8,-10],[-4,1],[-18,17],[-21,1],[-8,5],[3,6],[20,6],[5,16],[2,22],[11,7],[3,6],[-17,34],[-8,9],[-1,17],[-58,2]],[[5913,948],[2,15],[5,7],[9,23],[-3,7],[-2,13],[-1,13],[4,6],[57,0],[7,-2],[14,-9],[6,-2],[38,-4],[13,4],[10,6],[43,44],[4,5],[3,5],[4,5],[7,4],[-5,9],[-7,25],[-2,6],[-2,6],[-11,15],[-4,7],[21,-1],[5,1],[4,10],[-1,10],[-4,8],[-8,4],[0,6],[50,17],[118,10],[24,8],[12,2],[47,0],[14,3],[21,9],[11,1],[37,-8]],[[7691,766],[-24,4],[-14,-1],[-13,-3],[-13,-6],[0,-1]],[[7627,759],[-5,2],[-11,2],[-4,6],[0,12],[4,8],[1,1]],[[7612,790],[3,3],[6,0],[11,0],[12,-1],[14,-4],[21,-8],[12,-14]],[[7772,781],[-13,0],[-14,-4],[-25,-11],[-12,-3],[-17,3]],[[7612,790],[-5,7],[-9,7],[-12,4],[-14,0],[-8,0],[-8,-6],[-2,-8],[-5,-12],[-2,-11],[-4,-3]],[[7543,768],[-5,11],[-3,2],[-6,-5],[-22,-32],[8,1],[8,2],[7,4],[7,6],[14,-23],[8,-6],[12,-3],[10,0],[10,-2],[4,-7],[-4,-15],[9,-6],[4,-1],[-23,-25],[2,-13],[-12,-6],[-53,-1],[-11,3],[-48,20],[-120,12],[-23,13],[-13,-2],[-25,-7],[-7,-9],[-8,-20],[-4,-19],[6,-9],[16,-5],[2,-11],[-7,-15],[-9,-12],[-4,0],[0,34],[-15,23],[-136,93],[-111,38],[-14,0],[-38,-8]],[[7352,1094],[22,-3],[15,-7],[17,-1],[9,-5],[20,-20],[32,-52],[14,-5],[6,-14],[9,-9],[26,4],[17,10],[24,6],[17,14],[13,-4]],[[7627,759],[-11,-8],[-10,-10],[-7,-5],[-3,7],[-1,9],[-2,5],[-25,6],[-17,-1],[-5,1],[-2,3],[-1,2]],[[8965,2591],[-10,-50],[26,-8],[3,-10],[-11,-12],[0,-6],[40,-26],[-1,-4],[-16,-12],[-2,-11],[7,-10],[-6,-16],[3,-20],[8,-6],[-1,-8],[12,-17],[6,0],[15,11],[28,3],[22,-11],[1,-7],[22,-26],[32,-21]],[[9143,2324],[-35,-22],[-3,-5],[1,-11],[19,-31],[17,-15],[1,-7],[-9,-14],[0,-6],[25,-2],[25,-24],[0,-6],[-10,-9],[-42,-10],[-31,21],[0,7],[-10,5],[-11,-30],[27,-30],[12,0],[11,12],[14,-3],[9,5],[12,-11],[15,0],[7,-9],[1,-7],[-12,-30],[0,-15],[-9,-3],[-15,6],[-5,-4],[-14,-14],[-3,-14],[-19,-23],[7,-41]],[[9118,1984],[-10,-7],[5,-8],[-6,-6],[-17,7],[-26,28],[-12,7],[-13,3],[-20,-8],[-32,5],[-8,-5],[0,-18],[-11,-8],[-24,-6],[-16,13],[-6,-1],[2,-25],[-18,-23]],[[8759,1994],[10,47],[-1,11],[-24,-4],[-30,3],[-3,3],[9,13],[-26,10],[-1,2],[9,9],[-1,6],[-11,11]],[[8690,2105],[-25,10],[-1,20],[-25,4],[-9,-4],[-6,2],[-9,14],[-1,23],[-31,10],[-7,17],[-19,11]],[[8557,2212],[-2,13],[-15,23],[0,16],[38,15],[6,12],[22,15],[28,32],[3,8],[-8,31],[-39,20],[6,23],[-11,12],[1,9]],[[8586,2441],[10,-1],[11,-12],[16,-17],[19,-18],[26,-3],[10,11],[21,15],[15,18],[14,4],[35,19],[34,6],[16,1],[5,3],[4,9],[0,18],[0,36]],[[8822,2530],[32,-9],[20,0],[11,8],[6,13],[-3,27],[5,5],[24,2],[33,16],[15,-1]],[[8433,2612],[-20,-13],[-30,-16],[-35,3],[-15,-10],[0,-18],[3,-14],[-1,-16],[0,-32],[1,-23],[8,-27],[15,-30],[15,-18],[8,-6]],[[8382,2392],[-3,-2],[-18,-4],[-18,6],[-27,-3],[-20,5],[-5,-3],[-15,-29],[15,-10],[-9,-14],[-9,0],[-25,13],[-17,2],[-46,-17],[-2,-3],[3,-5],[7,-3],[-15,-28],[-36,20],[-22,-19],[-14,-23],[-20,3]],[[8086,2278],[-16,31],[-19,10],[-34,48],[-66,31],[-5,12],[-9,8],[-50,20],[-15,16],[-18,6],[2,18],[-10,19],[14,8],[2,10],[-30,33]],[[7832,2548],[-2,7]],[[7830,2555],[31,19],[2,8],[-7,17],[1,11],[5,4],[38,-1],[13,4],[3,2],[-2,10],[17,16],[20,6],[5,15],[13,19],[-2,3],[21,17],[24,12],[25,-1]],[[8037,2716],[-3,-39],[5,-18],[22,-19],[24,-6],[14,13],[22,5],[21,15],[20,3],[11,-7],[47,4],[5,4],[2,12],[16,7],[13,15],[-2,9],[1,2],[19,5],[30,24],[19,33],[1,11],[18,14],[16,4]],[[8358,2807],[1,-16],[11,-8],[2,-6],[-12,-31],[7,-11],[-1,-11],[20,-4],[9,-16],[12,-29],[9,-9],[8,-35],[9,-19]],[[8128,2446],[37,27],[5,25],[-9,23],[-31,7],[-26,0],[-13,-16],[0,-18],[8,-39],[29,-9]],[[8662,3516],[-6,1],[-81,-23],[-12,0]],[[8563,3494],[1,11],[2,20],[12,23],[12,7],[14,6],[17,1],[12,-2],[12,-9],[9,-11],[6,-13],[2,-8],[0,-3]],[[8868,3321],[-3,-2],[-2,-1],[-9,-5],[-16,-3],[-13,3],[-9,-6],[-22,-44],[1,-6],[12,-11],[-19,-14],[-8,-1],[-15,13],[-3,9],[-11,5],[-4,8],[-17,12],[5,21],[-9,32],[18,20],[-1,6],[-24,1],[-19,22],[-29,15]],[[8671,3395],[5,10],[18,3],[28,7],[3,1]],[[8725,3416],[7,-8],[29,-13],[19,-20],[12,-7],[22,-2],[10,-4],[30,-32],[14,-9]],[[8671,3395],[-3,2],[-3,-6],[1,-17],[-24,-23],[-16,-2],[-42,9],[-39,-25],[1,-4],[49,-2],[8,-6],[0,-8],[-7,-6],[-39,-5],[-8,-16],[4,-9],[-1,-4],[-27,-10],[-39,-10],[-23,2],[-6,3],[-5,8],[8,21],[0,11],[-5,5],[-80,8],[-5,-25],[-12,-11],[-20,-20]],[[8338,3255],[-70,5],[-3,2],[12,6],[1,4],[-19,15]],[[8259,3287],[-15,28],[18,13],[22,-4],[6,2],[-1,14],[-11,8],[-2,9],[-7,6],[15,9],[8,-2],[5,3],[4,15],[-4,13]],[[8297,3401],[11,1],[23,20],[27,20],[27,17],[14,11],[2,0],[0,3]],[[8401,3473],[5,-4],[10,14],[17,7],[20,1],[15,-3],[26,-16],[7,-6],[10,-6],[10,3],[18,12],[116,19],[18,-7],[12,-18],[40,-53]],[[7928,2698],[-18,1],[-23,4],[-33,26],[5,20],[11,15],[12,15],[10,6],[22,-2],[20,-11],[13,-12],[3,-16],[-5,-19],[-10,-17],[-7,-10]],[[7679,3313],[13,-18],[2,-17],[4,-9],[36,-25],[-4,-17],[2,-10],[21,-7],[7,-15],[10,0],[19,-9],[0,-7],[-5,-9],[2,-7],[38,-13],[7,-7],[-1,-3],[-18,-11],[-3,-6],[3,-2],[15,-3],[11,2],[25,-14],[47,16],[18,15],[24,2]],[[7952,3139],[7,-4],[2,-13],[14,-6],[17,-1],[7,3],[7,10],[16,3],[6,-3],[-3,-13],[13,-1],[12,-7],[43,2]],[[8093,3109],[10,-6],[-2,-12],[2,-10],[-6,-11],[-12,-7],[-5,-9],[4,-21],[-3,-21],[4,-13],[-1,-4],[-26,-5],[-9,-10],[-21,3],[-21,-11],[-2,-10],[13,-43],[-5,-9],[-14,-9],[-5,-13],[5,-15],[0,-19],[24,-25],[1,-36],[9,-25],[-1,-18],[25,-17],[-8,-14],[-12,-3]],[[7830,2555],[-11,0],[-5,8],[-9,-9],[-12,1],[-4,20],[-23,7],[-12,10],[18,30],[28,12],[9,24],[16,12],[-11,18],[-15,9],[-58,4],[-10,5],[-12,14],[-21,1],[-8,6],[-16,2],[-2,13],[-9,13],[1,18],[10,1],[5,4],[3,15],[0,14],[35,19],[8,16],[-1,20],[-11,9],[-3,9],[-5,27],[3,17],[-18,26],[0,21],[-3,7],[-13,13],[-21,12],[-49,17],[-13,17],[-16,-6]],[[7575,3031],[4,21],[-13,10],[-3,21],[-1,65],[-2,11],[-12,14],[1,7]],[[7549,3180],[8,3],[15,22],[-6,8],[-13,5]],[[7553,3218],[-1,7],[2,7],[18,15],[3,23]],[[7575,3270],[9,23],[20,1],[9,5],[6,18],[8,11]],[[7627,3328],[17,-1],[35,-14]],[[8961,1474],[-11,5],[-13,-1],[-5,-1]],[[8932,1477],[-16,-5]],[[8916,1472],[2,14],[0,3],[0,1],[0,1],[-2,3],[0,1],[-9,3],[-1,2],[-3,5],[-1,2],[0,6]],[[8902,1513],[11,4],[1,0],[4,-1],[1,0],[2,2],[0,1],[1,1],[3,1],[6,0],[3,0],[1,1],[1,1],[0,1],[1,3],[4,14],[2,16],[0,1],[1,2],[8,4]],[[8952,1564],[-2,-9],[0,-3],[-1,-1],[0,-2],[1,-1],[3,-5],[1,-6],[3,-5],[1,-1],[1,-1],[2,0],[11,5],[1,0],[0,-1],[1,0],[0,-1],[0,-1],[0,-2],[1,-1],[3,-4],[1,-1],[0,-1],[0,-3],[-1,-1],[-14,-22],[-1,-2],[0,-1],[-2,-5],[0,-15]],[[8961,1474],[2,0],[12,-15],[2,-1],[11,2],[11,4]],[[8999,1464],[-4,-3],[-1,-7],[4,-5]],[[8998,1449],[-8,-14],[-19,-18],[-13,-18],[3,-17]],[[8961,1382],[-18,12],[-19,2],[-10,6],[-8,10]],[[8906,1412],[0,1],[5,9],[1,2],[0,6],[-2,9],[0,3],[1,1],[0,1],[3,4],[2,1],[14,2],[1,1],[1,1],[0,1],[-1,8],[1,11],[0,4]],[[8721,1521],[15,-16],[2,-5]],[[8738,1500],[-3,-3],[-1,-1],[-1,0],[-1,-1],[-5,2],[-2,2],[-2,1],[-1,0],[-1,-1],[-1,-2],[-3,-3]],[[8717,1494],[-4,2],[-2,1],[-2,0],[-3,1],[-5,0]],[[8701,1498],[-25,0],[0,1],[-1,0],[-1,4],[-3,1],[-8,-3],[-1,0],[-1,1],[0,1],[-1,0],[0,8],[-1,1],[0,1],[-3,3],[-13,3]],[[8643,1519],[1,6],[1,1],[0,5],[1,2],[1,1],[3,1],[0,1],[1,1],[-1,2],[1,2],[0,1],[1,1],[19,6],[1,1],[1,1],[0,1],[-2,2],[0,1],[1,1],[9,10]],[[8681,1566],[14,-15],[0,-2],[1,0],[0,-4],[0,-4],[2,-3],[3,-4],[1,0],[1,0],[2,2],[1,0],[1,0],[1,-1],[13,-14]],[[8961,1382],[2,-9],[-9,-31],[-16,-13],[-7,-15],[-15,-12],[-2,-21],[-16,-5],[-9,7]],[[8889,1283],[-4,4],[-17,-5],[-4,27],[-2,2]],[[8862,1311],[-21,44],[-11,13],[-13,9],[-12,17],[-1,2]],[[8804,1396],[0,1],[0,1],[1,0],[0,1],[0,1],[0,1]],[[8805,1401],[1,0],[1,1],[1,0],[1,0],[1,0],[1,0]],[[8811,1402],[31,-2],[12,-7],[2,0],[2,1],[1,1],[5,6],[3,2],[11,-3],[1,0],[2,1],[1,1],[0,2],[0,1],[-1,2],[-11,11]],[[8870,1418],[8,1],[3,-1],[10,-8],[3,-5],[1,-1],[1,0],[1,0],[1,0],[3,2],[5,6]],[[8769,1533],[1,-3],[1,-4],[1,-3],[7,-8],[3,-8],[0,-1],[0,-1],[0,-2],[0,-3],[0,-1],[0,-1],[4,-2],[1,0]],[[8787,1496],[1,-1],[0,-3],[1,-1],[2,-2],[0,-6]],[[8791,1483],[-3,-1],[-4,-3]],[[8784,1479],[-3,-3]],[[8781,1476],[-2,6],[-2,0],[-1,0],[-13,12],[-2,5],[-1,2],[-1,1],[-3,1],[-12,0],[-6,-3]],[[8721,1521],[13,2],[2,3],[2,3],[3,3],[7,3]],[[8748,1535],[9,0],[12,-2]],[[8862,1311],[-8,8],[-18,1],[-13,-14],[-12,1],[-12,-5],[-11,-17],[-17,-3],[-15,13],[-8,15]],[[8748,1310],[14,0],[1,1],[1,1],[0,1],[1,0],[0,11],[0,2],[2,3],[2,2],[3,1],[7,0],[2,0],[0,1],[1,3],[0,5],[0,3],[0,3],[-4,11],[0,2],[-1,2],[-8,9]],[[8769,1371],[2,3],[3,0],[1,1],[1,2],[1,0],[0,1],[0,1],[0,1],[-4,5],[-1,5]],[[8772,1390],[11,8],[4,1],[17,-3]],[[8701,1498],[0,-15],[0,-4],[-2,-5],[-3,-5]],[[8696,1469],[-6,-2],[-3,0],[-9,4],[-12,-2],[-6,-4],[-1,0],[-25,3],[-17,-4],[-17,4]],[[8600,1468],[13,19],[1,3],[0,1],[0,1],[-1,1],[0,1],[-1,1],[-3,1],[-13,1],[-3,1],[-1,1],[-1,1],[0,1],[-1,1],[1,1],[0,1],[1,0],[7,2],[17,12]],[[8616,1518],[27,1]],[[8846,1636],[3,-10],[-4,-15],[7,-3]],[[8852,1608],[-6,-9],[-1,-1],[0,-1],[-1,-1],[0,-1],[0,-1],[0,-2],[0,-1],[-1,-3],[0,-1],[0,-1],[0,-1],[-1,0],[-1,-2],[0,-1],[-1,-1],[-2,-1],[-1,-1],[-1,-1],[-1,0],[0,-1],[-1,0],[0,-1],[0,-1],[0,-2],[0,-1],[1,-1],[0,-1],[0,-1],[-1,-1],[0,-1],[0,-1]],[[8834,1566],[-65,7]],[[8769,1573],[7,18],[-30,21],[1,18]],[[8870,1418],[0,1],[-1,1],[0,1],[0,1],[0,3],[0,1],[0,1],[-1,0],[-4,3],[-1,1],[0,1],[-1,3],[0,2],[0,1],[1,1],[1,2],[0,1],[-1,0],[0,1],[-11,2],[-1,-1],[-1,-2],[-1,0],[-1,0],[-3,5],[0,1],[0,1],[0,3],[-1,1],[-7,4],[0,1],[-1,0],[0,1],[3,5]],[[8839,1464],[3,-5],[4,-3],[5,0],[1,0],[2,1],[1,1],[1,0],[1,4],[0,2],[0,3],[0,6],[1,1],[1,1],[7,2]],[[8866,1477],[19,-11],[15,1],[16,5]],[[8717,1494],[-2,-2],[-1,-1],[0,-3],[0,-1],[0,-1],[1,-1],[6,-4],[1,-1],[0,-1],[0,-7],[1,-3],[2,-3],[18,-17]],[[8743,1449],[-5,-2],[-13,-3],[-7,3],[-2,3]],[[8716,1450],[-9,10],[-6,3]],[[8701,1463],[-1,3],[-1,1],[-1,1],[-1,0],[-1,1]],[[8701,1463],[-7,-2],[-8,-9],[-8,-2],[-25,-1],[-8,-7],[4,-8],[-31,-5],[-2,-1],[-5,-5],[-1,-2],[0,-1],[0,-1],[1,-1],[2,-1],[1,0],[9,0],[0,-1],[1,0],[0,-1],[-1,-1],[-7,-4],[-5,-6],[-2,-4],[-4,-4]],[[8605,1396],[-10,10],[-21,5],[-5,7],[-1,14]],[[8568,1432],[3,-1],[7,0],[2,1],[3,2],[0,1],[0,8],[1,0],[1,3],[7,7],[8,15]],[[8793,1529],[1,0],[6,-5],[1,-1],[0,-1],[0,-2],[0,-1],[1,0],[5,-2],[1,0],[0,-1],[0,-1],[-10,-13],[-1,-2],[0,-1]],[[8797,1499],[-3,-1],[-3,0],[-4,-2]],[[8769,1533],[2,1],[9,5],[2,0],[1,-1],[1,0],[4,-5],[5,-4]],[[8761,1459],[-9,-5],[-9,-5]],[[8717,1494],[10,-1],[0,-1],[1,-1],[0,-3],[1,-1],[1,-2],[6,-4],[5,-6],[3,-6],[2,-2],[1,0],[3,-1],[7,3],[1,-1],[0,-1],[1,-4],[2,-4]],[[8768,1399],[-3,-5],[0,-1],[0,-1],[7,-2]],[[8769,1371],[-3,-2],[-1,0],[-3,0],[-4,2],[-3,2],[-9,-1],[-4,-3],[-15,-2],[-3,1],[-1,0],[-1,0],[-2,-1],[-1,-2],[-1,-1],[-2,0],[-3,1],[-1,1],[-4,4]],[[8708,1370],[0,1],[-1,3],[-3,3],[-3,6],[-1,6],[0,4],[-1,2],[0,3],[-1,3],[0,6],[0,1],[-2,5]],[[8696,1413],[36,3],[2,-1],[2,-1],[3,-5],[2,-2],[13,-7],[14,-1]],[[8950,1581],[1,-4],[1,-13]],[[8902,1513],[-1,7],[-1,3],[-1,1],[-5,2],[-1,0],[-4,5],[-1,1],[-2,0],[-1,0],[-1,0],[-2,-1],[-3,-5],[-1,-1],[-9,-1]],[[8869,1524],[1,15],[-3,13],[0,12],[3,7],[0,2],[-1,3],[-1,2],[-2,3],[-1,1],[0,1],[0,1],[1,2],[6,4]],[[8872,1590],[2,-5],[34,-19],[7,2],[11,12],[24,1]],[[8716,1450],[-1,-1],[-4,-8],[-1,-1],[-1,-1],[-11,0],[-1,-1],[-1,-1],[-1,-3],[0,-2],[0,-2],[1,-4],[0,-2],[-1,-6],[1,-5]],[[8696,1413],[-5,1],[-1,-1],[-8,-6],[-9,-2],[-2,0],[-8,5],[-2,0],[-1,0],[-1,0],[-1,-1],[0,-1],[0,-4],[2,-7],[1,-9],[-2,-13],[0,-1],[-4,-5]],[[8655,1369],[-3,7],[-15,6],[-9,0],[0,1],[-16,12],[-7,1]],[[8748,1310],[-10,18],[-6,0],[-20,-10],[1,22],[-17,19]],[[8696,1359],[4,4],[1,1],[1,2],[3,2],[1,1],[2,1]],[[8839,1464],[-1,7],[-9,1],[-7,3],[-12,6]],[[8810,1481],[1,1],[1,1],[-1,0],[0,1],[-2,1],[-1,1],[0,2],[-1,1]],[[8807,1489],[2,3],[1,6],[1,0],[0,1],[5,2],[3,2],[11,0],[3,1],[2,2],[4,4],[8,4]],[[8847,1514],[1,-9],[8,-18],[1,-1],[2,-2],[3,-1],[1,-1],[3,-5]],[[8869,1524],[-22,-2]],[[8847,1522],[-7,6],[-2,1],[-8,-1],[-2,1],[-6,5],[-2,7]],[[8820,1541],[1,4],[1,1],[0,1],[1,2],[1,1],[1,2],[0,1],[1,1],[0,1],[1,0],[1,3],[1,1],[1,2],[2,2],[0,1],[2,2]],[[8852,1608],[2,-1],[13,-8],[5,-9]],[[8761,1459],[5,4],[5,4]],[[8771,1467],[4,-15],[-2,-3],[-1,-2],[-10,-9],[0,-1],[-1,-1],[0,-1],[2,-3],[1,-5],[1,-1],[2,-2],[1,-1],[0,-23],[0,-1]],[[8781,1476],[-10,-9]],[[8868,3321],[48,-33],[12,-5],[12,-3],[12,-4],[10,-10],[2,-7],[2,-9],[1,-9],[4,-3],[6,-2],[19,-11],[-5,-7],[11,-7],[10,-12],[7,-15],[3,-12],[53,-123],[9,-35],[0,-39],[-13,-48],[-4,-6],[-7,-3],[-13,-2],[-11,-6],[-58,-50],[-12,-4],[-8,-6],[-51,-64],[-14,-12],[-15,-6],[-10,-6],[-9,-12],[1,-11],[20,-2],[33,7],[9,-3],[18,-13],[9,-3],[15,-9],[33,-44],[16,-16],[12,7],[9,1]],[[9034,2664],[-2,-4],[-9,-22],[11,-12],[-2,-6],[-49,-32],[-18,3]],[[8822,2530],[-2,1],[-20,-8],[-12,2],[-23,-12],[-15,5],[-15,-2],[-10,13],[-41,-8],[-34,14],[-56,-24],[-22,0],[-20,6],[-16,-6]],[[8536,2511],[-11,5],[-3,9],[11,-2],[30,11],[19,12],[3,10],[-65,21],[-7,14],[-24,15],[-15,-2],[-14,6],[-27,1],[0,1]],[[8358,2807],[-13,23],[3,18],[16,11],[12,16],[32,12],[-4,19],[-11,12],[6,12],[-7,11],[4,8],[-2,21],[3,18],[-21,1],[-3,2],[-1,7],[9,19],[16,2],[9,9],[18,0],[5,12],[13,16],[-2,6],[-3,2],[-8,-11],[-15,9],[-16,0],[-12,-11],[-34,5],[5,40],[13,30],[2,10],[-1,8],[-11,29],[-3,4],[-4,2],[-3,3],[-1,6],[3,10],[1,5],[-1,5],[-8,17],[-7,9],[-2,9],[3,12]],[[5029,4344],[-8,-13],[8,-4],[2,-8],[1,-8],[2,-5],[8,0],[5,4],[3,6],[7,6]],[[5057,4322],[1,0],[40,-8]],[[5098,4314],[-5,-19],[-14,1],[-14,-8],[-23,-3],[-8,-8],[-27,-11],[-4,-6]],[[5003,4260],[-6,-5],[-3,-8],[-7,2],[-6,18],[-28,17],[-1,12],[-6,13],[-15,13]],[[4931,4322],[13,6],[-10,18],[2,3],[14,2],[9,7]],[[4959,4358],[25,1],[12,-15],[16,12],[17,-12]],[[4230,4710],[-16,-15],[14,-13],[14,-31],[11,3],[18,-3],[-7,-17],[3,-22],[6,-15],[20,-12],[5,-21],[7,-7],[-4,-11],[1,-27],[18,-21]],[[4320,4498],[-23,-2],[-15,-7],[-26,7],[-4,10],[-30,24],[-21,-5],[-7,2],[7,8],[-9,8],[0,17],[-44,3],[-2,6],[12,15],[-1,3],[-35,8],[-18,-6],[-19,2],[-11,18],[-15,6],[-1,0]],[[4058,4615],[5,6],[1,8],[-4,23],[2,7],[4,1],[2,1],[-3,8],[18,23],[7,6],[7,5],[42,6],[5,4],[5,7],[6,5],[12,4],[-6,-17],[10,0],[30,7],[11,-1],[18,-8]],[[4372,4454],[-4,-14],[-21,-10]],[[4347,4430],[-17,-9],[5,-34],[-8,-18],[20,-10],[-9,-10],[7,-9],[14,-33],[-7,-27]],[[4352,4280],[-9,-17],[6,-9],[-4,-9],[-19,-15],[-16,-2],[-4,-13],[-3,-2],[-35,-9],[-8,-16],[-6,-4],[-8,-2],[-10,5],[-5,-5],[-14,1],[-30,-10],[-9,-10],[-11,-3],[-11,3],[-30,-11],[-22,1],[-13,-7]],[[4091,4146],[-36,6],[-13,-11],[-16,-2],[-28,-16],[-17,9],[-8,12],[-8,1],[0,25],[-11,25],[5,11],[-6,9],[11,34],[18,3],[0,6],[-10,12],[-31,-4],[-27,17],[-20,-1],[-15,20]],[[3879,4302],[26,23],[26,-2],[34,17],[9,0],[2,-5],[21,10],[18,3],[11,-9],[15,2],[2,11],[16,12],[16,22],[39,15],[14,20],[17,3],[9,-5],[17,14],[23,8],[62,-4],[17,11],[40,7],[14,8],[17,-2],[13,-7],[15,0]],[[4615,4177],[29,-41],[16,-2],[1,-19],[14,-16],[17,-1],[20,15]],[[4712,4113],[1,-13],[9,-11],[2,-12],[7,-12],[-2,-43],[12,-15]],[[4741,4007],[-9,-9],[-18,8],[-9,-6],[-19,-1],[-12,-12],[-14,-2],[-6,-17],[-7,-1],[-4,-7],[-17,8],[-18,-7],[-7,-9],[-19,1],[-21,-18],[-6,-10],[2,-9],[-3,-4]],[[4554,3912],[-9,10],[-14,9],[-7,4],[-7,1],[-7,-4],[-5,-6],[-5,-4],[-8,0],[-14,8],[-14,9],[-12,12],[-11,15],[-4,9],[-2,9],[-3,8],[-6,5],[-23,10],[12,5],[5,9],[-1,13],[-8,17]],[[4411,4051],[2,2],[3,1],[12,4],[9,7],[-2,16],[18,20],[1,6],[-4,13],[9,11],[51,-9],[4,3],[4,15],[6,7],[-4,6],[2,6],[15,7],[11,11],[29,-13],[13,9],[17,-1],[8,5]],[[4944,3979],[-21,-12],[10,-2],[5,-27],[15,-28],[3,-1],[15,14],[14,1],[11,7],[26,-14],[22,6],[11,-1],[5,0]],[[5060,3922],[0,-3],[-1,-18],[-4,-19],[-6,-18],[-7,-14],[-11,-13],[-27,-11],[-20,-18],[-28,-17],[-9,-4],[-25,-1],[-10,1],[-11,7],[0,6],[13,5],[5,1],[-50,15],[-8,1],[-8,17],[-17,5],[-19,1],[-14,5],[-4,-7],[-9,7],[-10,-1],[-9,-4],[-9,-2],[-8,5],[-4,6],[-6,1],[-8,-12],[-1,-6],[1,-7],[0,-7],[-2,-8],[-4,-3],[-16,-2],[-16,-5],[-5,0],[-4,2],[-4,4],[-2,4],[-1,2],[-18,-1],[-55,-17],[-5,0],[-10,4],[-5,-1],[-3,-3],[-4,-4],[-3,-5],[-4,-2],[-9,4],[-17,18],[-10,7],[10,21],[1,10],[-7,11],[14,15],[6,17],[-3,16],[-6,5]],[[4741,4007],[10,-11],[14,1],[12,-4],[14,3],[58,-18],[16,5],[9,-6],[25,-2],[27,9],[18,-5]],[[5006,4100],[8,-12],[-1,-3],[-20,-20],[2,-19],[13,-27],[-1,-3],[-11,-3],[1,-10],[-7,-9],[5,-12],[-14,-4],[-32,16],[-3,-1],[-2,-14]],[[4712,4113],[8,7],[40,-9],[3,0],[1,6],[11,-3],[45,3],[3,8],[12,5],[-7,10],[1,9],[9,0]],[[4838,4149],[28,10],[1,-9],[18,3],[50,-27],[1,-3],[-7,-5],[3,-10],[36,-11],[25,7],[13,-4]],[[4803,4294],[-8,-14],[-13,-7],[8,-4],[6,-14],[1,-25],[22,-18],[0,-6],[-9,-9],[5,-6],[2,-11],[19,-16],[2,-15]],[[4615,4177],[-7,15],[0,12],[-12,14],[8,4],[-1,0],[19,15],[10,9]],[[4632,4246],[30,13],[29,14]],[[4691,4273],[4,-1],[36,16],[21,10],[6,2],[8,-5],[6,-5],[7,-3],[8,0],[4,6],[-1,11],[0,7],[3,0],[9,-5],[1,-12]],[[4411,4051],[-6,15],[-4,3],[-8,1],[-5,2],[-6,16],[-5,6],[-40,28],[-22,9],[-20,-2],[-19,-15],[-31,-41],[-21,-13],[-6,0],[-11,1],[-2,-1]],[[4205,4060],[-1,1],[-27,-13],[-14,5],[-16,32],[-6,5],[-18,-2],[-11,4],[-4,12],[6,18],[-19,13],[-4,11]],[[4352,4280],[42,-11],[17,5],[10,-3],[20,8],[16,-8],[21,-3],[18,8],[15,-19],[7,-3],[13,11],[24,-4],[6,9],[32,-9],[-1,0],[13,-5],[25,-11],[2,1]],[[5003,4260],[20,-14],[3,-12],[10,-6],[4,-17],[7,-1],[1,-9],[11,-10]],[[5059,4191],[-7,-12],[-11,-2],[-3,-9],[-10,-4],[4,-15],[-18,-15],[-3,-6],[6,-18],[-11,-10]],[[4803,4294],[22,0],[10,8],[15,1],[34,15],[47,4]],[[4651,4398],[16,-11],[24,-24],[11,-12],[1,-13],[-4,-13],[-6,-21],[-1,-15],[0,-16],[-1,0]],[[4347,4430],[8,-9],[7,-2],[22,3],[14,-4],[41,12],[30,-9],[12,4],[26,-27],[25,-9],[14,0],[11,10],[28,8],[18,-4],[6,5],[3,9],[23,-10],[1,0],[9,-5],[6,-4]],[[4919,4476],[25,-16],[-2,-18],[-9,-6],[4,-20],[11,-11],[-1,-8],[-7,-9],[0,-22],[5,-5],[14,-3]],[[4651,4398],[1,7],[1,8],[6,12],[6,9],[5,20],[-1,1],[-3,4],[-3,6],[0,3]],[[4663,4468],[3,-2],[6,1],[50,-5],[23,18],[15,-7],[17,3],[17,-4],[6,7],[14,-5],[4,-5],[18,-2],[13,19],[26,4],[44,-14]],[[4646,4589],[-2,-8],[12,-15],[6,-19],[0,-16],[7,-22],[-3,-16],[-4,-10],[0,-5],[0,-10],[1,0]],[[4372,4454],[19,7],[3,7],[-2,6],[-13,11],[1,13]],[[4380,4498],[19,14],[-1,19],[51,-5],[22,17],[0,21],[6,12],[-8,9]],[[4469,4585],[7,0],[21,16],[18,-2],[9,-10],[26,7],[9,10],[36,-11],[18,3],[10,3],[4,11],[10,4]],[[4637,4616],[10,-20],[-1,-7]],[[4908,4654],[11,-4],[12,-17],[20,-14],[7,-13],[-2,-22],[-7,-12],[6,-34],[20,-8],[7,4],[14,0],[13,-20],[-2,-7],[-7,-4],[-39,-2],[-1,-6],[9,-13]],[[4969,4482],[-50,-6]],[[4646,4589],[30,2],[17,-6],[-3,18],[10,7],[-13,8],[-6,9],[1,3],[25,4],[12,11],[15,-6],[7,7],[7,2],[10,-8],[4,4],[-3,15],[4,10],[25,-1],[10,6],[19,2],[20,13],[10,-3],[2,6]],[[4849,4692],[15,-6],[6,-18],[13,-14],[10,-4],[15,4]],[[5173,4457],[-33,-6],[-8,-10],[-9,17],[-14,4],[-7,-3],[-14,3],[-43,-6]],[[5045,4456],[-9,7],[-14,-6],[-15,4],[-7,-4],[-10,4],[-10,-2],[-12,13],[1,10]],[[4908,4654],[41,32],[5,9],[12,2],[19,19],[1,1]],[[4986,4717],[3,-3],[5,-8],[-1,-16],[-12,-34],[2,-7],[18,-2],[18,-7],[15,-12],[13,-16],[3,-6],[4,-15],[4,-7],[4,-4],[11,-7],[5,-5],[6,-7],[5,-9],[5,-11],[2,-13],[7,-25],[16,-9],[19,-6],[16,-19],[4,0],[-12,19],[-41,36],[10,16],[19,-4],[20,-15],[12,-15],[8,-29],[-1,-20]],[[5173,4457],[-1,-5],[-9,-20],[-14,-14],[-19,-7],[-39,-10],[-17,-7],[-17,-13],[-4,-5]],[[5053,4376],[-1,1],[-3,4],[1,7],[-6,11],[-9,5],[8,27],[-6,6],[-2,10],[10,9]],[[5053,4376],[-9,-9],[-15,-23]],[[5255,4367],[-5,-3],[-4,-2],[1,-12],[-18,-7],[-7,-14],[-22,-11],[-32,0],[-19,10],[-18,-12]],[[5131,4316],[-23,3],[-10,-5]],[[5057,4322],[14,19],[7,6],[23,9],[22,13],[14,6],[10,-4],[10,-6],[14,-1],[78,10],[3,-3],[3,-4]],[[5207,4178],[0,-1],[9,-2],[-1,-4],[-1,-3],[-3,-6],[5,-6],[-18,-47],[-5,-9],[-24,-16],[-7,-9],[26,8],[30,15],[27,6],[19,-17],[7,-34],[-8,-27],[-17,-20],[-22,-19],[-3,-1],[-7,2],[-3,-1],[-4,-19],[-5,-2],[-6,-2],[-5,1],[-2,7],[-8,7],[-37,2],[-28,-2],[-28,-9],[-12,-2],[-13,-4],[-4,-11],[1,-31]],[[5059,4191],[21,11],[11,0]],[[5091,4202],[18,-23],[34,-5],[4,-8],[10,-4],[46,11],[0,-1],[4,6]],[[4640,4802],[-1,-5],[-17,0],[-19,-11],[-3,-31],[-6,-8],[-17,-11],[13,-15],[7,-18],[0,-10],[-6,-9],[6,-22],[20,-18],[-1,-15],[4,-5],[17,-8]],[[4469,4585],[-10,42],[-8,11],[3,8],[15,12],[-15,7],[-4,9],[-1,29],[3,27],[-10,29],[-26,21],[8,11],[-1,10],[7,8],[1,9],[1,8]],[[4432,4826],[54,2],[74,28],[44,3],[11,6],[6,6]],[[4621,4871],[3,-3],[-1,-1],[7,-8],[-1,-12],[6,-9],[-2,-21],[7,-15]],[[4640,4802],[25,0],[11,-10],[15,4],[0,-5],[8,-10],[19,11],[10,0],[10,-9],[12,-18],[14,-4],[62,15],[1,-20],[-6,-9],[4,-7],[0,-11],[23,-31],[1,-6]],[[4380,4498],[-16,11],[-14,-4],[-18,2],[-12,-9]],[[4230,4710],[10,-4],[23,-3],[22,3],[7,4],[14,15],[10,6],[0,12],[5,16],[7,15],[8,7],[7,9],[4,41],[4,13],[10,0],[28,-15],[13,-4],[30,1]],[[5131,4316],[-3,-20],[5,-7],[-1,-3],[-13,-6],[-11,-16],[3,-11],[-23,-19],[3,-32]],[[6434,2041],[23,-6],[1,-6],[-6,-17],[2,-3],[28,-10],[4,-5],[2,-14],[11,-12],[-2,-9],[-19,-17],[-14,-22],[-2,-16],[8,-21],[-3,-7],[-7,-4],[-5,-3],[-5,-27],[4,-20],[-7,-14],[-20,-17],[-9,-27],[-22,-30]],[[6396,1734],[-12,14],[-31,0],[-11,-7],[4,-16],[-4,-9],[-8,-1],[-12,6],[-12,-8]],[[6310,1713],[-1,0],[-28,4],[-9,-8],[-11,-2],[-9,-10],[0,-11],[-8,-10],[-4,-17],[-19,-24]],[[6221,1635],[-3,1],[-7,-8],[-6,-3],[-7,-1],[-26,3],[-35,17],[-9,-6],[-51,-7],[-14,5],[-17,12],[-16,16],[-8,17],[26,-3],[12,1],[6,8],[-12,0],[-11,2],[-10,7],[-6,11],[2,2],[3,6],[3,8],[0,9],[-4,6],[-4,-3],[-5,-10],[-4,-3],[-5,-7],[-4,-2],[-7,1],[-5,5],[-6,6],[-12,-2],[-3,-6],[6,-9],[9,-8],[-22,-11],[-25,-1],[-48,6],[-19,-2],[-23,-5]],[[5854,1687],[0,1],[1,8],[0,15],[0,17],[0,14],[-2,11],[-6,11],[-9,7],[-8,1],[-10,0],[-7,-1],[-9,-3],[-5,-2],[-9,0],[-9,0],[-6,2],[-4,2],[0,6],[5,7],[16,3],[7,4],[0,7],[-1,6],[-10,8],[0,4],[5,9],[26,23],[13,3],[12,1],[15,-2],[22,8],[51,26],[15,11],[0,8],[-7,8],[-12,15],[-7,14],[-4,14],[-11,12]],[[5906,1965],[1,1],[39,-2],[56,-8],[27,0],[21,2],[19,1],[22,0],[24,0],[21,9],[27,26],[27,18],[30,13],[8,2],[15,-7],[13,-1],[18,0],[12,11],[16,9],[7,3],[14,-2],[8,0],[12,0],[11,3],[16,-3],[19,-3],[17,-10],[14,0],[14,14]],[[5906,1965],[-1,0],[-15,5],[-15,2],[-10,4],[-7,5],[-6,8],[-7,1],[-11,0],[-10,0],[-8,3],[-1,11],[1,14],[2,7],[0,1],[0,2]],[[5818,2028],[14,-9],[-2,27],[25,11],[80,-3],[7,2],[4,5],[4,6],[4,6],[19,5],[13,8],[12,10],[20,20],[9,5],[11,3],[13,0],[12,3],[77,58],[37,46],[19,32],[9,21],[5,38],[6,21],[7,19],[7,13],[-3,9],[-1,11],[1,10],[3,8],[6,1],[14,-6],[7,-2],[11,4],[33,21],[0,2]],[[6301,2433],[13,2]],[[6314,2435],[38,2],[19,-7],[6,-14],[-3,-26],[14,-21],[30,5],[14,13],[13,-2],[-8,-29],[-13,-8],[-2,-19],[26,-16],[17,-34],[2,-17],[13,-1],[12,-14],[-7,-7],[-26,-5],[-18,-14],[0,-7],[10,-12],[-1,-10],[10,-12],[-3,-6],[-18,-8],[-4,-11],[4,-4],[-5,-5],[-1,-31],[-6,-22],[4,-32],[-6,-17],[9,-3]],[[5829,1598],[-3,-5],[-6,-1],[-4,4],[-3,-1],[-2,2],[-2,4],[1,4],[11,-2],[8,-5]],[[5445,1689],[-7,-4],[-5,0],[-1,-3],[-6,-1],[0,1],[0,2],[-3,1],[-3,0],[-3,6],[3,2],[11,3],[8,-5],[6,-2]],[[5402,1797],[-3,-1],[-1,0],[0,3],[-4,1],[0,7],[2,3],[-2,5],[6,4],[3,0],[3,-2],[-2,-7],[1,-7],[-3,-6]],[[5854,1687],[-4,-1],[-22,-13],[-1,-23],[-6,-1],[-1,-2],[0,-3],[-2,-7],[-12,-26],[-6,2],[-8,6],[-5,-2],[-11,-11],[-58,2],[-9,-2],[-10,-6],[-6,-7],[-5,-8],[-6,-7],[-12,-5],[-6,-8],[-6,-3],[-3,1],[-6,5],[-43,12],[-15,10],[6,10],[-10,17],[-32,7],[-12,13],[4,6],[50,-6],[-2,3],[-1,7],[-2,3],[10,0],[17,-5],[9,-1],[9,2],[21,11],[32,5],[16,10],[6,1],[9,-4],[0,6],[-19,16],[-3,22],[10,19],[25,5],[0,7],[-8,-5],[-18,-6],[-37,-3],[-8,-5],[11,0],[8,-3],[3,-9],[-4,-13],[9,-7],[-2,-11],[-10,-9],[-50,-10],[-14,-1],[-90,11],[-12,-4],[7,-15],[-8,-7],[-9,0],[2,10],[0,5],[-32,22],[-13,3],[14,1],[9,1],[7,5],[8,9],[9,8],[22,4],[11,4],[10,9],[2,9],[-3,23],[-1,14],[-3,14],[-5,11],[-9,7],[-4,-6],[-12,9],[-25,3],[-12,7],[-9,-6],[-36,-7],[-13,0],[5,3],[4,3],[0,7],[-2,4],[-1,3],[1,2],[6,4],[0,5],[-5,12],[7,5],[23,2],[12,4],[19,18],[9,4],[20,2],[26,9],[20,15],[2,24],[10,0],[0,6],[-8,5],[1,7],[7,4],[11,2],[17,-1],[8,-2],[34,-16],[13,0],[18,7],[-4,12],[12,-2],[25,-8],[14,-2],[6,4],[-1,8],[-3,11],[0,8],[5,3],[22,4],[12,7],[9,10],[16,23],[12,12],[9,0],[8,-6]],[[6961,3120],[-1,-2],[-4,-9],[-7,-3],[-19,7],[-33,-3],[-26,11],[-19,-17]],[[6852,3104],[-10,14],[-16,29],[-23,26],[-9,13],[-1,14],[7,9],[12,6],[28,3],[13,5],[23,16],[15,-1],[15,-16],[38,-84],[12,-14],[5,-4]],[[6135,518],[0,-3],[-5,-6],[-7,-3],[-8,0],[0,-6],[10,-5],[2,-10],[-2,-9],[-6,-7],[-8,-3],[-31,3],[10,-14],[37,5],[15,-10],[-23,-6],[0,-6],[6,1],[12,-1],[-4,-7],[18,0],[0,-5],[-8,-3],[-4,-5],[-1,-6],[4,-6],[0,-6],[-14,1],[-7,11],[-6,13],[-11,6],[-55,13],[-30,-3],[-47,-26],[-25,-9],[-107,-6],[0,-1],[-2,-3],[-3,-2],[-3,0],[-9,25],[-5,1],[-4,-3],[-3,-3],[-4,-1],[-13,-1],[-13,-4],[-8,-8],[5,-12],[0,-6],[-4,-4],[-6,-6],[-5,-6],[-3,-6],[1,-6],[4,-6],[0,-4],[-8,-17],[-1,-5],[-6,-6],[-32,4],[-13,-4],[-12,-14],[-11,-6],[-28,-8],[-8,-8],[-27,-42],[-8,11],[-4,32],[-8,7],[-13,-3],[0,-8],[1,-11],[-8,-10],[0,-5],[4,-3],[9,-10],[-5,0],[-4,-2],[-8,-4],[-7,-5],[0,-6],[0,-8],[-3,-6],[-5,-4],[-21,-9],[7,0],[6,-1],[9,-5],[3,0],[8,1],[3,-1],[1,-4],[2,-12],[3,-3],[3,-7],[-9,-17],[-18,-26],[-6,-1],[-13,2],[-8,-1],[-4,-3],[-20,-21],[-7,-21],[-2,-5],[-6,2],[-7,5],[-19,20],[-3,4],[-3,6],[-2,12],[0,7],[0,7],[-5,9],[-18,27],[-10,12],[-13,8],[-39,17],[-26,4],[-22,12],[-11,4],[-13,0],[-17,-6],[-12,-9],[0,-13],[4,-16],[-7,-12],[-12,-8],[-10,-5],[-26,-8],[-31,-3],[-25,9],[-6,28],[6,0],[4,2],[3,4],[0,6],[-1,4],[-3,2],[-1,0],[-3,18],[-1,9],[2,5],[1,3],[13,19],[5,3],[19,6],[41,22],[22,7],[25,14],[14,1],[20,-18],[13,-5],[13,7],[10,14],[4,9],[2,8],[4,3],[23,0],[24,13],[74,70],[24,15],[8,3],[3,4],[0,11],[-1,11],[-4,19],[7,4],[10,1],[5,-1],[45,22],[1,5],[6,13],[6,35],[1,19],[2,15],[6,13],[13,9],[13,0],[5,3],[9,9],[4,1],[4,-5],[3,-10],[2,-13],[0,-10],[5,2],[1,2],[3,3],[11,-7],[27,-1],[11,-5],[-7,12],[-12,6],[-21,8],[-10,11],[1,9],[3,7],[-3,10],[0,6],[16,-3],[48,3],[19,5],[10,13],[7,17],[10,15],[-4,14],[3,9],[6,5],[9,-3],[46,36],[8,11],[5,16],[12,13],[27,18],[17,32],[-3,80],[5,23]],[[6823,2656],[7,-6],[11,-4],[20,-2],[3,-1],[1,-2],[5,-7],[3,-3],[3,-2],[19,-2],[15,-5],[4,-1],[1,-1],[6,-10],[3,-4],[4,-2],[11,-5],[1,-2],[-1,-3],[-4,-7],[-4,-3],[-4,-2],[-13,-1],[-4,-1],[-3,-2],[-2,-2],[-2,-3],[-3,-8],[-4,-8],[-1,-4],[-1,-6],[1,-11],[-2,-9],[-2,-5],[-3,-2],[-13,-6],[-2,-2],[-2,-4],[-1,-5],[-2,-12],[-1,-4],[-1,-4],[-4,-5],[-6,-4],[-18,-9],[-2,-2],[-2,-3],[-1,-4],[0,-5],[0,-4],[3,-6],[5,-8],[2,-3],[1,-3],[0,-3],[-1,-4],[-4,-5],[0,-2],[3,-2],[7,0],[5,0],[4,2],[2,2],[2,3],[3,5],[3,3],[2,2],[18,8],[13,11],[3,1],[3,0],[3,0],[16,-16],[3,-4],[1,-4],[-1,-3],[-3,-4],[-5,-6],[-17,-13],[-6,-12],[-4,-3],[-50,-2],[-7,-3],[-17,-10],[-29,-10],[-3,-2],[-5,-4],[-7,-11],[-1,-4],[0,-3],[0,-4],[1,-7],[1,-4],[2,-5],[1,-3],[3,-2],[2,-3],[22,-12],[16,-14],[24,-14],[17,-16],[4,-4],[73,-5]],[[6941,2241],[1,0],[1,-8],[-2,-4],[-4,-5],[-13,-7],[-5,-4],[-3,-6],[-2,-7],[0,-1],[2,-10],[2,-4],[3,-3],[16,-4],[3,-2],[2,-2],[0,-3],[-4,-4],[-4,-2],[-22,0],[-6,-2],[-3,-2],[-2,-2],[-4,-6],[-2,-2],[-3,-2],[-9,-4],[-2,-2],[-2,-3],[-2,-3],[-3,-11],[-4,-5],[-26,-33],[-1,-4],[1,-4],[5,-6],[4,-1],[4,0],[3,0],[3,-1],[2,-2],[-2,-5],[-2,-4],[-4,-2],[-17,-5],[-5,-3],[-2,-3],[1,-4],[4,-5],[10,-6],[0,-1],[0,-1],[-3,-2],[-2,-3],[-3,-3],[-2,-8],[-4,-16],[0,-2],[1,-2],[5,-2],[6,-5],[11,-11],[2,-3],[1,-4],[1,-8],[-1,-5],[1,-6],[1,-5],[19,-31]],[[6881,1915],[-1,0],[-6,-14],[1,-14],[-3,-13],[19,-48],[-19,-17],[-2,-12],[-14,-23],[-17,-3],[-13,-10],[-14,-3]],[[6812,1758],[-3,-1],[-29,-1],[-44,5],[-10,-7],[-2,-7],[3,-5]],[[6727,1742],[-29,-3]],[[6698,1739],[-9,-1],[-6,15],[-19,5],[-12,15],[-6,-2],[-4,-9],[-4,-2],[-6,3]],[[6632,1763],[-10,5],[-9,-1],[-4,-4],[-1,-19],[-4,-5],[-31,-9],[3,-5],[-2,-4],[-14,3],[-8,-11],[-16,-10]],[[6536,1703],[-5,11],[-37,15],[-30,-10],[-18,4],[-6,-11],[-20,-3],[-24,25]],[[6314,2435],[10,13],[23,8],[25,21],[6,25],[-3,13],[23,30],[22,-4],[24,7],[18,-1],[20,11],[43,6],[19,32],[-6,31],[-11,19],[7,24],[6,7],[33,13],[23,1],[9,10],[5,15]],[[6610,2716],[22,-5],[29,10]],[[6661,2721],[8,3],[3,-2],[-2,-12],[3,-5],[47,-21],[7,-6],[15,-21],[-2,-10],[4,-5],[13,-1],[33,13],[33,2]],[[6606,1484],[-2,1],[-29,-17],[3,-13],[-3,-10],[4,-16],[-12,2],[-5,-4],[12,-11],[-31,-14],[-1,0]],[[6542,1402],[-19,23],[-38,28],[-9,0],[-12,-5],[-15,7],[-12,11],[-7,9],[-1,4],[1,2],[2,0],[2,1],[-5,18],[-2,4]],[[6427,1504],[40,-6],[33,15],[-8,25],[-20,16],[1,8],[9,8],[5,27],[4,5],[42,-5],[26,7]],[[6559,1604],[15,-8],[22,-15],[19,-25],[-5,-43],[-4,-29]],[[6839,1657],[4,-8],[13,-4],[12,-6],[1,-10],[-1,-13],[-2,-14],[-1,-9],[9,-12],[19,-10]],[[6893,1571],[-13,-7],[-37,-10],[0,-1],[0,-7],[17,-15],[-13,-17]],[[6847,1514],[-34,9],[-37,-3],[-9,-5]],[[6767,1515],[-20,31],[-28,64]],[[6719,1610],[16,9],[1,16],[-14,30],[-19,53],[-5,21]],[[6727,1742],[20,-21],[4,-12],[12,-17],[10,-5],[5,5],[26,-12],[18,-13],[17,-10]],[[6719,1610],[-1,1],[-49,48],[-39,47],[17,10],[-15,47]],[[6767,1515],[-5,-2],[-27,-24],[-5,-12],[-5,-2]],[[6725,1475],[-1,-1],[-19,13],[-3,-1],[-2,-12],[-27,7],[-13,-10],[-6,6],[-17,4],[-9,8],[-8,-1],[-6,-7],[-8,3]],[[6559,1604],[2,0],[-2,10],[-14,18],[-1,16],[3,28],[-3,10],[-13,9],[5,8]],[[6847,1514],[5,-9],[18,-7],[1,-3],[-7,-11],[0,-3]],[[6864,1481],[-8,-2],[-11,-7],[-16,-16],[-3,-3],[-3,-11],[-3,-4],[-5,-3],[-9,-1],[-4,-2],[0,-1]],[[6802,1431],[-5,6],[-6,6],[-7,2],[-7,0],[-11,-1],[-7,-1],[-7,0],[-7,3],[-6,8],[-10,14],[-4,7]],[[6802,1431],[8,-19],[-4,-19],[-12,-12],[-12,4],[-10,1],[-45,-17],[-162,13],[-12,6],[-11,14]],[[6427,1504],[-4,13],[-7,15],[-8,12],[-5,5],[-12,7],[-6,6],[-10,18],[-6,5],[-8,2],[-21,-2]],[[6340,1585],[8,14],[29,46],[-23,25],[-33,33],[-11,10]],[[6340,1585],[-49,-5],[-9,-4],[-9,-5],[-5,-5],[-1,-9],[5,-9],[7,-8],[4,-8],[-26,0],[0,-3],[-3,-4],[-4,-1],[-2,4],[-2,4],[-4,3],[-5,2],[-4,0],[-2,-2],[-6,-8],[-3,-2],[-5,1],[-6,5],[-17,3],[-6,0],[-6,-2],[-7,-6],[-9,-10],[-7,-3],[-6,2],[-7,4],[-6,0],[-3,-9],[-8,0],[-38,14],[-11,1],[-3,3],[-1,3],[-1,6],[12,9],[-2,9],[-5,12],[0,14],[22,6],[2,3],[7,11],[4,5],[4,-6],[-4,0],[0,-6],[5,-3],[4,-4],[20,6],[33,2],[31,7],[14,20],[0,6],[-1,5],[0,2]],[[8254,3728],[-2,-2],[6,-23],[-12,-47],[-1,-22]],[[8245,3634],[-18,3],[-36,-13],[-36,0],[-39,3],[-24,15],[-26,34],[-11,28],[2,22],[11,6],[12,3],[12,1],[9,15],[4,17],[7,11],[15,6],[20,6],[28,0],[15,-1],[12,-11],[2,-17],[0,-17],[11,-14],[22,-3],[17,0]],[[7351,2612],[-10,-17],[-26,-58],[-11,-22],[-11,-19],[-7,-12],[-8,0],[-16,9],[-30,26],[-45,37],[-41,32],[-15,20],[11,14],[38,8],[33,16],[41,12],[36,18],[14,3]],[[7304,2679],[18,-13],[5,-12],[-6,-8],[1,-3],[29,-31]],[[7330,3448],[-3,-3],[0,-11],[-3,-6],[-7,-7]],[[7317,3421],[-38,9],[-18,-19],[-27,3]],[[7234,3414],[-6,8],[-8,16],[-1,20],[-1,18],[1,22],[1,17],[9,13],[10,9],[18,6],[15,4],[18,-7],[12,-25],[13,-27],[11,-30],[4,-10]],[[7271,3964],[-4,-12],[-38,-41],[-4,-11],[-19,-8],[-2,-21],[4,-13],[17,-15],[33,-16],[5,-8],[1,-22],[6,-6],[14,-2],[30,7],[17,-3],[4,-5],[2,-14],[5,-3],[-6,-15],[8,-10],[22,-2],[9,-16],[8,-1],[30,11],[0,-9],[4,-4],[20,-2],[8,-10],[3,-17],[44,-20],[5,-24],[21,-23],[21,-14]],[[7539,3615],[-3,-13],[-6,-8],[-31,-13],[-17,-17],[0,-33],[-25,-27],[7,-19],[-2,-8]],[[7462,3477],[-48,-22],[-13,-10],[-6,-13],[3,-24],[-5,-6]],[[7393,3402],[-11,12],[-3,35],[-8,1],[-24,-8],[-15,8],[-2,-2]],[[7234,3414],[-35,-25]],[[7199,3389],[-12,10],[-8,2],[-17,-16],[-5,0],[-7,11],[-28,-4],[-6,-3],[-6,-22],[2,-13],[-7,-11],[-6,-18],[-25,-17]],[[7074,3308],[-9,15],[-7,1],[-16,-10],[-3,-7],[1,-15],[-7,-2]],[[7033,3290],[-15,17],[-16,8],[-21,4]],[[6981,3319],[-9,1],[-29,20],[-7,-1],[-1,-4],[5,-22],[-47,23],[1,17],[8,5],[4,11],[-5,14],[15,19],[1,12],[6,3],[14,-4],[20,32],[-9,40],[-1,3],[0,1]],[[6947,3489],[24,14],[8,10],[-56,0],[-23,9]],[[6900,3522],[43,57],[6,36],[-14,44],[-33,33]],[[6902,3692],[60,19],[10,1],[9,-6],[5,-1],[2,4],[2,5],[5,5],[6,4],[5,2],[-8,10],[23,19],[3,15],[-12,-7],[-11,-4],[-20,-2],[-3,3],[-10,19],[-1,7],[4,6],[7,4],[5,5],[13,19],[9,9],[21,7],[7,9],[13,24],[-11,14],[-16,25]],[[7019,3907],[2,0],[15,5],[12,16],[38,-7],[16,-17],[24,-5],[6,3],[3,11],[19,23],[33,-3],[30,11],[47,27],[7,-7]],[[8724,3893],[58,-19],[23,-18],[-57,-26],[-20,-19],[-16,-36],[14,-26],[19,-59],[11,-28],[68,-89],[116,-145],[10,-30],[-8,-30],[-4,-3],[-13,-10],[14,29],[3,15],[-11,7],[-13,4],[-28,17],[-14,4],[-13,-2],[-25,-13],[-13,-3],[-16,1],[-15,4],[-13,6],[-11,7],[-62,68],[-23,14],[-23,3]],[[8563,3494],[-39,0],[-22,-5],[-5,2],[-16,13],[-2,2],[-37,4],[-14,-4],[-44,-25],[6,-2],[5,-2],[6,-4]],[[8297,3401],[-2,6],[3,12],[-53,22],[-36,3],[-50,-11]],[[8159,3433],[-23,25],[10,17],[0,18],[48,-17],[24,7],[26,16],[11,2],[-22,13],[-3,6],[20,23],[2,19],[7,17],[-14,25],[0,30]],[[8254,3728],[6,14],[19,19],[100,13],[21,-12],[21,-1],[2,16],[16,6],[2,14],[-4,8],[2,3],[24,8],[22,15],[14,3],[23,-4],[43,22],[3,6],[-4,9],[18,13],[3,22],[11,7],[16,-4],[12,-15],[28,-4],[11,-8],[47,-3],[8,6],[6,11],[0,1]],[[6834,2903],[-6,-7],[-6,-34],[0,-22],[9,-11],[11,-8],[10,-12],[-35,-12],[-33,-11],[-22,-3],[-31,-1],[-19,-1],[-20,-18],[-20,-22],[-11,-20]],[[6610,2716],[1,29],[10,9],[1,6],[-3,6],[-8,1],[-6,14],[28,23],[7,12],[-2,2],[-19,4],[-4,-1]],[[6615,2821],[-3,29],[-1,23],[-6,21],[-18,15],[-8,6],[-20,1],[-24,6],[57,52],[15,23],[0,21],[-2,18],[-9,17],[-9,9],[-9,8],[1,9],[1,7],[1,22],[1,14],[0,2]],[[6582,3124],[91,38],[8,0]],[[6681,3162],[-1,0],[-3,-5],[-6,-12],[-4,-32],[5,-5],[15,-6],[6,-11],[0,-10],[-4,-15],[0,-14],[4,-10],[9,-13],[19,-26],[17,-18],[13,-4],[13,0],[13,0],[13,-4],[6,-8],[9,-20],[15,-26],[14,-20]],[[6859,3078],[12,-5],[24,-4],[6,-2],[41,-28],[22,-20],[3,-4],[3,-6],[1,-8],[-1,-4],[-2,-2],[-24,-13],[-2,-3],[-1,-3],[1,-2]],[[6942,2974],[-1,0],[-22,-5],[-40,-30],[-32,-23],[-13,-13]],[[6681,3162],[19,1],[25,-10],[13,-9],[6,-10],[7,-7],[84,-46],[9,-9],[8,-12],[5,-4],[2,4],[0,18]],[[7090,2812],[1,-8],[4,-8],[2,-3],[0,-4],[0,-15],[-1,-3],[-2,-3],[-4,-2],[-9,-2],[-6,-3],[-14,-8],[-5,-2],[-6,2],[-4,2],[-34,30],[-3,2],[-8,1],[-8,1],[-26,-7],[-5,0],[-5,0],[-3,2],[-3,2],[-10,11],[-3,1],[-8,2],[-12,-1],[-7,-3],[-33,-21],[-2,-1],[-3,-1],[-3,-1],[-8,-5],[-4,-4],[-3,-5],[-6,-9],[-4,-4],[-4,-3],[-7,-2],[-2,-3],[-1,-4],[1,-8],[1,-4],[2,-4],[1,-3],[-1,-4],[-3,-5],[-9,-7],[-3,-2],[-4,-6],[-1,-3],[0,-5],[0,-5],[8,-21]],[[6942,2974],[0,-1],[3,-5],[32,-29],[3,-4],[17,-32],[5,-12],[4,-16],[0,-4],[0,-3],[1,-5],[3,-5],[16,-16],[5,-9],[3,-3],[5,-2],[24,-3],[27,-13]],[[5843,3134],[7,0],[12,1],[5,-4],[10,-8],[8,-9],[6,-12],[3,-12],[3,-5],[5,-5],[4,-7],[-3,-10],[-6,-2],[-6,2],[-14,10],[-13,21],[-6,6],[-6,1],[-19,-1],[-4,2],[-11,16],[0,7],[17,13],[8,-4]],[[6136,3114],[8,-1],[8,1],[15,3],[8,1],[4,2],[5,9],[4,2],[5,-1],[8,-4],[3,-1],[18,0],[9,-1],[8,-6],[-13,-12],[-22,-36],[-16,-7],[-16,-3],[-16,-7],[-15,-10],[-13,-12],[-2,-3],[-1,-2],[-1,-4],[0,-6],[-1,-8],[-1,-1],[-3,1],[-23,-14],[-10,-11],[-41,-20],[-7,-2],[-8,1],[-17,6],[0,-2],[-4,-3],[-5,-2],[-4,2],[-1,5],[0,8],[2,8],[1,4],[5,3],[8,9],[3,9],[-7,3],[-10,-4],[-14,-17],[-9,-3],[-1,2],[-21,16],[-2,1],[-5,-1],[-2,0],[-1,3],[1,7],[0,3],[0,2],[-1,7],[-2,7],[-13,10],[-22,36],[-11,12],[0,7],[3,9],[2,14],[0,20],[3,31],[-2,13],[-6,13],[11,7],[83,24],[8,1],[45,-7],[12,0],[25,-12],[6,-5],[3,-11],[2,-11],[2,-5],[-1,-2],[8,-6],[10,-4],[3,0],[1,-5],[-1,-6],[0,-6],[2,-2],[1,-2],[10,-10],[4,-11],[1,-8],[3,-5]],[[6615,2821],[-21,-11],[-16,4],[-31,-4],[-17,15],[5,15],[-3,5],[-7,3],[-44,-16],[-9,-6],[-24,-17],[-31,-13],[-13,-12],[-22,7],[-25,18],[-15,21],[-2,14],[-5,6],[-8,-3],[-12,-3],[-13,-6],[-15,0],[-7,0],[-3,11],[4,7],[6,14],[0,15],[-4,12],[-11,13],[-9,13],[-1,11],[2,9],[18,18],[17,24],[15,40],[-44,41],[-3,3]],[[6267,3069],[16,12],[71,25],[22,0],[-6,17],[-19,16],[-5,11],[12,-1],[12,-3],[11,-6],[9,-9],[12,6],[14,-4],[14,-10],[10,-14],[10,-5],[74,2],[26,5],[32,13]],[[5752,2616],[-4,-6],[1,8],[5,13],[7,-2],[2,-3],[-4,-8],[-4,-2],[-3,0]],[[6301,2433],[0,5],[-17,0],[-34,-10],[-17,-3],[-10,7],[-30,35],[-7,14],[2,23],[10,22],[14,18],[12,7],[2,2],[3,12],[1,4],[3,2],[7,2],[26,18],[9,9],[-18,-2],[-11,-8],[-11,-2],[-49,52],[-12,22],[-3,9],[1,7],[12,3],[7,7],[-1,14],[-6,14],[-2,6],[0,13],[1,6],[4,4],[39,23],[-5,2],[-2,2],[-2,3],[-8,-7],[-7,-4],[-7,1],[-5,10],[-16,-11],[-18,-1],[-37,5],[-46,-12],[-11,-6],[-13,-6],[-45,0],[-13,-6],[-13,-9],[-22,-23],[2,-2],[2,-4],[-11,-5],[-6,-11],[0,-12],[8,-9],[-9,-8],[-4,-3],[-5,-2],[-8,1],[-9,9],[-14,5],[-12,8],[-8,2],[-7,-1],[-5,-4],[-3,-4],[-5,-3],[-14,-4],[-37,4],[-9,-5],[-9,-10],[-9,-3],[-10,5],[6,9],[1,4],[-3,5],[4,5],[10,15],[90,89],[9,5],[13,0],[12,4],[12,5],[52,35],[13,19],[42,23],[6,12],[2,16],[2,38],[2,11],[4,4],[4,-2],[2,-6],[3,-6],[5,7],[5,11],[1,3],[26,27],[7,5],[11,4],[9,10],[13,23],[15,16],[17,9],[19,5],[20,2],[6,-2],[5,-2],[5,-2],[8,5],[14,6],[15,3],[6,4]],[[6812,1758],[10,-10],[9,-5]],[[6831,1743],[1,-8],[10,-19],[3,-16],[0,-20],[0,-20],[-6,-3]],[[7130,1581],[-18,-19],[-13,-9],[-30,-6],[-25,-15]],[[7044,1532],[-22,9],[-13,10],[3,10],[19,15],[13,10],[6,8],[-7,12],[-10,5],[-13,0],[-39,-22],[-17,0],[-6,2],[-9,2],[-10,-3]],[[6939,1590],[-7,14],[-3,23],[0,25],[0,13],[-9,12],[-10,0],[-10,5],[-7,11],[-1,22],[-10,18],[-21,10],[-15,0],[-15,0]],[[6881,1915],[14,-18],[19,-15],[2,-2],[1,-2],[1,-3],[1,-7],[2,-4],[4,-4],[14,-11],[5,-2],[7,0],[5,0],[7,3],[19,13],[6,2],[7,1],[64,-50],[7,-8],[1,-2],[9,-9],[2,-3],[2,-5],[2,-3],[3,-2],[4,-1],[12,1],[5,-1],[4,-2],[12,-10],[12,-7],[7,3]],[[7044,1532],[-12,-7],[-27,-9],[-55,-3],[-8,3],[-5,6],[-4,7],[-3,3],[-6,-4],[-17,-19],[-3,-6],[-38,-21],[-2,-1]],[[6893,1571],[39,18],[7,1]],[[3879,4302],[-10,4]],[[3869,4306],[-1,17],[-7,2],[-10,-6],[-11,-5],[-10,4],[-21,15],[-9,4],[-5,-1],[-10,-6],[-5,0],[-5,4],[-7,12],[-5,3],[-12,2],[-10,6],[-6,10],[5,13],[-4,2],[-10,7],[32,14],[22,18],[9,-1],[18,-13],[22,-9],[22,1],[22,11],[22,18],[12,5],[22,-5],[19,5],[13,-5],[6,-1],[9,3],[0,2],[-4,4],[-2,6],[2,23],[4,12],[47,48],[10,16],[6,20],[0,9],[-2,23],[2,11],[5,6],[13,4],[1,1]],[[4205,4060],[-2,-1],[-1,-4],[1,-6],[3,-4],[1,-2],[1,0],[-5,-9],[-1,1],[-4,-4],[-5,1],[-3,0],[2,-10],[22,-9],[-4,-13],[23,-16],[-9,-10],[4,-15],[-14,-8],[-35,-8],[-8,-4],[-5,-5],[-4,-6],[-4,-9],[3,-4],[6,-4],[1,-5],[-13,-5],[3,-9],[-1,-9],[-5,-8],[-6,-6],[-9,-4],[-2,4],[0,8],[0,11],[1,8],[2,6],[-2,3],[-20,-10],[-4,-5],[0,-6],[14,-25],[-4,-1],[-6,0],[-32,9],[-9,-2],[-3,0],[-1,4],[-5,8],[-6,2],[-6,-1],[-2,1],[7,8],[-16,1],[-27,-17],[-14,-3],[-69,14],[-7,4],[-3,8],[-1,8],[-4,6],[-47,29],[-11,2],[-39,-3],[-35,4],[-13,7],[-8,14],[-3,40],[-4,15],[-10,6],[-25,3],[-5,2],[-6,1],[-11,11],[-8,13],[-14,29],[-19,0],[-16,7],[-15,13],[-28,32],[-15,14],[-7,8],[-1,7],[-2,7],[-8,6],[3,2],[12,5],[35,9],[16,7],[7,6],[3,4],[8,13],[13,16],[14,13],[49,-10],[25,-1],[25,8],[65,51],[26,7],[0,1]],[[5255,4367],[5,-8],[7,-3],[6,-2],[2,-6],[1,-7],[2,-10],[10,-32],[7,-13],[11,-5],[5,-8],[4,-35],[2,-13],[21,-26],[4,-2],[-5,-9],[1,-5],[2,-4],[0,-4],[-3,-6],[-13,-16],[-4,-11],[5,-15],[-3,-15],[-6,-7],[-9,-7],[-3,-7],[9,-10],[-9,-4],[-8,-13],[-9,-2],[-8,7],[-6,13],[-6,18],[-8,3],[-7,8],[-5,10],[-1,10],[5,11],[15,16],[3,14],[-3,28],[-6,21],[-12,16],[-45,35],[-17,8],[-20,1],[0,-6],[5,-9],[-2,-9],[-5,-8],[-6,-5],[9,-1],[7,-4],[6,-4],[4,-3],[24,-2],[8,-5],[-11,-3],[-14,-3],[-4,-4],[20,-9],[-4,-11],[1,-10],[3,-7]],[[7010,4768],[-14,-18],[-2,-3],[-5,-5],[-4,-3],[-21,-8],[-4,-3],[-10,-19],[-3,-3],[-3,-3],[-11,-1],[-4,1],[-25,10],[-4,1],[-3,-2],[-3,-4],[-1,-24],[-1,-4],[-8,-14],[-3,-17]],[[6881,4649],[-55,-12],[-206,12],[-11,3],[-10,4],[-9,3],[-10,-3],[2,-2],[1,0],[0,-1],[1,-4],[-10,-4],[-11,3],[-18,14],[-9,-25],[5,-10],[4,-18],[1,-20],[-1,-14],[-7,-15],[-11,-5],[-61,5],[-16,-3],[-14,-19],[-46,6],[1,-5],[1,0],[2,-2],[-6,-3],[-4,1],[-5,3],[-3,6],[7,11],[4,-1],[3,-4],[-1,7],[-1,2],[-3,3],[-7,-10],[-10,-8],[3,-9],[1,-4],[-4,-1],[-9,-6],[22,-18],[-6,-4],[-34,-12],[-51,-32],[-31,-3],[-20,1],[0,7],[-2,1],[-2,0],[-2,1],[-2,3],[2,2],[2,4],[0,1],[-1,9],[2,12],[-1,9],[-9,3],[0,4],[-10,-6],[-7,-13],[-2,-16],[6,-14],[-26,-4],[-32,18],[-23,31],[5,36],[-9,-5],[-16,-16],[-10,-4],[-10,1],[-48,19],[-8,4],[-5,7],[-7,13],[-3,10],[-4,6],[-11,3],[-3,-4],[-6,-10],[-4,-11],[-2,-10],[6,-21],[5,-14],[4,-6],[11,0],[9,-2],[8,-5],[8,-9],[2,-11],[-5,-11],[-4,-11],[10,-13],[-9,-13],[3,-19],[3,-18],[-4,-7],[-4,-2],[-3,-4],[-4,-5],[-7,-2],[-15,2],[-14,5],[-16,10],[-6,3],[-23,-1],[-6,4],[-37,47],[-22,17],[-76,39],[-29,7],[-14,7],[-12,26],[-14,4],[-25,0],[-15,-6],[-15,-9],[-13,-11],[-10,-12],[-5,-8],[-3,-5],[0,-5],[0,-7],[1,-7],[3,-11],[5,-9],[7,-4],[4,-10],[7,-22],[11,-21],[18,-14],[0,-7],[-3,-17],[0,-8],[0,-5],[8,-15],[-13,3],[-28,13],[-13,2],[-7,7],[-4,14],[1,15],[7,9],[-4,5],[-3,6],[0,7],[3,6],[-12,2],[-6,1],[-4,4],[-3,8],[-3,13],[-4,11],[-6,6],[-13,5],[-62,60],[-18,28],[-12,32],[-3,36],[1,33],[5,17],[9,7],[14,0],[7,0],[3,3],[3,11],[6,-5],[7,-10],[2,-5],[10,-13],[4,-9],[4,-9],[0,-10],[-1,-22],[3,-9],[9,-10],[10,-8],[12,-1],[11,9],[2,4],[3,3],[0,6],[-23,39],[-4,8],[-2,7]],[[7460,4170],[-9,3],[-16,-12],[-33,2],[-21,-12],[-12,-16],[8,-21],[0,-11],[-41,-30],[4,-7],[18,-11],[4,-9],[1,-25],[-4,-10],[7,-15],[-2,-15],[-4,-5],[-13,-2],[-15,9],[-19,-9],[-12,-12],[-30,2]],[[7019,3907],[-9,15],[-2,9],[14,5],[14,11],[10,16],[0,18],[-5,0],[-2,-14],[-9,-11],[-20,-12],[-23,-11],[-12,-8],[-5,-9],[-5,-14],[-12,-6],[-29,-2],[-9,6],[-9,13],[-4,14],[6,10],[-4,10],[-6,9],[-7,4],[-9,-3],[3,-13],[-2,-13],[-4,-12],[-2,-10],[-3,-7],[-19,-21],[-11,-19],[-7,-9],[-17,-8],[-2,-10],[2,-12],[0,-11],[-23,27],[-6,4],[-10,1],[-9,2],[-8,4],[-6,6],[2,14],[3,16],[0,13],[-10,7],[0,6],[22,6],[5,27],[-2,30],[2,19],[-11,-5],[-5,-9],[-6,-23],[6,-18],[-10,-4],[-15,1],[-10,-2],[-14,-5],[-14,12],[-23,34],[-19,20],[-9,12],[-3,15],[1,7],[3,7],[1,9],[-4,13],[-2,9],[-2,2],[-15,6],[-22,38],[-15,11],[-61,71],[-11,4],[-3,3],[-7,14],[-6,6],[4,7],[7,6],[3,2],[14,32],[17,71],[22,42],[9,22],[4,8],[6,4],[14,5],[7,4],[8,9],[10,15],[6,17],[-6,15],[21,54],[13,25],[15,15],[13,2],[7,-5],[7,-6],[10,-4],[7,1],[27,12],[-8,5],[-33,13],[17,15],[10,6],[41,10],[8,-2],[4,-3],[4,-4],[5,-3],[24,-7],[13,0],[54,13],[12,6],[-45,0],[0,7],[12,1],[10,6],[10,3],[13,-4],[0,7],[-16,6],[-3,-1]],[[8159,3433],[-24,-4],[-10,-9],[-8,1],[-8,6],[-31,-3],[-10,-16],[-10,0]],[[8058,3408],[-11,14],[0,25],[1,8],[12,20],[10,5],[0,10],[-5,4],[-26,3],[-18,18],[-12,0]],[[8009,3515],[1,11],[11,8],[-1,11],[-8,8],[-4,10],[2,27],[-14,24],[-10,5],[-2,6],[25,2],[2,14],[-3,17],[11,19],[-2,9],[-26,18],[-34,-5],[-24,-14],[-1,-7],[-5,-5],[-14,-5],[-34,5],[-7,14],[-11,8],[-9,-10],[0,-14],[-4,-3],[-18,-4],[-38,5],[-35,-5],[-21,1]],[[7736,3665],[-10,13],[-13,2],[-10,15],[-12,7],[-24,-3],[-7,-7],[-17,8],[-3,20],[-16,-7],[-27,3],[-8,-7],[3,-17],[-15,-13],[7,-19],[-2,-19],[-7,-6]],[[7575,3635],[-16,1],[-20,-21]],[[8350,4262],[140,-73],[18,-14],[8,-13],[0,-8],[-1,-8],[2,-9],[7,-8],[21,-13],[9,-7],[10,-15],[11,-21],[8,-23],[0,-19],[3,-6],[3,-6],[5,-4],[7,-2],[-3,-10],[-1,-3],[5,-5],[12,-15],[5,-5],[26,-6],[7,-4],[8,-6],[14,-6],[5,-10],[5,-24],[1,-3],[17,-16],[22,-7]],[[6192,424],[-2,3],[9,17],[-24,-1],[-7,1],[-8,6],[-4,5],[-3,8],[-5,9],[-5,15],[3,8]],[[6587,570],[0,-7],[11,-38],[-14,-1],[-14,-3],[-12,-7],[-4,-14],[4,-15],[12,-5],[28,2],[0,-7],[-6,-15],[-1,-4],[-5,-1],[-5,-2],[-3,-4]],[[9118,1984],[52,9],[8,-14],[15,-5],[72,25],[27,2],[15,-9],[9,-22],[-4,-9],[6,-17],[2,-3],[11,4],[6,-21],[19,-32],[7,-3],[51,4],[31,8],[35,-4],[33,-12],[25,-1],[13,1]],[[9551,1885],[11,-4],[108,-6],[13,7],[-3,-18],[-51,-45],[9,-6],[10,-4],[23,-3],[7,6],[5,9],[3,1],[1,-19],[-8,-14],[-37,-30],[-33,-20],[-21,-8],[-45,-6],[-13,2],[-6,5],[-10,18],[-21,25],[-6,13],[-2,-18],[-9,-10],[-24,-10],[-20,-16],[-5,-2],[0,-5],[-2,-11],[-3,-11],[-3,-5],[-8,-2],[-10,-8],[-7,-3],[-8,0],[-14,6],[-6,1],[-16,-1],[-30,-11],[-15,-7],[11,-4],[11,-2],[11,-5],[8,-14],[18,16],[41,8],[20,7],[19,14],[11,1],[10,-9],[1,-7],[-2,-9],[-2,-7],[-2,-2],[2,-7],[2,-7],[5,-11],[-6,-5],[-3,-8],[0,-21],[-2,-5],[-5,-4],[-10,-7],[18,1],[6,-3],[2,-4],[-18,-26],[-33,-27],[-29,-16]],[[9389,1512],[0,1],[-5,5],[-43,14],[-22,6],[-22,7],[-24,-7],[-9,-24],[7,-6],[1,-2]],[[9272,1506],[-2,0],[-1,-1],[-12,-11],[-10,-2],[-8,-1],[-9,-2],[-8,-7],[-11,9],[-3,-1],[-1,0]],[[9207,1490],[-1,11],[-11,4],[-30,9],[-35,4],[-46,8],[-23,1]],[[9061,1527],[-3,4],[-5,15],[-15,5],[-9,9],[-13,21],[-2,9],[-11,2],[-30,-9],[-23,-2]],[[9984,2416],[15,-43],[-3,-8],[-8,-9],[-16,-47],[0,-9],[-1,-8],[-29,-66],[-20,-32],[-7,-7],[-7,-10],[-1,-24],[1,-41],[-3,-17],[-12,-32],[-2,-16],[-10,-25],[-1,-12],[-3,-5],[-51,-19],[-11,-11],[-9,6],[-4,-7],[-2,-12],[-5,-6],[-4,-3],[-16,-21],[-45,-44],[-8,-10],[-7,-2],[-44,49],[-19,6],[-32,22],[-18,3],[0,-6],[23,-19],[14,-9],[30,-6],[6,-3],[3,-4],[0,-14],[-2,-4],[-14,2],[-7,0],[-14,-4],[-8,-1],[-8,2],[-18,10],[-14,-1],[-32,-9],[-16,-2],[6,-3]],[[9143,2324],[29,0],[43,13],[52,-6],[24,7],[8,-6],[14,-3],[-25,-16],[-3,-6],[2,-13],[15,-9],[26,-1],[12,-8],[23,2],[32,13],[29,-12],[32,0],[27,-21],[40,13],[27,-8],[31,0],[24,-8],[26,-2],[21,6],[26,19],[32,2],[7,6],[18,29],[31,14],[19,2],[2,3],[-12,11],[3,6],[8,0],[15,-9],[16,6],[19,-6],[16,6],[17,-8],[2,11],[7,8],[9,-1],[28,-14],[12,5],[18,15],[3,-5],[7,6],[-2,10],[-16,5],[-14,16],[6,19],[8,7],[10,3],[33,-11],[3,0],[1,2]],[[9034,2664],[4,1],[26,-2],[11,-6],[18,-22],[9,-4],[0,6],[-3,14],[13,17],[17,17],[8,12],[4,22],[8,25],[10,22],[9,16],[22,19],[32,13],[35,6],[31,-1],[-5,7],[13,4],[15,-3],[14,-5],[14,-3],[55,0],[26,-6],[29,-12],[31,-7],[29,12],[-6,4],[-8,3],[-8,0],[-9,0],[0,6],[200,-41],[78,-35],[161,-105],[19,-19],[15,-22],[12,-43],[12,-27],[9,-27],[-5,-19],[4,-14],[1,-18],[0,-33]],[[8770,911],[21,-15],[28,-16],[27,-22],[17,-26],[2,-10]],[[8865,822],[-123,40],[-22,2],[-1,-1]],[[8719,863],[-14,25],[0,9],[11,7],[20,-2],[6,12],[8,5],[5,0],[8,-10],[7,-1],[0,3]],[[9061,1527],[10,-16],[-36,-12],[-5,-10],[-16,3],[-4,-19],[-11,-9]],[[9207,1490],[-14,0],[-44,-11],[-4,-6],[-2,-9],[-4,-11],[-8,-9],[-10,-4],[-9,-4],[-10,-5]],[[9102,1431],[-10,-3],[-8,-3],[-12,2],[-5,8],[-5,9],[-10,0],[-21,-6],[-33,11]],[[9416,950],[-44,13],[-25,-8],[-64,-55],[-26,-11],[-140,-26],[-24,-10],[-3,0],[-7,-8],[-7,-10],[-1,-4],[-22,-12],[-24,-31],[-24,0],[-13,1],[-30,10],[-7,1],[-22,0],[-6,3],[-12,10],[-12,4],[-27,2],[-11,3]],[[8770,911],[1,7],[1,10],[6,24],[15,20],[-8,19],[25,21],[4,0],[11,-11],[18,1],[5,10],[1,27],[5,9],[12,16],[-3,5],[-9,1],[-4,12],[-15,7],[5,12],[14,1],[9,6],[2,11],[12,1],[-10,22]],[[8867,1142],[27,0]],[[8894,1142],[22,1],[23,7],[14,-5],[-8,-25],[52,9],[29,-10],[42,9],[2,-2],[1,-10],[15,-5],[-1,-14],[15,3],[13,-7],[10,-15],[38,-16],[3,-16],[37,-11],[21,-17],[57,13],[11,-4],[14,-13],[43,2],[15,-8],[23,-41],[10,0],[8,6],[11,-6],[4,-12],[-2,-5]],[[9286,1375],[-1,-7],[-3,-9],[-9,-33],[-16,-12],[-20,-11],[-18,14],[-19,14],[-19,4],[-11,-2],[-11,-6],[-7,-1],[-9,1],[-1,6],[7,17],[20,25],[11,10],[5,23],[-4,8],[-13,1],[-4,10],[2,13],[10,16],[6,5],[2,0],[1,2]],[[9185,1463],[15,4],[103,-14],[9,-6],[9,-13],[0,-8],[-6,-5],[-14,-2],[-23,5],[-10,-1],[-20,-17],[-24,-5],[-12,-7],[5,-5],[5,-6],[4,-6],[7,-2],[53,0]],[[9389,1512],[-8,-4],[-29,-8],[-51,7],[-18,-1],[0,1],[-9,0],[-2,-1]],[[6988,8150],[-18,-9],[-4,-4],[-1,-8],[3,-6],[1,-5],[-8,-6],[7,-15],[3,-12],[-4,-10],[-14,-7],[-31,25],[0,6],[8,7],[-7,14],[-19,23],[7,-4],[8,-2],[8,2],[8,4],[0,7],[-44,0],[0,5],[25,9],[28,4],[30,-2],[15,-5],[-1,-11]],[[6755,8219],[34,-39],[-9,-5],[0,-7],[7,-1],[6,-2],[9,-10],[0,-5],[-12,-2],[-16,-4],[-13,-7],[-8,-13],[19,1],[38,14],[19,-2],[-16,-18],[-32,-7],[-61,0],[-3,5],[-13,23],[-2,8],[-7,5],[-7,4],[-6,5],[-13,18],[-1,6],[3,3],[1,4],[-3,6],[-5,1],[-7,-5],[-4,1],[-6,4],[-6,-1],[-6,1],[-2,9],[10,18],[1,3],[15,11],[29,8],[8,0],[10,-5],[22,-16],[14,-3],[13,-6]],[[6813,8444],[22,-17],[9,0],[8,3],[7,1],[7,-4],[10,-11],[6,-4],[-9,-5],[-5,-1],[12,-10],[37,-15],[-5,-2],[-2,-1],[-2,-3],[3,-2],[3,-3],[3,-2],[-38,-11],[-6,2],[-5,-15],[-13,-13],[-15,-10],[-11,-3],[9,-6],[13,-4],[24,-2],[10,6],[10,11],[11,7],[24,-17],[9,2],[9,6],[9,3],[10,-5],[7,-8],[7,-5],[11,6],[-1,-4],[-2,-11],[-1,-4],[13,-2],[11,5],[11,7],[12,3],[14,1],[7,-2],[3,-6],[-4,-9],[-27,-14],[-9,-7],[7,-12],[9,-8],[11,-3],[13,3],[-9,19],[-4,6],[12,1],[21,11],[11,1],[9,-3],[4,-8],[1,-10],[-1,-14],[-5,-6],[-12,-5],[-25,-4],[-8,-5],[-15,-20],[-10,-6],[-10,1],[-49,15],[-8,5],[-7,8],[-23,37],[-5,5],[-8,-1],[-9,-9],[-11,-7],[-12,2],[-6,-4],[-6,1],[-7,2],[-8,1],[9,-13],[-20,1],[-8,-3],[-3,-10],[-16,5],[-38,-5],[-17,12],[-7,20],[2,20],[8,17],[11,12],[0,6],[-5,6],[-4,6],[-3,6],[-2,7],[-7,-3],[-4,-4],[-1,-6],[4,-6],[0,-6],[-6,3],[-6,1],[-5,-1],[-6,-3],[6,-4],[3,-5],[-1,-7],[1,-2],[3,-12],[-5,-8],[-15,-12],[0,-5],[-22,6],[-20,23],[-8,31],[10,27],[4,6],[-4,41],[17,27],[29,15],[31,4],[32,-1],[17,-4]],[[7163,8453],[-2,-4],[18,1],[8,-2],[5,-4],[-8,1],[-7,-5],[-2,-8],[8,-8],[8,-2],[8,2],[15,7],[1,-5],[-2,-1],[-1,0],[-2,-1],[-4,-11],[4,-5],[17,-9],[-11,-9],[-28,-3],[-14,-6],[-1,20],[-10,11],[-13,1],[-11,-7],[2,-14],[-14,-4],[-10,7],[13,17],[10,4],[10,1],[8,3],[3,11],[-4,5],[-20,16],[-7,3],[26,7],[9,-1],[0,-6],[-2,-2]],[[6895,8480],[5,0],[26,5],[8,0],[10,-4],[0,-5],[0,-1],[-2,0],[-3,-1],[-11,-11],[2,-15],[0,-12],[-19,-5],[-21,1],[-19,4],[-17,8],[-14,14],[-4,17],[11,12],[19,7],[16,-1],[1,-1],[1,-4],[2,-4],[5,-3],[4,-1]],[[7063,8537],[0,-6],[9,1],[7,-1],[7,-4],[4,-9],[-4,-8],[-15,-16],[-3,-4],[0,-14],[2,-12],[5,-8],[10,-1],[0,-6],[-19,-5],[-11,-1],[-5,3],[-2,13],[-6,8],[-9,5],[-9,2],[0,19],[8,-5],[6,1],[7,3],[7,1],[1,4],[-4,15],[1,6],[-2,12],[3,9],[7,5],[10,0],[0,-7],[-5,0]],[[7305,8583],[2,-9],[-31,-1],[-12,-5],[-6,-10],[-7,-5],[-12,-21],[-5,-5],[-7,-3],[-1,20],[-10,-1],[-29,-25],[4,10],[1,3],[0,6],[-12,-6],[-6,1],[-4,5],[-24,-24],[-14,-10],[-11,2],[-2,-12],[-3,-6],[-4,2],[0,11],[3,13],[5,4],[6,2],[8,5],[6,6],[11,14],[5,5],[8,3],[7,0],[4,3],[3,13],[-4,3],[-9,10],[15,0],[26,12],[17,1],[0,-7],[-10,-5],[-10,-6],[-16,-15],[5,-1],[2,-1],[2,-3],[8,5],[21,3],[17,14],[10,1],[10,0],[10,2],[14,16],[9,8],[4,-3],[6,-19]],[[6948,8633],[0,-1],[-2,0],[-2,-1],[-7,-7],[0,-4],[2,-8],[-13,-1],[-4,1],[0,-7],[50,-11],[9,-4],[13,-24],[3,-5],[7,-3],[7,-1],[7,-1],[6,-7],[0,-5],[-13,0],[-8,-5],[-15,-15],[1,8],[1,6],[2,6],[5,5],[-32,23],[-17,7],[-18,2],[0,-7],[3,-3],[6,-10],[-9,7],[-5,-8],[-5,-3],[-5,1],[-7,3],[-4,4],[-3,4],[-10,20],[-1,5],[-2,4],[-6,7],[-6,3],[-6,0],[-4,2],[-2,8],[13,1],[21,-4],[10,3],[18,20],[10,5],[12,-6],[0,-4]],[[4799,6506],[0,-7],[17,0],[-8,-33],[-13,-19],[-18,-8],[-24,-2],[-12,5],[-11,22],[-9,5],[-9,3],[-21,17],[-12,5],[39,34],[20,13],[25,2],[34,-16],[14,-13],[-12,-8]],[[4640,6536],[-21,-3],[-21,1],[-16,3],[10,7],[22,10],[12,2],[8,-5],[15,-3],[8,-5],[-17,-7]],[[5022,6756],[-22,-7],[-17,6],[-14,12],[-4,12],[15,8],[22,-4],[17,-13],[3,-14]],[[4985,6944],[-3,-14],[-10,-27],[-10,-32],[1,-28],[5,-6],[9,-15],[3,-15],[-10,-7],[-11,-3],[-10,-6],[-11,-3],[-11,5],[2,7],[1,2],[2,4],[-7,8],[-1,15],[5,59],[5,15],[10,7],[19,2],[0,6],[-5,4],[-3,5],[-5,10],[7,5],[6,1],[14,-6],[0,7],[-10,12],[6,-1],[5,-3],[4,-3],[3,-5]],[[4994,6977],[0,-15],[-10,4],[-4,10],[2,12],[7,12],[-2,2],[-1,1],[-1,3],[4,6],[5,4],[4,0],[5,-4],[-9,-35]],[[4773,7131],[5,-10],[6,-5],[15,-10],[6,-6],[16,-21],[2,-4],[29,-19],[12,-12],[7,-9],[3,-7],[6,-64],[6,-27],[1,-13],[-1,-13],[-6,-21],[-1,-12],[-4,-7],[-17,-13],[-6,-8],[8,5],[11,6],[11,4],[10,-3],[5,-9],[-3,-9],[-7,-7],[-4,-6],[3,-15],[10,-10],[9,-6],[5,-7],[-5,-8],[-22,-10],[-9,-6],[56,5],[14,-3],[3,-7],[-8,-9],[-16,-6],[0,-6],[18,2],[14,5],[13,1],[15,-11],[6,-4],[8,0],[17,1],[9,-4],[6,-8],[5,-8],[4,-6],[9,0],[6,4],[4,6],[3,3],[27,0],[19,14],[18,5],[19,0],[11,-12],[48,0],[-11,-22],[0,-6],[3,-10],[-2,-9],[-5,-7],[-13,-14],[-24,-15],[-10,-4],[-25,-2],[-5,-7],[-1,-20],[-6,-12],[-14,-9],[-14,-6],[-6,-4],[-5,-7],[-38,-41],[-10,-8],[-12,-7],[-35,-5],[-9,3],[-6,12],[2,16],[18,19],[-2,8],[0,7],[4,2],[1,2],[3,9],[2,4],[5,4],[11,18],[6,6],[7,5],[63,24],[0,7],[-18,-8],[-18,-4],[-55,-1],[-4,3],[-1,5],[0,6],[-1,5],[-16,20],[-8,9],[-8,3],[3,-10],[3,-7],[7,-15],[-6,-13],[-5,-6],[-6,-5],[4,-7],[-8,-8],[-5,-10],[-6,-9],[-10,-4],[-8,7],[-4,16],[-2,19],[-1,14],[-6,5],[-3,1],[-4,-2],[-5,-4],[-5,5],[-5,4],[-6,3],[-6,0],[0,-6],[9,-7],[-11,-6],[-91,-18],[0,7],[7,5],[20,19],[0,6],[-12,1],[-12,-3],[-11,-4],[-10,-6],[-12,14],[-10,17],[7,3],[6,3],[5,5],[4,7],[-29,-2],[-11,3],[-31,31],[-1,3],[-4,9],[-2,4],[-3,4],[-3,2],[-2,3],[-2,6],[30,17],[12,4],[15,-2],[11,-8],[12,-11],[13,-9],[18,-3],[-9,12],[-40,26],[-9,8],[-4,3],[-7,1],[-8,-1],[-14,-5],[-8,0],[10,6],[0,6],[-6,1],[-12,6],[5,1],[1,1],[2,4],[-6,2],[-4,5],[-1,8],[3,10],[-10,-2],[-13,-12],[-8,-5],[3,8],[1,9],[-2,8],[-6,7],[-6,-12],[-7,-4],[-8,-2],[-6,-8],[-1,-10],[7,-17],[-1,-10],[-11,-7],[-59,16],[-15,7],[-13,11],[-4,13],[-6,24],[-27,16],[-7,20],[40,0],[-9,8],[-6,10],[-1,11],[4,11],[9,10],[7,3],[6,-3],[34,-39],[4,-8],[6,-6],[12,-7],[8,-1],[-3,11],[0,6],[2,2],[3,3],[3,1],[-11,11],[-2,2],[-2,3],[-6,6],[-1,4],[2,4],[6,1],[1,4],[5,4],[12,-1],[19,-7],[-6,17],[-17,14],[-20,10],[-16,3],[9,9],[7,14],[1,13],[-7,8],[0,7],[13,0],[9,-7],[7,-9],[15,-7],[2,-7],[1,-9],[2,-5],[6,-6],[4,-3],[31,-13],[7,-4],[7,-9],[9,-8],[9,1],[9,4],[11,0],[-15,-27],[6,-1],[14,13],[8,18],[8,-3],[50,-50],[0,6],[-4,3],[-3,6],[-3,4],[1,12],[-9,12],[-22,20],[-11,19],[2,9],[9,9],[8,19],[-8,-1],[-7,1],[-7,2],[-4,4],[3,12],[-4,8],[-5,5],[-3,6],[-1,11],[1,3],[5,1],[26,13],[4,3],[6,11],[3,11],[5,7],[8,-3],[5,1],[2,2],[3,3]],[[5809,6163],[-2,0],[-30,2],[-3,1],[-18,8],[-48,-6],[-19,9],[-1,0],[-4,1],[-15,1],[-30,-13],[-32,-4],[-12,-15],[-14,-5],[-9,-10],[-45,8],[-16,13],[-83,8],[-1,1],[-4,0]],[[5423,6162],[4,6],[-12,6],[0,7],[5,3],[15,10],[16,-2],[9,1],[19,13],[14,0],[28,-7],[14,3],[25,13],[52,10],[11,6],[-106,-18],[-51,19],[0,5],[7,13],[4,4],[43,37],[12,15],[11,18],[-38,-26],[-6,-8],[-3,-6],[-6,-5],[-8,-3],[-7,-2],[-6,-2],[-2,-7],[-1,-8],[-2,-7],[-9,-14],[-8,-8],[-10,-3],[-11,-1],[-6,-2],[-6,-8],[-14,-4],[-5,-5],[-7,-11],[-19,-18],[-10,-6],[-13,-2],[-7,-4],[-9,-16],[-6,-4],[-8,-2],[-8,-5],[-7,-6],[-26,-31],[-42,-40],[-44,-27],[-5,-2],[-5,4],[-8,12],[-7,2],[-10,2],[-13,4],[-11,6],[-8,7],[10,15],[3,8],[1,9],[-5,0],[-24,-27],[-39,7],[-97,62],[-4,7],[1,15],[7,7],[9,2],[33,2],[22,-3],[21,-9],[18,-14],[5,7],[-16,10],[-6,6],[-1,9],[69,36],[16,1],[40,-16],[17,-3],[34,2],[19,4],[14,7],[-60,-6],[-15,2],[-32,16],[-27,6],[-70,-31],[-25,-5],[-6,0],[-9,2],[-14,8],[-9,2],[-44,-3],[-48,11],[-16,-2],[-13,-9],[-12,-7],[-16,3],[-15,7],[-8,6],[-4,5],[-3,5],[-2,6],[0,6],[1,8],[3,1],[5,-2],[4,2],[15,18],[8,5],[99,8],[8,3],[23,14],[9,3],[11,-2],[7,-5],[6,-7],[10,-6],[34,-11],[5,-4],[0,10],[-4,10],[-6,7],[-12,1],[0,7],[8,1],[8,-1],[8,-2],[7,-5],[9,9],[15,4],[16,-3],[13,-3],[-48,18],[-13,12],[0,10],[9,7],[67,7],[26,10],[21,16],[-8,3],[-12,-1],[-11,-4],[-10,-15],[-13,0],[-26,5],[6,9],[26,22],[-29,5],[-61,-11],[-30,6],[21,5],[23,1],[0,7],[-5,2],[-13,11],[12,11],[7,18],[6,21],[7,18],[11,12],[18,10],[20,5],[17,-2],[6,-6],[13,-18],[7,-7],[9,-6],[10,-4],[22,-2],[35,6],[31,12],[0,7],[-11,-3],[-11,-5],[-9,-2],[-9,3],[-14,-8],[-14,4],[-14,7],[-13,4],[-10,5],[3,11],[1,13],[-15,8],[-5,-1],[-14,-4],[-7,-1],[-6,2],[-11,8],[-7,2],[-7,7],[9,15],[27,27],[8,10],[5,3],[8,1],[19,-1],[6,4],[12,5],[16,-5],[27,-16],[13,-5],[64,-1],[3,3],[5,6],[11,1],[10,-2],[5,-2],[4,0],[0,7],[-12,6],[-55,-7],[-15,-5],[-8,-1],[-5,3],[-16,17],[-8,5],[-54,13],[-8,9],[5,16],[22,25],[9,12],[-12,16],[15,17],[27,13],[23,4],[21,-12],[20,-19],[22,-13],[25,7],[0,6],[-27,5],[-6,4],[-9,13],[-7,6],[-6,3],[-6,6],[8,14],[16,13],[15,4],[0,7],[-15,5],[-11,-7],[-8,-11],[-8,-6],[-11,-3],[-23,-12],[-13,-4],[-13,2],[-25,9],[-12,2],[-28,-7],[-14,0],[-5,13],[2,3],[15,28],[6,4],[14,7],[5,5],[6,4],[5,-4],[4,-6],[3,-3],[15,2],[72,26],[29,21],[6,26],[-11,2],[-18,-14],[-29,-32],[-17,-10],[-15,2],[-16,6],[-18,2],[15,8],[6,6],[-2,8],[-5,11],[-1,6],[-3,0],[-10,-8],[-44,-44],[-16,-6],[-34,-4],[-15,6],[-11,36],[2,-1],[3,1],[3,3],[1,3],[-2,3],[-6,7],[-1,3],[0,12],[2,6],[7,6],[-7,3],[-20,5],[-4,2],[-2,10],[-6,15],[-1,12],[2,7],[9,15],[2,6],[1,13],[0,12],[3,7],[10,0],[-2,4],[-2,10],[-1,4],[11,4],[12,-2],[11,-6],[35,-27],[11,-6],[5,3],[11,-13],[6,-3],[19,-11],[8,-1],[-4,5],[-2,5],[-1,4],[-2,5],[46,6],[27,-4],[15,1],[3,6],[-20,12],[-29,6],[-29,-3],[-18,-12],[-22,19],[4,3],[5,9],[-22,3],[-11,15],[-8,18],[-12,14],[-10,3],[-10,1],[-8,4],[-3,11],[4,11],[13,12],[-4,8],[0,7],[24,10],[12,1],[19,-17],[9,1],[6,7],[5,10],[-7,2],[-4,4],[-5,6],[-6,6],[-8,4],[-53,9],[-2,10],[3,24],[-1,10],[1,8],[-5,18],[-1,12],[2,10],[5,8],[7,8],[8,5],[17,5],[17,1],[17,-4],[15,-8],[-2,-13],[2,-18],[4,-18],[5,-14],[7,-9],[8,-7],[10,-4],[11,1],[-5,4],[-3,4],[-5,11],[8,1],[6,-2],[12,-5],[-4,18],[3,12],[1,12],[-9,14],[-25,18],[-8,10],[7,10],[-5,1],[-2,1],[-2,4],[6,9],[15,15],[5,7],[10,-9],[7,-4],[23,0],[-3,-24],[18,-19],[26,-11],[21,-2],[-4,7],[8,8],[8,26],[6,9],[8,0],[29,-10],[9,-5],[19,-17],[21,-10],[47,-14],[-9,13],[-8,6],[-19,6],[-28,22],[-42,15],[-5,3],[-1,5],[-1,3],[-1,2],[3,6],[4,1],[5,-4],[5,-1],[4,11],[12,-6],[18,-20],[14,-6],[7,1],[13,4],[7,1],[8,-2],[14,-8],[7,-1],[8,-4],[23,-18],[28,-9],[18,-26],[14,-6],[-4,5],[-5,8],[-3,9],[-2,6],[-3,6],[-65,43],[-16,3],[0,7],[13,0],[5,7],[-1,10],[-6,12],[-8,5],[-21,3],[-9,7],[-19,3],[-27,26],[-16,2],[1,3],[1,0],[3,3],[-10,10],[-13,4],[-26,-2],[2,4],[1,3],[2,3],[4,3],[0,7],[-22,29],[13,12],[24,-5],[16,-24],[14,9],[14,-4],[14,-1],[15,15],[-4,0],[4,9],[-1,8],[-3,7],[-5,7],[9,0],[0,6],[-13,7],[9,5],[18,3],[9,4],[0,7],[-22,-1],[-10,1],[-9,6],[5,5],[-5,5],[-5,4],[-6,2],[-6,2],[1,4],[2,11],[2,4],[-8,0],[-7,4],[-30,34],[1,15],[10,3],[15,-5],[27,-14],[11,-2],[11,2],[26,13],[14,3],[14,-1],[13,-8],[5,6],[9,6],[9,5],[6,1],[11,-2],[20,-13],[9,-3],[32,2],[10,-2],[44,-26],[-6,10],[-7,6],[-18,10],[8,5],[19,3],[9,4],[-41,6],[-13,0],[-5,-2],[-8,-8],[-7,-2],[-6,2],[-13,8],[-7,2],[-10,5],[-19,22],[-7,5],[-1,3],[-12,14],[-2,2],[-5,11],[-2,7],[-2,7],[13,0],[-6,9],[0,9],[5,10],[6,9],[0,5],[-1,6],[0,5],[3,2],[5,-1],[8,-4],[4,0],[38,-20],[27,1],[-18,11],[-6,6],[2,7],[-5,7],[-5,-5],[-7,-2],[-7,-1],[-7,1],[0,7],[6,0],[2,0],[0,6],[-4,1],[-3,1],[-6,5],[36,16],[16,-6],[19,-10],[-71,46],[0,17],[1,8],[5,4],[35,15],[9,8],[8,14],[-4,0],[5,19],[2,19],[4,15],[11,10],[83,-14],[15,-7],[12,-11],[0,-5],[3,-15],[4,-12],[2,1],[0,-10],[-2,-8],[-3,-7],[-4,-7],[12,7],[5,9],[1,9],[0,10],[3,13],[5,6],[4,6],[-3,16],[11,-8],[20,-19],[11,-5],[18,-10],[8,-2],[7,-3],[1,-8],[-3,-8],[-3,-6],[-7,-7],[-23,-17],[-12,-23],[-12,-17],[-6,-13],[12,2],[38,32],[7,2],[4,15],[10,6],[13,5],[12,8],[7,16],[4,17],[7,12],[16,6],[27,-4],[28,-9],[31,-18],[0,-7],[-1,-3],[1,-10],[-15,-13],[-10,-16],[-8,-19],[-11,-20],[11,4],[11,8],[17,19],[1,4],[-1,4],[0,3],[3,2],[3,1],[26,21],[2,2],[25,13],[17,7],[6,0],[13,-3],[20,-14],[14,-3],[-9,7],[7,4],[4,6],[3,5],[4,3],[7,1],[13,-5],[9,-1],[5,3],[5,12],[7,3],[25,0],[14,-4],[5,0],[8,4],[5,6],[8,16],[6,3],[6,1],[1,1],[1,-3],[12,-17],[4,-3],[14,2],[55,-6],[56,6],[28,10],[44,25],[25,9],[40,6],[21,-1],[15,-5],[-7,-5],[-2,-1],[16,-11],[18,1],[37,10],[36,-12],[17,0],[9,18],[-11,4],[-12,6],[-10,9],[-7,13],[14,15],[10,4],[11,-1],[3,-5],[1,-8],[3,-8],[4,-4],[20,0],[43,10],[26,2],[33,-18],[22,0],[42,6],[22,-7],[-4,-17],[-12,-18],[-3,-14],[-7,-8],[-10,-16],[-6,-8],[-17,-12],[-5,-6],[-7,-18],[0,-14],[7,-11],[14,-7],[8,1],[7,3],[6,1],[5,-5],[2,-10],[-3,-8],[-6,-6],[-6,-1],[-6,-32],[-28,-41],[-35,-38],[-24,-20],[-27,-12],[-57,-15],[-22,-11],[-35,-26],[-5,-8],[-5,-15],[-12,-16],[-28,-23],[-142,-87],[-48,-19],[-11,-9],[-6,-9],[-6,-19],[-4,-7],[-6,-4],[-16,-7],[-21,-4],[-41,-21],[-6,-3],[-4,-6],[-3,-7],[0,-10],[-11,5],[-3,2],[5,6],[-9,3],[-17,2],[-19,8],[-3,-3],[2,-8],[6,-8],[9,-6],[21,0],[10,-4],[4,-4],[14,-18],[-14,-17],[-3,-9],[3,-11],[-10,1],[-19,5],[-10,0],[-6,-3],[-12,-12],[-5,-4],[-18,1],[-37,14],[-18,4],[-52,-10],[-15,7],[-20,22],[-13,9],[-13,3],[34,-39],[21,-13],[25,-4],[26,10],[13,1],[12,-8],[11,-10],[15,-8],[11,0],[-4,15],[41,-21],[23,-5],[37,22],[20,-4],[12,-11],[-9,-12],[21,-4],[24,8],[23,16],[19,21],[9,8],[8,-1],[5,-9],[-2,-15],[-5,-7],[-88,-88],[-15,-9],[-17,-20],[-8,-6],[-13,-2],[-10,3],[-4,9],[9,15],[-18,12],[-22,-6],[-50,-34],[-9,-3],[-16,-1],[-43,-9],[-12,2],[-11,-1],[-4,-10],[-5,-13],[-10,-6],[-9,-3],[-42,-32],[-6,-6],[-5,-9],[-5,-14],[3,-1],[9,5],[19,6],[10,8],[9,9],[7,9],[7,8],[30,14],[25,20],[27,11],[6,0],[7,-3],[9,-8],[32,-5],[14,0],[11,6],[8,7],[28,14],[10,1],[3,-12],[-13,-19],[-19,-17],[-19,-12],[-23,-27],[2,-5],[2,-3],[3,-3],[2,-2],[-30,-2],[-12,-6],[-11,-10],[6,-9],[-5,-1],[-14,3],[-36,0],[0,-6],[19,0],[9,-2],[8,-4],[-12,-21],[-8,-9],[-7,-7],[23,-5],[12,-1],[14,6],[10,10],[5,6],[0,2],[15,1],[7,3],[12,13],[9,7],[10,5],[10,2],[11,5],[-7,10],[-24,16],[18,0],[59,7],[62,-5],[20,5],[54,30]],[[5544,5067],[-29,-4],[-35,2],[-30,9],[-27,14],[-26,18],[0,6],[-1,6],[-5,25],[-3,7],[0,6],[3,2],[2,3],[1,2],[3,5],[-16,18],[-12,18],[-6,22],[3,30],[9,19],[16,20],[20,14],[21,3],[-1,3],[-2,7],[-1,3],[17,1],[5,-1],[42,-17],[12,-8],[13,-17],[9,-20],[13,-45],[-8,-12],[28,-23],[2,-21],[-6,-3],[-10,0],[-6,-3],[4,-12],[5,-4],[27,-9],[-15,-9],[1,-12],[7,-14],[2,-15],[-9,-8],[-17,-6]],[[5614,5331],[-4,-6],[-8,1],[-7,7],[-7,17],[-42,31],[-7,16],[-8,25],[-1,12],[-22,12],[-4,7],[-6,14],[-7,16],[0,14],[21,9],[20,-14],[20,-17],[6,-3],[6,-1],[4,-3],[4,-20],[4,-5],[6,-2],[6,-4],[8,-12],[6,-12],[4,-12],[7,-29],[-1,-5],[-4,-5],[-7,-12],[7,-4],[5,-7],[1,-8]],[[4907,5424],[3,-27],[3,-9],[10,-9],[9,-8],[6,-3],[3,-3],[-1,-8],[-3,-8],[-1,-6],[3,-5],[5,-3],[10,-4],[-2,-10],[1,-11],[2,-9],[3,-7],[0,-6],[-7,-3],[-7,-4],[-5,-5],[-3,-8],[-4,7],[-12,-14],[-15,-11],[-17,-8],[-18,-4],[-27,3],[-9,-3],[-4,-20],[-3,-3],[-6,-6],[-17,-11],[-16,-4],[-16,4],[-9,20],[4,21],[14,13],[35,16],[-14,32],[-7,8],[-26,10],[-6,0],[3,17],[17,17],[29,22],[-14,6],[-19,3],[-18,-3],[-13,-9],[-15,-31],[-9,-15],[-21,-12],[-21,-24],[-8,-8],[-18,-2],[-8,8],[1,15],[8,16],[-3,2],[-3,4],[-3,1],[7,15],[29,34],[-22,13],[8,6],[6,6],[2,8],[1,14],[2,12],[5,7],[23,14],[35,12],[8,7],[7,5],[9,-3],[-5,-6],[-8,-26],[0,-6],[5,-16],[5,-7],[8,-2],[0,7],[-5,18],[14,20],[20,16],[24,11],[16,18],[8,4],[9,2],[10,5],[8,6],[6,6],[7,-2],[4,-4],[2,-5],[3,-39],[8,-51]],[[4887,5681],[-20,-29],[-8,-18],[2,-16],[-13,-8],[-18,-4],[-17,1],[-14,5],[10,7],[5,10],[3,12],[6,11],[14,14],[4,6],[4,3],[11,-3],[5,3],[-2,4],[-1,2],[-2,6],[11,1],[10,4],[7,0],[3,-11]],[[5116,5597],[-55,-86],[-14,-36],[-7,2],[-16,-16],[-10,-5],[-5,-7],[-6,-35],[-5,-14],[-16,-9],[-26,1],[-23,12],[-10,23],[-6,44],[2,16],[6,14],[10,7],[11,4],[10,9],[19,13],[51,8],[21,14],[-15,1],[-24,-6],[-22,0],[-9,14],[8,21],[18,24],[20,19],[13,8],[19,5],[50,39],[33,26],[19,11],[14,-6],[3,-8],[1,-13],[0,-11],[-11,-8],[-9,-14],[-13,-10],[-26,-51]],[[5151,5726],[-15,-1],[7,15],[10,9],[22,13],[5,-7],[5,-14],[-14,-9],[-20,-6]],[[5224,5818],[2,-13],[-5,-13],[-7,-13],[-6,-28],[-6,5],[-13,25],[7,9],[7,21],[8,7],[3,-3],[4,-2],[3,0],[3,5]],[[5242,5875],[-3,-11],[-7,-7],[-3,-8],[4,-12],[-15,-7],[-12,6],[-4,14],[9,19],[8,5],[15,-2],[8,3]],[[5295,5962],[-10,-16],[-11,-10],[-14,-6],[-18,1],[3,9],[4,5],[11,11],[20,-1],[9,2],[6,5]],[[4870,6006],[-34,-1],[-16,2],[-17,12],[7,8],[7,7],[8,3],[9,0],[10,-8],[19,-12],[7,-11]],[[4404,5983],[-14,0],[-40,14],[-6,11],[-4,14],[-6,15],[14,7],[43,5],[15,4],[24,13],[14,2],[34,10],[16,0],[8,-16],[-9,-12],[-39,-4],[-1,-15],[-13,-9],[-15,-2],[-13,-5],[-12,-16],[4,-16]],[[4952,6142],[16,-18],[26,-49],[2,-7],[0,-6],[2,-4],[7,-2],[64,0],[5,-3],[5,-6],[5,-3],[10,5],[6,1],[7,-1],[4,-3],[15,-17],[5,-4],[6,-2],[12,2],[5,0],[7,-5],[9,-8],[7,-11],[3,-11],[5,-2],[9,2],[7,-4],[-3,-18],[-6,3],[-5,2],[-12,2],[6,-7],[9,-13],[5,-12],[-8,-6],[-21,0],[-10,3],[2,10],[-4,4],[-4,2],[-5,0],[-5,0],[2,-12],[-7,-11],[-22,-15],[0,-6],[11,6],[11,4],[25,3],[10,-5],[-4,-10],[-11,-10],[-58,-31],[-25,-5],[-21,11],[4,3],[7,6],[6,7],[1,9],[-5,5],[-8,-1],[-16,-4],[-3,-3],[-4,-7],[-4,-6],[-6,-3],[-22,-4],[-52,-21],[-11,-9],[-7,-5],[-8,1],[-8,5],[-8,2],[-6,-2],[-15,-8],[-7,-3],[-60,0],[-4,-3],[-3,-6],[-4,-7],[-7,-3],[-8,1],[-13,3],[-18,9],[-12,10],[-9,14],[-4,17],[6,13],[14,7],[16,3],[13,-2],[10,-10],[9,-13],[9,-8],[12,7],[0,6],[-5,1],[-3,1],[-2,2],[-4,2],[12,4],[29,-5],[10,4],[11,8],[45,8],[29,16],[12,10],[-4,5],[-13,-3],[-38,-16],[-31,-7],[-16,1],[-13,9],[-3,10],[3,9],[6,7],[8,2],[8,2],[5,5],[9,18],[2,7],[3,6],[6,6],[6,2],[23,-2],[39,14],[7,5],[4,9],[1,9],[-3,8],[-6,5],[-42,-17],[-14,-1],[-4,-3],[-6,-4],[-6,-1],[-6,4],[-10,19],[-6,8],[-8,7],[-13,6],[-61,8],[-12,5],[-11,6],[-9,7],[31,19],[-5,8],[-14,12],[-4,11],[24,1],[11,4],[10,8],[6,-7],[5,-4],[6,0],[5,4],[1,18],[19,11],[26,6],[21,2],[9,-5],[30,-7],[-1,-4],[-2,-10],[-1,-4],[20,-2]],[[5885,5525],[-25,4],[-28,14],[-34,34],[-26,7],[-12,10],[-10,12],[-7,12],[-9,27],[0,5],[-10,2],[-3,-7],[0,-10],[4,-11],[31,-37],[7,-16],[-4,-8],[-12,-1],[-15,0],[-16,5],[-7,13],[-2,16],[-1,35],[1,8],[26,52],[45,59],[3,13],[-3,3],[-7,-4],[-8,-9],[-37,-62],[-10,-10],[-14,-1],[-4,7],[1,28],[-3,13],[-7,9],[-9,2],[-8,-8],[7,-16],[9,-32],[6,-32],[-2,-14],[-8,-3],[-2,-6],[3,-19],[0,-18],[1,-12],[4,-10],[-9,-4],[-10,3],[-10,4],[-11,3],[0,-6],[8,-3],[8,-5],[7,-7],[3,-11],[-2,-13],[-7,-9],[-7,-7],[-6,-8],[-3,-11],[-2,-9],[-2,-8],[-7,-10],[-9,-8],[-7,-1],[-21,4],[-10,10],[-9,23],[-7,26],[-2,18],[-26,28],[-4,12],[-5,7],[-10,-6],[10,-15],[25,-50],[5,-19],[-6,-9],[-12,3],[-43,28],[-5,12],[0,19],[-7,-7],[-6,-12],[-4,-13],[-1,-9],[-3,-7],[-19,-22],[15,-25],[7,-14],[4,-17],[-12,0],[-28,13],[-22,7],[-6,7],[-4,23],[-4,3],[-5,2],[-5,5],[-2,6],[-1,9],[1,16],[1,8],[6,10],[2,7],[-1,8],[-8,27],[16,14],[70,98],[38,12],[27,17],[6,6],[23,41],[10,12],[20,11],[25,8],[22,13],[13,24],[-12,-6],[-24,-21],[-10,-4],[-27,-2],[-11,-4],[-9,-7],[-7,-11],[-16,-32],[-6,-7],[-77,-41],[-54,-65],[-6,-3],[-11,-1],[-5,-2],[0,-5],[-3,-13],[-4,-11],[-2,1],[-6,-10],[-14,-4],[-16,1],[-12,3],[-1,5],[0,8],[-1,5],[-5,-2],[-2,-5],[-1,-5],[1,-6],[-5,-49],[2,-2],[10,-5],[4,0],[6,-18],[3,-11],[0,-8],[3,-8],[7,-6],[0,-5],[-4,0],[0,-7],[3,-1],[6,-4],[-3,-2],[-3,-3],[-3,-2],[36,-31],[16,-22],[6,-23],[-5,-12],[-9,-6],[-21,-6],[-10,-6],[-30,-26],[-7,-9],[-6,-10],[-5,-11],[-1,-8],[-2,-16],[-2,-8],[-14,-8],[2,-4],[2,-4],[1,-3],[-1,-21],[6,-5],[8,-2],[5,-9],[-4,-12],[-10,-4],[-8,-5],[4,-17],[-13,-22],[-4,-9],[-1,-5],[1,-17],[-1,-7],[-2,-1],[-3,2],[-3,-3],[-14,-30],[-11,-13],[-15,-7],[0,-6],[8,1],[7,-2],[6,-5],[6,-7],[10,-20],[1,-4],[7,-6],[-6,-14],[-21,-24],[-11,-9],[-13,-8],[-14,-6],[-15,-3],[-7,1],[-12,6],[-8,0],[-7,-3],[-14,-8],[-8,-2],[-19,0],[-11,4],[-7,11],[-8,39],[-1,21],[4,18],[18,12],[24,23],[7,10],[0,19],[-3,20],[-1,21],[9,27],[-3,6],[-5,6],[-1,7],[2,10],[15,27],[14,32],[2,19],[-7,12],[35,24],[5,10],[4,13],[9,16],[12,13],[8,6],[19,6],[22,17],[20,24],[12,27],[-62,-56],[-24,-15],[-7,-3],[-9,0],[5,11],[-18,6],[-9,4],[-9,9],[-5,13],[0,24],[-4,7],[28,33],[4,8],[4,12],[10,9],[11,9],[10,10],[-14,-6],[-22,-20],[-17,-7],[-12,-10],[-6,0],[-5,6],[-4,10],[-1,10],[71,88],[5,11],[-2,4],[3,4],[4,4],[-8,3],[-8,-3],[-9,-7],[-10,-5],[-4,-17],[-28,-25],[0,-20],[-10,-17],[-3,-3],[-6,2],[-2,6],[1,6],[2,6],[4,24],[24,37],[48,56],[2,4],[1,4],[2,3],[4,2],[4,-1],[5,-2],[4,-2],[0,-1],[2,-2],[5,-3],[6,0],[1,5],[-3,6],[-5,3],[-4,3],[-2,1],[-4,14],[-1,8],[3,6],[20,26],[5,8],[4,13],[-20,-5],[-14,-14],[-13,-16],[-15,-9],[4,18],[8,19],[11,18],[12,14],[-5,12],[7,10],[14,6],[13,3],[7,3],[2,6],[-5,7],[-8,3],[-27,-7],[-6,-3],[-6,-6],[-6,-4],[-7,1],[-3,8],[1,10],[7,19],[8,34],[6,12],[13,11],[12,-6],[17,2],[33,10],[0,6],[-16,-1],[-28,-8],[-14,3],[13,30],[5,7],[7,4],[8,3],[5,5],[-3,7],[17,18],[21,8],[66,5],[52,-12],[21,4],[18,12],[41,44],[21,37],[14,15],[-15,-6],[-8,-13],[-7,-16],[-10,-14],[-27,-19],[-15,-20],[-7,-6],[-27,-2],[-69,12],[-18,-12],[-11,5],[-10,35],[-9,-3],[-8,-8],[-12,-20],[-9,6],[23,44],[4,12],[15,-12],[16,-5],[15,1],[12,4],[30,19],[17,6],[8,4],[7,8],[-22,-10],[-7,-2],[-13,1],[-3,-1],[-11,-6],[-7,-2],[-14,-10],[-7,-1],[-8,2],[-11,10],[-8,1],[2,6],[2,3],[3,2],[4,4],[2,5],[3,7],[1,4],[17,25],[6,6],[26,19],[4,6]],[[4609,6124],[-34,-21],[-11,-3],[-15,5],[-8,0],[-3,-9],[-3,-9],[-5,5],[-7,11],[-3,9],[18,3],[17,13],[29,37],[7,7],[21,13],[15,5],[20,13],[10,3],[18,2],[6,-2],[-4,-10],[-6,-9],[-9,-18],[-5,-7],[-5,-6],[-5,-3],[-6,-3],[-8,-1],[-24,-25]],[[7814,8813],[-2,-7],[9,0],[0,-7],[-11,-5],[-11,-9],[-9,-2],[-4,13],[5,15],[12,10],[14,4],[13,-1],[0,-4],[-1,-1],[-1,0],[-2,-1],[-9,-2],[-3,-3]],[[7999,9311],[-1,-5],[5,5],[5,1],[2,-7],[-3,-10],[-5,-9],[-6,-14],[-5,-6],[-3,0],[0,6],[3,10],[1,11],[-1,2],[-1,-5],[-2,-6],[-10,-12],[-9,-5],[-1,4],[8,8],[3,10],[3,13],[6,9],[-1,6],[-4,4],[0,4],[12,2],[4,4],[4,0],[0,-8],[-4,-12]],[[7529,9344],[-9,-11],[-16,5],[-12,8],[-4,6],[1,6],[4,5],[11,5],[15,1],[7,-1],[3,-8],[0,-16]],[[8159,9392],[1,-8],[2,-8],[4,-1],[8,5],[0,-6],[-1,-13],[-4,-10],[-5,-7],[-5,-20],[-6,-2],[-19,10],[-6,6],[2,30],[-11,11],[1,10],[12,1],[12,-4],[5,2],[2,8],[5,1],[3,-5]],[[8223,9536],[-26,-6],[-12,6],[3,5],[4,3],[1,5],[3,7],[7,6],[7,3],[8,0],[6,4],[4,4],[23,2],[7,2],[2,1],[3,1],[1,-5],[-4,-5],[-9,-7],[-11,-12],[-17,-14]],[[8330,9781],[6,-1],[5,3],[3,2],[2,2],[10,-2],[7,-5],[3,-8],[-4,-10],[-16,-11],[-18,4],[-19,7],[-18,0],[0,-7],[3,-3],[2,-3],[2,-2],[2,-4],[-18,3],[-14,15],[-21,31],[0,7],[75,0],[7,-2],[1,-6],[-1,-7],[1,-3]],[[8018,9773],[-1,-6],[-3,-4],[-7,-1],[5,-21],[-5,-10],[-10,-7],[-7,-12],[13,0],[-3,-4],[-3,-2],[-7,-1],[3,-1],[2,-2],[3,-2],[5,-1],[-13,-31],[6,1],[6,3],[5,3],[5,5],[4,-5],[-9,-14],[-2,-6],[2,-5],[0,-7],[-12,-4],[-15,-32],[-12,-8],[0,-6],[8,-1],[8,1],[7,2],[7,4],[-1,17],[18,9],[41,5],[-31,17],[-9,8],[7,7],[8,5],[7,-2],[1,-15],[6,5],[13,16],[2,6],[6,3],[12,-5],[9,-9],[-5,-11],[8,-2],[7,-5],[5,-7],[3,-11],[-3,-4],[-2,-2],[9,-5],[-8,-5],[-14,5],[-7,-4],[-5,-6],[-6,-5],[-7,-3],[2,-2],[8,1],[15,6],[-2,-3],[-7,-4],[0,-6],[22,9],[8,-4],[1,-18],[5,0],[2,10],[2,0],[4,-1],[5,4],[3,5],[2,7],[3,7],[5,7],[2,-3],[1,-3],[1,-7],[6,15],[10,10],[12,6],[13,0],[-9,-16],[-46,-38],[-4,-7],[1,-8],[4,-1],[5,4],[6,9],[4,3],[8,4],[9,0],[4,-10],[-1,-5],[-1,-9],[-4,-9],[-5,-4],[-51,-4],[-9,-3],[13,-10],[33,-5],[16,-10],[-31,-22],[-7,-3],[-2,-2],[-1,-5],[1,-5],[2,-4],[3,-1],[5,4],[3,0],[5,-2],[9,-1],[4,-3],[-26,-18],[-12,-3],[-11,2],[-6,12],[-5,7],[-7,0],[-4,-5],[1,-6],[3,-5],[5,-3],[0,-6],[-6,1],[-5,-2],[-11,-5],[0,-6],[26,0],[-4,-6],[-3,-6],[-6,-13],[12,12],[6,5],[9,2],[-19,-31],[-4,-13],[11,10],[14,4],[7,-4],[-9,-16],[22,-13],[0,-6],[-18,0],[0,-7],[5,0],[0,-6],[-11,6],[-7,-5],[-6,-6],[-12,0],[9,-7],[-3,-8],[-3,-4],[-5,-2],[-7,1],[0,-6],[5,-1],[13,-5],[-11,-10],[6,-13],[12,-8],[6,0],[-3,-13],[-10,-7],[-12,-2],[-10,3],[3,-12],[14,-26],[-5,-11],[-10,1],[-20,10],[3,-19],[-2,-20],[-5,-17],[-9,-12],[-3,4],[-2,2],[6,-11],[2,-10],[-2,-10],[-6,-13],[7,-6],[2,-8],[-2,-7],[-7,-4],[-2,4],[-11,14],[-5,-9],[-5,1],[-1,7],[7,8],[0,6],[-10,7],[-20,-4],[-10,4],[-8,11],[11,12],[-3,15],[5,7],[6,5],[8,1],[7,-1],[0,5],[-12,10],[-5,3],[0,6],[17,0],[-4,17],[7,14],[10,15],[10,44],[9,18],[7,18],[-3,24],[-4,4],[-3,-1],[-4,1],[-3,9],[1,3],[2,5],[10,19],[-7,0],[-9,-5],[-3,-3],[-7,0],[-2,4],[2,7],[9,24],[6,9],[5,7],[7,5],[0,6],[-13,1],[-9,-9],[-18,-29],[-9,21],[-9,16],[-14,9],[-21,4],[0,-7],[13,-4],[10,-8],[9,-11],[8,-14],[-5,-13],[-12,10],[-6,3],[-8,0],[0,-16],[-5,-13],[-5,-2],[-4,13],[-8,-6],[-2,-9],[-2,-10],[-5,-7],[-7,0],[-25,13],[-1,2],[-14,11],[-2,-1],[-4,9],[0,4],[4,6],[8,5],[19,4],[8,3],[-8,4],[-16,20],[-2,-8],[-4,-12],[-8,-9],[-7,-1],[-4,9],[-4,8],[-9,-2],[-19,-9],[-15,-1],[-6,1],[-4,3],[0,5],[-1,4],[-5,1],[-14,2],[-5,5],[-6,24],[-7,18],[2,5],[10,8],[9,6],[12,5],[12,2],[11,0],[10,-6],[7,-8],[7,-5],[11,0],[-4,12],[22,-6],[0,6],[-5,0],[0,7],[31,2],[9,-7],[0,-27],[4,1],[7,4],[3,2],[-4,5],[-3,9],[-2,4],[13,0],[-2,4],[-2,9],[15,5],[17,-4],[14,-12],[7,-20],[9,10],[9,8],[-18,13],[13,25],[4,-4],[4,-1],[10,-1],[-8,10],[11,3],[33,0],[-16,7],[-19,3],[-15,7],[-4,20],[-12,-10],[-7,-4],[-8,1],[-6,7],[-3,9],[2,9],[7,7],[0,6],[-20,0],[-8,2],[-7,5],[2,11],[-1,16],[-5,29],[-9,-18],[-7,-10],[-6,-4],[-10,3],[-3,8],[4,8],[9,6],[-13,0],[-11,-2],[-10,0],[-11,9],[-6,-11],[-9,-3],[-22,1],[-2,5],[3,10],[6,11],[6,5],[16,-2],[4,2],[3,6],[0,7],[0,6],[1,6],[7,8],[7,8],[9,0],[8,-10],[8,-19],[22,-15],[24,-6],[21,9],[-7,4],[-10,2],[-16,0],[-5,3],[-5,7],[-8,7],[-10,2],[5,6],[9,16],[3,3],[7,1],[20,11],[-7,5],[-2,2],[6,6],[1,5],[-1,3],[-2,5],[16,5],[18,-2],[17,-7],[16,-9],[2,3],[2,3],[-11,9],[1,9],[15,20],[7,-18],[0,-7],[-3,-6],[2,-8]],[[8155,9897],[7,-16],[8,10],[13,3],[28,-1],[0,-13],[-1,-3],[-4,-2],[0,-7],[4,-2],[2,-2],[3,-2],[-7,-11],[1,-9],[11,-17],[-4,-10],[-5,-10],[-21,18],[-11,6],[-12,1],[7,-6],[9,-12],[15,-25],[-9,-5],[-9,-2],[-9,2],[-9,5],[3,-10],[8,-6],[10,-3],[11,0],[-2,-4],[-3,-2],[11,-9],[0,-12],[-8,-8],[-12,-3],[10,-16],[2,-7],[2,-11],[-2,-12],[-6,-2],[-15,5],[-16,-1],[-8,3],[-3,7],[-2,-1],[-4,-3],[-1,-6],[7,-6],[0,-5],[-21,3],[-16,11],[-9,21],[-7,85],[5,20],[22,3],[0,-6],[-2,-11],[7,-10],[10,-7],[7,3],[-2,4],[-9,24],[-2,12],[2,7],[6,13],[-2,3],[-3,3],[-1,8],[2,10],[2,7],[7,10],[7,8],[8,1]],[[8352,9948],[-13,-6],[-8,-6],[4,-11],[0,-7],[-13,0],[5,-2],[4,-2],[4,-2],[0,-7],[-26,-19],[-5,-5],[5,-11],[9,-11],[4,-9],[-9,-7],[-7,-1],[-5,2],[-5,3],[-5,3],[-13,0],[-9,0],[-20,-2],[-10,2],[-10,5],[3,9],[1,9],[-1,7],[-3,7],[11,-6],[4,7],[-2,13],[-4,11],[11,3],[6,13],[0,13],[-8,8],[0,6],[10,4],[12,9],[9,11],[-1,8],[7,9],[7,1],[6,-7],[3,-13],[-3,-10],[-6,-6],[-7,-5],[-7,-7],[2,-3],[8,3],[9,5],[6,5],[14,33],[6,7],[4,-4],[4,-2],[9,0],[8,-3],[8,-4],[5,-7],[2,-12],[-5,0],[-13,-5],[13,-6],[5,-1],[-10,-7]],[[8719,863],[-16,-7],[-24,8],[-82,-26],[-111,0],[-106,-32],[-6,2],[-5,4],[-6,3],[-6,-2],[-3,-8],[4,-17],[-3,-10],[-12,-6],[-15,4],[-59,34],[-5,6],[4,9],[9,6],[18,7],[0,5],[-6,5],[-13,11],[-7,4],[-4,-3],[-7,-4],[-5,1],[6,12],[-7,3]],[[8366,1099],[15,-10],[28,-6],[15,2],[24,10],[17,-7],[39,2],[13,9],[11,-3],[18,9],[36,2],[44,16],[32,2],[78,40],[26,-8],[4,-13],[11,-3],[27,6],[15,-5],[35,1],[13,-1]],[[8557,2212],[-29,-5],[-14,-18],[0,-21],[-4,-10],[-6,-4],[-12,2],[-12,15],[-8,2],[-33,-7],[-2,-6],[5,-12],[1,-21],[-13,-21]],[[8137,1939],[-7,-3],[-12,-15],[-16,-2],[-14,-9],[-32,2],[-15,-3],[-5,3],[-15,46],[-6,8],[2,29],[-8,6],[21,9],[19,3],[5,5],[-55,60]],[[7999,2078],[3,8],[9,9],[35,13],[2,10],[-13,14],[0,6],[37,20],[0,21],[-10,9],[14,17],[-4,5],[-21,4],[-5,8],[10,7],[34,10],[10,9],[-1,9],[-13,21]],[[8382,2392],[21,15],[10,18],[86,44],[18,30],[19,12]],[[8536,2511],[11,-11],[5,-14],[-5,-38],[9,-5],[30,3],[0,-5]],[[7999,2078],[-8,-9],[-5,-16],[-21,-15],[15,-13],[-4,-8],[-14,-3],[-19,14],[-12,1],[-7,-1],[1,-13],[-3,-2],[-19,-2],[-3,-11],[-13,-14],[-1,-19],[-9,-38],[-5,-9],[-18,-4],[-3,-14],[-23,-2],[-5,-10],[-7,-1],[-31,27]],[[7717,2027],[-4,6],[-11,4],[-4,11],[-17,4],[-10,8],[-8,-6],[-22,12],[-6,-4],[-4,-10],[-15,9],[-10,15],[-10,4],[8,11],[6,17],[14,14],[-1,18],[-11,26],[0,7],[24,7],[10,23],[13,10],[-3,12],[-14,13],[-2,7],[16,16],[6,12],[-1,7]],[[7661,2280],[6,-3]],[[7667,2277],[8,-4],[5,-11],[12,-11],[24,-13],[5,9],[24,7],[21,-11],[7,5],[20,2]],[[7793,2250],[25,10],[8,12],[17,-2],[17,-15],[17,10],[31,-1],[20,16],[-4,42],[-3,5],[-8,3],[-107,5]],[[7806,2335],[-27,-18],[-13,14],[-38,53]],[[7728,2384],[5,13],[-13,21],[0,11],[-12,14],[-4,12]],[[7704,2455],[16,4],[57,-4],[14,4],[6,7],[0,19],[7,16],[-6,11],[1,4],[19,13],[14,19]],[[8280,1518],[2,-18],[3,-9],[3,-5],[1,-5],[-5,-9],[-4,-6],[-13,-13],[-16,-6],[-21,-14]],[[8230,1433],[-15,-2],[-10,6],[-25,21],[-11,5],[-14,1]],[[8155,1464],[-15,5],[-13,8],[-9,10],[-6,15],[-24,-7],[-12,1],[-16,9],[-24,-1],[-16,15],[-12,4],[-9,-3],[-11,-12],[-17,7],[-15,-8],[-20,4],[-19,-7],[-25,13],[-30,3],[-22,-4],[-5,-5],[-6,-21]],[[7829,1490],[-12,3],[-28,44],[-14,-1],[-5,5],[-1,24],[11,11],[4,19],[-19,16],[-2,17],[2,9]],[[8561,1791],[-2,3],[-10,15],[-4,10],[0,11],[4,13],[4,8],[13,0],[27,2],[12,5]],[[8595,1579],[7,-26],[0,-1],[1,-2],[0,-1],[0,-1],[1,-1],[0,-2],[11,-22],[1,-5]],[[8568,1432],[-21,5],[-15,17]],[[8696,1359],[-16,-11],[-16,-30],[-12,-4],[-2,21],[11,21],[-6,13]],[[8889,1283],[1,-22],[5,-22],[-13,-29],[11,-26],[-3,-13],[4,-29]],[[8359,1320],[29,30],[14,3]],[[8402,1353],[26,14],[25,5],[13,14],[6,21],[9,18]],[[8481,1425],[29,-11],[8,5],[-1,10],[5,23]],[[7829,1490],[3,-13]],[[7832,1477],[-13,-11],[-22,-10],[-24,-10],[-17,-8],[-21,0],[-20,2],[-16,7],[-16,9],[-16,25],[-3,15],[0,21],[5,17],[9,14],[16,22],[14,22],[10,12],[4,15]],[[7832,1477],[2,-13],[17,-25],[14,-9],[5,-16],[-1,-7],[-20,-6],[-6,-7],[19,-32],[23,-10],[1,-11],[7,-9],[-1,-11]],[[8153,757],[14,-19],[0,-7],[-3,0],[-2,-1],[-1,-3],[-3,-2],[-24,-6],[-10,-5],[-18,-14],[-4,-5],[-2,-4],[1,-20],[-1,-10],[-2,-4],[-72,-19],[-23,6],[-84,53],[-5,6],[-21,14],[-8,2],[-24,-2],[-11,-4],[-11,-7],[15,26],[26,20],[56,24],[-1,-4],[-2,-6],[-1,-3],[16,2],[15,11],[22,24],[16,10],[15,1],[98,-35],[16,0],[6,-1],[8,-6],[1,-2],[-1,-8],[0,-2],[2,-1],[6,1],[1,0]],[[8247,825],[0,-6],[-53,6],[0,6],[14,6],[17,26],[8,0],[6,-5],[2,-6],[-3,-5],[-5,-4],[0,-5],[3,-3],[6,-7],[5,-3]],[[8210,879],[-4,0],[-12,-3],[-9,-16],[-6,-22],[-8,-18],[-18,-1],[-13,13],[6,16],[12,15],[4,13],[-11,5],[-1,0]],[[8096,2726],[-19,6],[-7,12],[-11,21],[1,26],[6,23],[17,21],[20,3],[16,-12],[13,-19],[8,-19],[0,-20],[-25,-24],[-19,-18]],[[8093,3109],[7,13],[20,17],[-7,11],[16,7],[4,10],[-2,20]],[[8131,3187],[19,22],[14,10],[24,1],[11,-6],[5,4],[18,20],[5,26],[32,23]],[[8847,1522],[0,-5],[0,-2],[0,-1]],[[8807,1489],[-2,4],[-1,2],[0,1],[-6,2],[-1,1]],[[8793,1529],[1,7],[0,1],[1,1],[0,1],[3,1],[22,1]],[[8748,1535],[3,10],[0,1],[1,1],[4,1],[2,2],[1,3],[0,1],[-2,9],[0,1],[1,1],[1,1],[0,1],[1,-1],[1,-1],[0,-2],[1,-1],[1,-1],[1,0],[1,1],[1,0],[1,3],[1,3],[0,1],[1,2],[0,2]],[[8664,1600],[1,-8],[16,-26]],[[8784,1479],[3,-3],[1,0],[1,-1],[0,-1],[1,-2],[-1,-4],[0,-1],[1,-1],[1,-2],[0,-1],[0,-5],[0,-1],[7,-12],[3,-3],[1,-3],[0,-1],[0,-1],[-1,0],[0,-2],[-6,-8],[-1,-2],[0,-1],[0,-1],[3,-4],[2,-7],[6,-11]],[[8811,1402],[0,2],[0,1],[5,6],[2,6],[1,3],[1,1],[7,1],[1,1],[1,2],[2,5],[0,1],[0,1],[-4,4],[-1,3],[-1,3],[0,6],[-3,7],[1,1],[0,1],[0,1],[6,3],[4,1],[2,2],[0,1],[1,0],[3,-1]],[[8791,1483],[8,2],[11,-3],[0,-1]],[[4080,6479],[5,-5],[-18,1],[-6,-4],[-5,-5],[-5,-5],[-5,-3],[-5,-2],[4,-8],[-6,-6],[-10,-4],[-10,-1],[-42,6],[-10,4],[0,9],[8,9],[11,4],[7,4],[3,9],[-1,11],[-7,6],[16,9],[15,3],[12,8],[6,24],[2,0],[3,-1],[4,-5],[4,0],[4,-1],[2,-2],[3,-3],[-9,-16],[-4,-3],[21,-9],[5,-4],[3,-6],[2,-7],[3,-7]],[[4099,6862],[58,-31],[-6,-3],[-4,-1],[-13,4],[0,-6],[14,-2],[21,-15],[14,-2],[0,-6],[-18,-7],[-14,5],[-12,9],[-26,12],[-13,14],[-13,10],[-15,-6],[4,-3],[5,-4],[3,-4],[1,-4],[2,-8],[5,-2],[6,1],[5,-1],[16,-6],[2,-2],[9,-11],[9,-4],[20,0],[10,-2],[8,-6],[6,-8],[7,-5],[11,1],[-4,-14],[-6,-5],[-7,-3],[-8,-7],[-4,-8],[-6,-19],[-5,-7],[-13,-5],[-49,10],[0,-5],[41,-10],[12,-9],[5,-14],[3,-19],[-1,-18],[-7,-11],[-12,5],[-12,2],[-25,-1],[0,-6],[12,-2],[23,3],[10,-1],[11,-7],[7,-10],[8,-8],[13,-1],[0,-5],[-15,-12],[-53,8],[-20,-9],[-19,17],[-6,10],[-16,48],[-3,14],[4,11],[0,6],[-11,12],[-7,5],[-8,2],[8,7],[5,7],[8,17],[3,10],[2,8],[3,5],[8,2],[5,12],[-8,28],[-17,41],[13,8],[29,11],[7,0]],[[4138,6933],[5,-3],[6,0],[8,1],[-2,-4],[0,-1],[-1,0],[-2,-2],[5,-4],[6,1],[5,2],[6,1],[5,-1],[17,-11],[-4,-6],[-9,4],[-14,-10],[-12,-1],[3,-9],[6,-3],[15,0],[9,-3],[5,-6],[-1,-6],[-56,-13],[-17,3],[-50,24],[-8,10],[4,17],[8,15],[13,8],[15,1],[8,-5],[8,-2],[8,1],[7,6],[4,-4]],[[2,7034],[-1,0],[-1,0],[0,1],[1,0],[1,0],[0,-1]],[[4205,7087],[10,-5],[20,8],[8,-5],[10,0],[14,0],[12,-6],[6,-11],[-7,-5],[-11,-15],[-4,-4],[-9,1],[-7,6],[-5,8],[-4,3],[-7,2],[-15,11],[-29,0],[0,-7],[8,0],[4,-2],[1,-4],[-4,-6],[0,-7],[19,1],[6,-4],[2,-12],[4,-8],[11,-1],[20,6],[-12,-20],[-16,-9],[-38,-2],[-4,-2],[-10,-4],[-4,-1],[-4,4],[-6,12],[-3,3],[-9,-2],[-27,-17],[0,-6],[47,0],[38,8],[13,-2],[11,-3],[4,-3],[2,-6],[-2,-6],[-13,-19],[-27,1],[-13,-1],[-11,-7],[-10,6],[-23,-1],[-11,2],[-6,3],[-3,2],[-7,11],[-3,5],[-3,5],[-5,5],[6,0],[12,6],[-21,2],[-39,19],[-20,4],[-4,-6],[-5,-4],[-4,-2],[-5,1],[-8,4],[-11,3],[-29,17],[0,6],[14,8],[10,15],[9,19],[11,15],[14,-6],[44,6],[0,-7],[-5,0],[-13,-6],[12,-12],[19,15],[20,23],[15,11],[0,-6],[-4,-3],[-3,-4],[-6,-11],[35,-12],[14,-1],[0,6],[-4,1],[-9,6],[13,4],[31,18],[18,2],[8,-9],[2,-8],[-4,-8],[-11,-6]],[[4217,7142],[-19,-6],[-15,1],[28,23],[12,2],[6,-10],[-12,-10]],[[3312,7226],[-14,-2],[-13,7],[-6,19],[10,-6],[23,-3],[11,-4],[-11,-11]],[[4329,7324],[0,-19],[-8,-4],[-23,12],[-2,-11],[-5,-6],[-6,-3],[-9,0],[1,7],[0,2],[0,1],[-1,3],[27,20],[14,5],[12,-7]],[[4417,7633],[21,-18],[6,3],[6,-4],[5,-6],[4,-7],[3,-8],[-53,0],[0,7],[7,-1],[2,1],[0,5],[-8,4],[-7,8],[-2,11],[4,9],[12,-4]],[[4847,7727],[9,-3],[9,1],[0,-7],[-13,-5],[-29,-17],[-11,-9],[3,-8],[-1,-6],[-4,-4],[-9,-1],[-8,-3],[-6,-13],[-19,-5],[-1,-7],[2,-8],[-1,-7],[-6,-4],[-7,-2],[-18,-1],[12,-14],[24,-6],[26,1],[17,6],[32,26],[9,4],[12,3],[7,0],[-6,-7],[0,-6],[4,0],[-3,-4],[-3,-6],[-3,-3],[2,-3],[3,-9],[-17,-7],[-6,-3],[-4,-4],[-6,-9],[-3,-2],[-11,-5],[-9,1],[-19,10],[-11,3],[-29,-3],[-11,3],[-19,9],[-10,0],[15,-33],[7,-10],[-5,-4],[-3,-4],[1,-5],[3,-6],[-12,-7],[-33,-6],[-21,-20],[-10,-5],[-6,0],[-10,6],[-6,0],[-18,-12],[-33,-7],[-11,1],[0,-7],[25,0],[84,15],[20,9],[8,1],[9,-4],[6,-9],[4,-12],[-1,-12],[3,-1],[6,-6],[-5,-5],[-5,-4],[-6,-2],[-6,-1],[7,-4],[7,-2],[9,-1],[8,1],[-12,-10],[-9,-11],[-11,-7],[-15,-4],[-60,8],[-14,5],[-4,0],[-3,-7],[5,-4],[14,-4],[10,-8],[23,-5],[9,-9],[0,-7],[-6,-3],[-10,-15],[-6,-6],[-12,-6],[-8,0],[-8,4],[-12,2],[0,-7],[3,-1],[3,-3],[3,-2],[0,-7],[-14,-5],[-12,1],[-10,7],[-8,10],[-6,13],[-4,4],[-6,2],[-3,-4],[4,-11],[6,-11],[5,-6],[-5,-6],[-20,8],[-7,5],[-3,5],[-4,11],[-18,27],[-5,12],[-1,13],[9,24],[19,14],[24,5],[24,2],[0,5],[-62,0],[0,-5],[-3,-11],[-15,-14],[-19,-14],[-12,-6],[8,-10],[14,-27],[7,-6],[9,-3],[7,-7],[7,-9],[6,-6],[-4,-2],[-2,-2],[-4,-2],[-4,-1],[4,-6],[6,-2],[5,-2],[3,-2],[2,-6],[2,-19],[-53,10],[-22,10],[-6,-3],[-4,-5],[-3,-6],[-5,-6],[7,-4],[14,-5],[6,-3],[15,-20],[2,-6],[-3,-7],[-9,-4],[-12,-2],[-11,1],[0,-6],[5,0],[0,-6],[-15,2],[-30,17],[-4,-7],[3,-2],[6,-7],[4,-3],[-7,-9],[-7,-6],[-17,-10],[3,-2],[3,-3],[3,-2],[-13,-10],[-40,-21],[-12,-9],[-5,1],[-32,30],[-7,3],[-39,37],[-7,4],[-3,7],[-5,7],[0,5],[10,2],[8,-1],[6,-4],[3,-8],[3,-11],[53,37],[8,11],[14,3],[32,-1],[-32,19],[0,6],[33,14],[20,4],[19,-4],[12,-7],[-6,4],[-6,4],[-5,4],[-2,2],[-2,3],[12,6],[5,1],[0,6],[-37,0],[-9,3],[-17,13],[-10,3],[-37,-1],[-17,5],[-6,15],[-8,-6],[-6,0],[-30,18],[11,7],[7,7],[9,6],[12,-1],[0,6],[-1,2],[-1,1],[0,1],[-2,3],[20,2],[21,6],[39,17],[-61,-13],[-19,0],[3,8],[5,5],[7,1],[7,-1],[0,5],[-18,0],[6,3],[5,4],[4,6],[3,6],[-28,-15],[-5,0],[-19,29],[-5,5],[3,11],[-3,4],[-6,2],[-3,5],[2,12],[8,8],[-1,9],[6,1],[2,2],[2,4],[3,4],[-5,2],[-4,4],[-4,1],[0,6],[49,2],[13,5],[-17,6],[-7,5],[-3,10],[2,12],[4,6],[12,11],[10,-6],[25,-10],[5,0],[5,3],[35,-12],[0,-7],[-19,1],[4,-13],[13,-15],[9,-7],[-1,-14],[6,-19],[10,-18],[9,-9],[-1,9],[-1,5],[2,12],[-5,6],[-9,16],[-4,8],[6,4],[3,6],[0,7],[2,3],[29,5],[7,4],[10,2],[17,-6],[16,-11],[7,-14],[18,20],[-16,7],[-6,5],[-2,6],[-4,14],[-3,5],[-4,1],[-9,-2],[-4,1],[-1,2],[-3,9],[-1,2],[-7,8],[-4,5],[-2,5],[3,2],[3,2],[3,2],[4,0],[-3,7],[-3,4],[-5,2],[-7,0],[53,35],[14,15],[8,-4],[5,3],[4,4],[5,3],[22,0],[17,4],[41,16],[6,4],[16,16],[115,66],[32,31],[19,14],[15,-1],[13,-11],[12,-16],[8,-18],[3,-14],[12,-15],[2,-10],[-12,-4],[-5,-5],[-15,-38],[6,-6],[7,-4]],[[5085,8422],[-10,-1],[1,3],[1,2],[3,3],[5,2],[-1,4],[0,1],[3,0],[4,-1],[-1,-3],[0,-5],[2,-1],[-7,-4]],[[4621,4871],[4,5],[13,10],[14,5],[14,2],[23,-12],[16,-3],[24,13],[16,-4],[63,-29],[11,-2],[14,2],[25,8],[12,2],[26,-3],[12,-5],[6,-7],[5,-3],[24,-21],[7,-10],[-3,-51],[-4,-15],[-9,-19],[5,-9],[12,-1],[12,1],[8,-1],[10,-4],[5,-3]],[[4861,4943],[2,-10],[-4,-11],[-7,-10],[-4,-6],[1,7],[0,5],[1,3],[2,4],[-15,10],[-16,2],[-16,-2],[-15,2],[7,5],[8,4],[7,3],[9,1],[33,-4],[7,-3]],[[7247,3264],[24,-40]],[[7271,3224],[2,-11],[-10,-17],[3,-2],[17,-5]],[[7283,3189],[-3,-7],[-9,-16],[-40,-22]],[[7231,3144],[-14,-10],[-16,-7],[-9,0]],[[7192,3127],[-7,3],[-6,9],[-10,11],[-6,3],[-9,1],[-22,14],[-12,20]],[[7120,3188],[21,11],[2,9],[-11,8],[0,12],[-5,7],[3,9],[17,0],[15,-9],[32,4]],[[7194,3239],[18,12],[11,13],[24,0]],[[7146,2233],[-1,-8],[7,-29],[10,-12],[0,-11],[-2,-13],[8,-9],[16,0],[20,0],[15,1],[9,7],[7,7],[9,6],[9,0],[18,-6],[-4,-8],[-4,-12],[1,-6],[12,-6],[16,-3],[6,-13],[-3,-25],[0,-20],[3,-13],[9,-10],[11,-4],[9,-4],[7,-14],[1,-12],[0,-15],[-2,-22],[0,-23],[0,-13]],[[6941,2241],[16,4],[10,11],[15,5],[-7,10],[2,6],[19,-5],[22,15],[23,-10],[10,-13],[4,-12],[32,-1],[3,-10],[-12,-15],[33,-19],[13,3],[6,21],[8,6],[8,-4]],[[7461,2316],[22,-1],[24,13],[16,-13],[7,11],[11,3]],[[7541,2329],[5,-12],[10,3],[15,-9],[0,-7],[-12,-16],[4,-12],[8,-2],[19,9],[19,-2],[16,7],[36,-8]],[[7146,2233],[16,-7],[4,-5],[1,-10],[7,-2],[27,3],[6,19],[14,9],[20,-12],[13,1],[4,9],[-4,12],[3,6],[38,5],[8,6],[0,8],[5,5],[46,1],[-5,5],[-15,31],[7,9],[22,-3],[12,13]],[[7375,2336],[17,-8],[26,-1],[32,-12],[11,1]],[[7704,2455],[-8,11],[-16,3],[-11,-3],[-15,-11]],[[7654,2455],[-4,1],[-9,9],[-3,17],[-11,11],[0,29],[-24,15],[-5,0],[-3,-6],[0,-14],[-4,-5],[-47,-20],[-17,1]],[[7527,2493],[-10,-8],[-20,23],[-21,-4],[-6,-4],[-3,-11],[-23,-12],[-4,-10],[-9,-8],[16,-11],[11,-20],[15,2],[6,-3]],[[7479,2427],[-5,-14],[-1,-13],[-27,-13],[12,-21],[3,-50]],[[7375,2336],[2,9],[-10,19],[0,7],[10,20],[18,12],[2,15],[-9,12],[10,13],[-12,14],[-27,12],[0,8],[5,8],[24,-4],[19,8],[7,22],[-3,13],[2,7],[-2,9],[-8,7],[-32,4],[-8,5],[-3,13],[4,20],[-1,10],[-12,13]],[[7304,2679],[-3,3],[15,12],[8,42],[-10,1],[-35,-15],[-9,16],[-1,10],[5,15],[15,21],[16,12],[13,0],[3,7],[4,10],[0,11],[-4,8],[-6,1]],[[7315,2833],[8,9],[-4,34],[5,14],[19,3],[20,21],[21,-1],[17,6],[2,1]],[[7403,2920],[5,-10],[4,-17],[5,-27],[7,-36],[6,-21],[15,-17],[22,-6],[21,2],[11,8],[3,15],[-5,21],[-17,32],[-16,25],[-14,14],[-14,16],[-8,27]],[[7428,2946],[30,31],[15,2],[3,7],[-6,11],[1,4],[8,1],[16,-9],[21,0],[25,18],[16,1],[18,19]],[[7403,2920],[25,26]],[[7090,2812],[68,17]],[[7158,2829],[21,-8],[8,-21],[12,2],[20,-8],[10,13],[22,-7],[19,3],[12,7],[4,13],[29,10]],[[9459,1357],[-16,-6],[-75,5],[-13,5],[-11,10],[-10,12],[-6,11],[9,25],[4,6],[9,2],[80,-25],[6,-3],[7,-5],[14,-13],[6,-13],[-4,-11]],[[9286,1375],[2,0],[27,-6],[-5,10],[-3,13],[3,9],[13,-1],[2,-11],[7,-17],[9,-15],[7,-6],[138,-14],[80,22],[208,17],[16,-9],[-6,-29],[-2,-6],[-3,-6],[-4,-4],[-4,-3],[-23,0],[-3,-3],[1,-20],[5,-15],[11,-24],[5,-37],[-5,-34],[-13,-29],[-18,-19],[-43,-13],[-18,-13],[-7,0],[-14,1],[-8,-3],[-6,-5],[-6,-7],[-4,-4],[-13,-5],[-43,-1],[-12,-3],[-13,-8],[-26,-21],[-33,-43],[-6,-10],[1,-24],[7,-35],[-22,-8],[-49,14]],[[9102,1431],[42,7],[5,3],[3,6],[2,6],[3,3],[28,7]],[[7787,4728],[15,-21],[37,-27],[51,-29]],[[7890,4651],[-18,-14],[-9,-13]],[[7863,4624],[-29,7],[-52,14],[-34,17],[-26,7]],[[7940,4666],[-50,-15]],[[7912,4730],[1,-2],[11,-23],[5,-9],[4,-8],[3,-11],[4,-11]],[[7974,4590],[-24,3],[-39,-9],[-24,6],[-20,4]],[[7867,4594],[4,17],[-8,13]],[[7940,4666],[7,-4],[3,-3],[18,-15],[4,-10],[1,-6],[-1,-4],[0,-5],[0,-20],[2,-9]],[[7974,4590],[5,-3],[-2,-8],[10,-29]],[[7834,4562],[13,30],[20,2]],[[7033,3290],[7,-22],[6,-34],[1,-25],[25,-22]],[[7072,3187],[-11,-12],[-2,-4],[2,-11],[-5,-6],[-5,-5],[-10,7],[-3,-14],[-2,-6]],[[7036,3136],[-21,2],[-21,6]],[[6994,3144],[-1,39],[2,21],[-16,9],[-4,12],[12,11],[-8,31],[-22,25]],[[6957,3292],[16,11],[8,16]],[[6957,3292],[-24,-6],[-23,-2],[-28,-3]],[[6882,3281],[-31,58],[-3,12],[1,13],[8,14],[43,59],[34,38],[5,3],[6,10],[2,1]],[[6994,3144],[-7,2],[-25,15],[-20,19],[-16,20],[-44,81]],[[7074,3308],[40,-36],[10,9],[16,-8],[30,0],[3,-13],[11,-7],[10,-14]],[[7120,3188],[-39,8],[-9,-9]],[[6900,3522],[-18,22],[-5,30],[8,69],[-8,26],[10,15],[15,8]],[[7831,3482],[-5,-37],[-20,-11],[4,-39],[9,-29]],[[7819,3366],[-10,-10],[-38,-12],[-26,4],[-37,-18],[-23,-3],[-6,-14]],[[7627,3328],[-26,32],[-26,24],[-7,19]],[[7568,3403],[-19,3],[-4,19]],[[7545,3425],[96,22],[34,7],[54,30],[-11,32]],[[7718,3516],[23,14],[47,9]],[[7788,3539],[43,-57]],[[7575,3635],[36,-43],[27,-3],[27,-18],[30,-25],[23,-30]],[[7545,3425],[-7,7],[2,15],[-8,10],[-2,9],[-12,0],[-10,-9],[-11,-2],[-13,10],[-9,-1],[-7,11],[-6,2]],[[7736,3665],[34,-44],[0,-55],[32,-4],[-14,-23]],[[8009,3515],[-16,-19],[-55,-21],[-32,11],[-41,5],[-34,-9]],[[8058,3408],[-8,-22],[-40,-19],[-26,5]],[[7984,3372],[-5,12],[-10,4],[-36,-3],[-16,5],[-24,-8],[-12,4],[-20,-3],[-4,2],[-5,8],[-8,2],[-15,-8],[-10,-21]],[[7343,3329],[20,-27]],[[7363,3302],[4,-30],[-14,-17]],[[7353,3255],[-31,6],[-26,-6],[-25,-31]],[[7247,3264],[-11,48],[-6,21]],[[7230,3333],[45,14],[45,-18],[23,0]],[[7199,3389],[26,-40],[5,-16]],[[7317,3421],[10,-42],[16,-50]],[[7393,3402],[3,-25],[2,-34]],[[7398,3343],[-18,-17],[-17,-24]],[[7568,3403],[-70,-26],[-36,-18],[-20,-37]],[[7442,3322],[-44,21]],[[7575,3270],[-36,22],[-46,14],[-37,-24],[-27,-6]],[[7429,3276],[9,26],[4,20]],[[7553,3218],[-28,-3],[-45,0],[-36,18],[-29,8]],[[7415,3241],[0,20],[14,15]],[[7549,3180],[-12,-3],[-9,-14],[-20,8],[-25,-1],[-7,-6],[-6,-23],[-13,-6],[-10,9],[2,7],[-3,6],[-17,8],[-23,1],[-14,-9]],[[7392,3157],[-4,23],[21,27],[6,34]],[[7392,3157],[-15,-3],[-21,16]],[[7356,3170],[-10,26],[10,17],[8,18],[-11,24]],[[7356,3170],[-32,3],[-19,10],[-22,6]],[[7952,3139],[0,53],[-8,25]],[[7944,3217],[0,30],[24,23],[29,8]],[[7997,3278],[43,-8],[11,-33],[39,-30],[41,-20]],[[7679,3313],[147,-17],[19,-26],[31,-2],[31,2],[10,-35],[13,-18],[14,0]],[[7984,3372],[13,-36],[19,-25],[-19,-33]],[[7728,2384],[-32,-4],[1,-15],[14,-13],[-3,-41],[-24,-5],[-17,-29]],[[7541,2329],[2,24]],[[7543,2353],[20,-4],[21,3],[12,18],[-13,11],[13,25],[20,6],[7,17]],[[7623,2429],[20,11],[11,15]],[[7543,2353],[-8,15],[-24,-2],[-9,10],[15,26],[-8,26],[1,11]],[[7510,2439],[14,9]],[[7524,2448],[10,-13],[33,11],[44,-5],[12,-12]],[[7479,2427],[5,14],[12,4],[14,-6]],[[7527,2493],[11,-28],[-14,-17]],[[7806,2335],[-13,-85]],[[8483,2018],[45,-22],[29,5],[42,-10],[36,35],[-4,35],[13,33],[46,11]],[[8230,1433],[-13,-29],[-27,-10],[-18,0]],[[8172,1394],[-19,20],[2,50]],[[8172,1394],[11,-25],[3,-27]],[[8306,1513],[10,-34],[2,-32]],[[8318,1447],[11,-30],[-2,-36],[-18,-25],[-7,-18]],[[8318,1447],[34,-5],[41,-10],[19,-21],[2,-25],[-23,-10],[11,-23]],[[8442,1469],[21,0],[9,-6],[7,-11],[2,-27]],[[7158,2829],[2,24],[0,15],[-17,8],[-14,10],[9,39],[25,15],[42,18],[39,18],[-2,21],[4,16],[23,-6],[11,24],[15,23],[-7,23],[-35,23],[-22,44]],[[6859,3078],[0,15],[-7,11]],[[6961,3120],[11,-8],[18,-7],[20,1],[1,2],[1,4],[2,4],[5,2],[6,0],[9,-4],[5,-1],[11,0],[9,3]],[[7059,3116],[26,-8],[25,5],[44,-3],[38,17]],[[7059,3116],[18,9],[-4,11],[2,9],[5,6],[5,5],[6,-2],[5,1],[6,3],[6,5],[-9,0],[-33,-6],[-7,-4],[-5,-13],[-11,-5],[-7,1]],[[4752,0],[-3,0],[-5,5],[0,5],[4,2],[3,-3],[2,-3],[-1,-6]],[[4788,28],[-7,-4],[-7,4],[1,12],[5,8],[5,-4],[5,-8],[-2,-8]],[[4742,55],[-3,0],[0,2],[-1,2],[-1,3],[1,3],[1,5],[3,1],[3,-3],[0,-7],[-3,-6]],[[4763,60],[-4,-7],[-6,3],[-4,10],[-1,8],[5,-1],[3,-2],[2,-1],[4,-3],[1,-7]],[[4792,74],[2,0],[4,1],[2,-2],[-6,-6],[-7,0],[-10,7],[-2,3],[5,4],[2,0],[3,-4],[4,-3],[3,0]]],"transform":{"scale":[0.0015464030127012621,0.0010965574096409613],"translate":[-13.691314256999902,49.883408921000026]}};
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
