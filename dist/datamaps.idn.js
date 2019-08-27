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
  Datamap.prototype.idnTopo = {"type":"Topology","objects":{"idn":{"type":"GeometryCollection","geometries":[{"type":"MultiPolygon","properties":{"name":null},"id":"-99","arcs":[[[0]],[[1]],[[2]],[[3]],[[4]],[[5]],[[6]],[[7]],[[8]],[[9]],[[10]],[[11]],[[12]],[[13]],[[14]],[[15]],[[16]],[[17]],[[18]],[[19]],[[20]],[[21]],[[22]],[[23]],[[24]],[[25]],[[26]],[[27]],[[28]],[[29]],[[30]],[[31]],[[32]],[[33]],[[34]],[[35]],[[36]],[[37]],[[38]],[[39]],[[40]],[[41]],[[42]],[[43]],[[44]],[[45]],[[46]],[[47]],[[48]],[[49]],[[50]],[[51]],[[52]],[[53]],[[54]],[[55]],[[56]],[[57]],[[58]],[[59]],[[60]],[[61]],[[62]],[[63]],[[64]],[[65]],[[66]],[[67]],[[68]],[[69]],[[70]],[[71]],[[72]],[[73]],[[74]],[[75]],[[76]],[[77]],[[78]],[[79]],[[80]],[[81]],[[82]],[[83]],[[84]],[[85]],[[86]],[[87]],[[88]],[[89]],[[90]],[[91]],[[92]],[[93]],[[94]],[[95]],[[96]],[[97]],[[98]],[[99]],[[100]],[[101]],[[102]],[[103]],[[104]],[[105]],[[106]],[[107]],[[108]],[[109]],[[110]],[[111]],[[112]],[[113]],[[114]],[[115]],[[116]],[[117]],[[118]],[[119]],[[120]],[[121]],[[122]],[[123]],[[124]],[[125]],[[126]],[[127]],[[128]],[[129]],[[130]],[[131]],[[132]],[[133]],[[134]],[[135]],[[136]],[[137]],[[138]],[[139]],[[140]],[[141]],[[142]],[[143]],[[144]],[[145]],[[146]],[[147]],[[148]],[[149]],[[150]],[[151]],[[152]],[[153]],[[154]],[[155]],[[156]],[[157]],[[158]],[[159]],[[160]],[[161]],[[162]],[[163]],[[164]],[[165]],[[166]],[[167]],[[168]],[[169]],[[170]],[[171]],[[172]],[[173]],[[174]],[[175]],[[176]],[[177]],[[178]],[[179]],[[180]],[[181]],[[182]],[[183]],[[184]],[[185]],[[186]],[[187]],[[188]],[[189]],[[190]],[[191]],[[192]],[[193]],[[194]],[[195]],[[196]],[[197]],[[198]],[[199]],[[200]],[[201]],[[202]],[[203]],[[204]],[[205]],[[206]],[[207]],[[208]],[[209]],[[210]],[[211]],[[212]],[[213]],[[214]],[[215]],[[216]],[[217]],[[218]],[[219]],[[220]],[[221]],[[222]]]},{"type":"MultiPolygon","properties":{"name":"Aceh"},"id":"ID.AC","arcs":[[[223]],[[224]],[[225]],[[226]],[[227,228]],[[229]],[[230]],[[231]]]},{"type":"MultiPolygon","properties":{"name":"Kalimantan Timur"},"id":"ID.KI","arcs":[[[232]],[[233]],[[234]],[[235]],[[236]],[[237]],[[238]],[[239]],[[240,241,242,243]]]},{"type":"Polygon","properties":{"name":"Jawa Barat"},"id":"ID.JR","arcs":[[244,245,246,247,248]]},{"type":"MultiPolygon","properties":{"name":"Jawa Tengah"},"id":"ID.JT","arcs":[[[249]],[[250,251,252,253,-245,254]],[[255]]]},{"type":"MultiPolygon","properties":{"name":"Bengkulu"},"id":"ID.BE","arcs":[[[256]],[[257,258,259,260,261]]]},{"type":"MultiPolygon","properties":{"name":"Banten"},"id":"ID.BT","arcs":[[[262]],[[263,-247,264]]]},{"type":"Polygon","properties":{"name":"Jakarta Raya"},"id":"ID.JK","arcs":[[-248,-264,265]]},{"type":"MultiPolygon","properties":{"name":"Kalimantan Barat"},"id":"ID.KB","arcs":[[[266]],[[267]],[[268]],[[269]],[[270]],[[-243,271,272]]]},{"type":"MultiPolygon","properties":{"name":"Lampung"},"id":"ID.LA","arcs":[[[273]],[[274,-259,275]]]},{"type":"Polygon","properties":{"name":"Sumatera Selatan"},"id":"ID.SL","arcs":[[276,-276,-258,277]]},{"type":"MultiPolygon","properties":{"name":"Bangka-Belitung"},"id":"ID.BB","arcs":[[[278]],[[279]],[[280]],[[281]],[[282]]]},{"type":"MultiPolygon","properties":{"name":"Bali"},"id":"ID.BA","arcs":[[[283]],[[284]]]},{"type":"MultiPolygon","properties":{"name":"Jawa Timur"},"id":"ID.JI","arcs":[[[285]],[[286]],[[287]],[[288]],[[289]],[[290]],[[-251,291]],[[292]]]},{"type":"MultiPolygon","properties":{"name":"Kalimantan Selatan"},"id":"ID.KS","arcs":[[[293]],[[294]],[[295]],[[296,297,-241]]]},{"type":"MultiPolygon","properties":{"name":"Nusa Tenggara Timur"},"id":"ID.NT","arcs":[[[298]],[[299]],[[300]],[[301]],[[302]],[[303]],[[304]],[[305]],[[306]],[[307]],[[308]],[[309]],[[310]],[[311]],[[312]],[[313]]]},{"type":"MultiPolygon","properties":{"name":"Sulawesi Selatan"},"id":"ID.SE","arcs":[[[314]],[[315]],[[316]],[[317]],[[318,319,320,321]]]},{"type":"Polygon","properties":{"name":"Sulawesi Barat"},"id":"ID.SR","arcs":[[-321,322,323]]},{"type":"MultiPolygon","properties":{"name":"Kepulauan Riau"},"id":"ID.KR","arcs":[[[324]],[[325]],[[326]],[[327]],[[328]],[[329]],[[330]],[[331]],[[332]],[[333]],[[334]],[[335]],[[336]],[[337]],[[338]],[[339]],[[340]],[[341]],[[342]],[[343]],[[344]],[[345]],[[346]],[[347]],[[348]],[[349]],[[350]],[[351]],[[352]],[[353]],[[354]],[[355]],[[356]],[[357]]]},{"type":"Polygon","properties":{"name":"Gorontalo"},"id":"ID.GO","arcs":[[358,359,360,361]]},{"type":"Polygon","properties":{"name":"Jambi"},"id":"ID.JA","arcs":[[-278,-262,362,363,364]]},{"type":"Polygon","properties":{"name":"Kalimantan Tengah"},"id":"ID.KT","arcs":[[-298,365,-272,-242]]},{"type":"MultiPolygon","properties":{"name":"Irian Jaya Barat"},"id":"ID.IB","arcs":[[[366]],[[367]],[[368]],[[369]],[[370]],[[371]],[[372]],[[373]],[[374]],[[375]],[[376]],[[377]],[[378]],[[379,380]],[[381]],[[382]],[[383]],[[384]],[[385]]]},{"type":"MultiPolygon","properties":{"name":"Sumatera Utara"},"id":"ID.SU","arcs":[[[386]],[[387]],[[388]],[[389]],[[390]],[[391,392,393,-228,394]]]},{"type":"MultiPolygon","properties":{"name":"Riau"},"id":"ID.RI","arcs":[[[395]],[[396]],[[397]],[[398]],[[399]],[[400]],[[401]],[[402]],[[403]],[[404]],[[-364,405,-392,406]]]},{"type":"MultiPolygon","properties":{"name":"Sulawesi Utara"},"id":"ID.SW","arcs":[[[407]],[[-359,408]],[[409]],[[410]],[[411]],[[412]],[[413]],[[414]],[[415]],[[416]],[[417]],[[418]]]},{"type":"MultiPolygon","properties":{"name":"Maluku Utara"},"id":"ID.LA","arcs":[[[419]],[[420]],[[421]],[[422]],[[423]],[[424]],[[425]],[[426]],[[427]],[[428]],[[429]],[[430]],[[431]],[[432]],[[433]],[[434]],[[435]],[[436]],[[437]],[[438]],[[439]]]},{"type":"MultiPolygon","properties":{"name":"Sumatera Barat"},"id":"ID.SB","arcs":[[[440]],[[441]],[[442]],[[443]],[[444]],[[-406,-363,-261,445,-393]]]},{"type":"Polygon","properties":{"name":"Yogyakarta"},"id":"ID.YO","arcs":[[446,-253]]},{"type":"MultiPolygon","properties":{"name":"Maluku"},"id":"ID.MA","arcs":[[[447]],[[448]],[[449]],[[450]],[[451]],[[452]],[[453]],[[454]],[[455]],[[456]],[[457]],[[458]],[[459]],[[460]],[[461]],[[462]],[[463]],[[464]],[[465]],[[466]],[[467]],[[468]],[[469]],[[470]],[[471]],[[472]],[[473]],[[474]],[[475]],[[476]],[[477]],[[478]],[[479]],[[480]],[[481]],[[482]],[[483]],[[484]],[[485]],[[486]],[[487]],[[488]],[[489]],[[490]],[[491]],[[492]],[[493]],[[494]],[[495]],[[496]],[[497]],[[498]],[[499]],[[500]],[[501]],[[502]],[[503]]]},{"type":"MultiPolygon","properties":{"name":"Nusa Tenggara Barat"},"id":"ID.NB","arcs":[[[504]],[[505]],[[506]],[[507]]]},{"type":"MultiPolygon","properties":{"name":"Sulawesi Tenggara"},"id":"ID.SG","arcs":[[[508]],[[509]],[[510]],[[511]],[[512]],[[513]],[[514]],[[515]],[[516]],[[517]],[[518,519,-319]]]},{"type":"MultiPolygon","properties":{"name":"Sulawesi Tengah"},"id":"ID.ST","arcs":[[[520]],[[521]],[[522]],[[523]],[[524]],[[525]],[[526]],[[527]],[[528]],[[529]],[[530]],[[531]],[[532]],[[533]],[[534]],[[535]],[[-361,536,-519,-322,-324,537]]]},{"type":"MultiPolygon","properties":{"name":"Papua"},"id":"ID.PA","arcs":[[[538]],[[539]],[[540]],[[541]],[[542]],[[543]],[[-380,544]],[[545]],[[546]]]}]}},"arcs":[[[6057,24],[3,-3],[2,-4],[0,-3],[0,-4],[1,-2],[0,-6],[-3,-2],[-4,7],[-1,4],[-1,4],[0,4],[0,4],[1,-1],[2,2]],[[6020,106],[1,-4],[-1,-1],[-1,1],[-1,-1],[-2,4],[-4,8],[-2,6],[4,1],[3,-1],[0,-5],[1,-3],[2,-5]],[[5482,410],[0,-4],[-2,-4],[-1,-2],[-4,-1],[-1,1],[0,4],[2,3],[3,3],[1,0],[1,2],[1,-2]],[[5499,1244],[-3,-2],[-1,1],[-1,3],[-1,2],[0,1],[0,3],[2,4],[0,3],[2,8],[2,3],[3,-3],[1,-5],[0,-10],[-2,-6],[-2,-2]],[[5392,1292],[-2,-5],[-1,1],[-1,0],[-1,0],[-1,2],[1,10],[2,7],[0,1],[1,-2],[0,-2],[1,-1],[1,-1],[1,-6],[-1,-4]],[[5269,1378],[0,-6],[0,1],[-1,0],[-1,-7],[-2,3],[0,3],[0,2],[0,1],[0,1],[1,1],[0,4],[-1,2],[1,2],[1,0],[0,3],[1,-1],[1,-2],[2,-4],[-2,-3]],[[5350,1391],[-1,-5],[-1,-2],[-3,3],[-1,0],[-2,-2],[-1,-4],[-1,-5],[1,-8],[-1,-1],[-1,7],[0,2],[-1,1],[-1,-1],[0,1],[-1,4],[1,2],[2,1],[4,8],[1,3],[1,3],[4,1],[1,-2],[0,-6]],[[5375,1475],[-1,-5],[0,4],[0,5],[2,5],[2,-5],[-1,-3],[-2,-1]],[[4772,1525],[0,-9],[-1,-2],[-1,2],[-2,-1],[0,-1],[-3,-4],[-4,-2],[-1,0],[-2,2],[-3,-1],[-3,-3],[-2,1],[-2,3],[4,3],[5,4],[6,-2],[2,0],[2,5],[2,4],[3,1]],[[4781,1534],[1,-1],[0,1],[2,-1],[2,0],[0,-4],[-1,-3],[-1,1],[-2,-1],[1,-2],[0,-2],[-3,-3],[-1,10],[1,5],[0,2],[1,-2]],[[5280,1529],[3,-2],[5,6],[1,-3],[0,-3],[1,-2],[1,-5],[-1,-5],[-1,-10],[-1,-1],[-3,12],[0,-1],[-2,-8],[0,-4],[0,-3],[-3,-3],[0,1],[-1,5],[-1,5],[0,5],[-1,3],[0,6],[1,3],[-1,8],[0,2],[0,2],[1,2],[2,-10]],[[5404,1553],[2,-2],[1,2],[1,-4],[-1,-4],[-2,-6],[-1,2],[-2,1],[-2,3],[0,7],[0,1],[1,0],[1,1],[1,2],[1,-3]],[[4574,1561],[-1,-1],[-1,3],[1,6],[2,0],[0,-5],[-1,-3]],[[7333,1652],[-1,0],[0,1],[1,-1]],[[4872,1685],[-1,-2],[-2,-2],[-2,-2],[-1,0],[0,-1],[-1,-2],[-1,0],[-2,1],[-1,2],[-2,0],[1,4],[2,2],[3,-1],[2,8],[3,1],[2,0],[1,-1],[1,-2],[1,0],[-1,-3],[-1,0],[-1,-2]],[[7576,1653],[-3,-7],[-1,-1],[-1,1],[-1,0],[-1,2],[0,4],[1,4],[6,30],[14,25],[3,5],[1,-3],[0,-3],[-1,-6],[0,-2],[-1,-4],[-2,-5],[-2,-2],[-4,-8],[-8,-30]],[[4949,1712],[-1,-8],[-2,2],[-2,5],[1,6],[4,-5]],[[6689,1762],[-5,-21],[-1,4],[-1,12],[-2,6],[0,11],[0,7],[0,5],[2,6],[1,0],[2,-6],[2,-7],[1,-8],[1,-9]],[[7515,1816],[-4,-17],[-3,3],[-3,6],[0,34],[1,4],[-1,4],[-1,6],[0,3],[0,2],[2,0],[5,-13],[1,-8],[3,-11],[0,-7],[0,-6]],[[5816,2191],[-3,-3],[-1,3],[1,3],[0,2],[-1,2],[2,0],[1,4],[1,3],[1,3],[3,0],[3,-5],[-1,-8],[-3,-2],[-3,-2]],[[4086,2228],[-4,-1],[-6,8],[0,3],[1,3],[6,-2],[5,-3],[0,-3],[-2,-5]],[[4114,2257],[4,-20],[2,-8],[-2,2],[-2,6],[0,3],[-2,3],[-6,-4],[-2,2],[-1,8],[3,7],[4,4],[2,-3]],[[4298,2283],[0,-1],[-2,4],[0,2],[0,2],[2,2],[3,3],[-1,-6],[0,-4],[-2,-2]],[[8588,2328],[3,-4],[6,1],[1,-8],[-3,-11],[-3,5],[-3,0],[-2,2],[-2,-1],[-1,0],[1,6],[2,8],[1,2]],[[4143,2305],[0,-7],[-14,3],[-9,9],[-2,4],[-2,7],[2,7],[2,2],[0,-2],[2,-2],[17,-5],[3,-5],[1,-11]],[[4484,2345],[1,-9],[-1,-10],[-4,3],[1,5],[-3,1],[-1,-1],[0,2],[0,1],[-1,6],[2,-1],[4,-2],[2,5]],[[2296,2358],[-4,-4],[-7,4],[1,6],[1,1],[1,1],[1,0],[5,-3],[2,-5]],[[8034,2323],[-4,-4],[-3,6],[1,11],[3,7],[1,1],[11,26],[3,3],[2,0],[0,-4],[-5,-8],[-7,-31],[-2,-7]],[[4463,2350],[0,-5],[-5,10],[0,5],[2,7],[1,2],[1,3],[2,2],[1,1],[1,-4],[-2,-1],[0,-4],[2,-6],[1,-7],[-2,-3],[-2,0]],[[4449,2380],[1,-5],[0,-6],[1,-5],[1,-1],[-1,-3],[-2,1],[-4,2],[-4,9],[2,6],[1,-1],[3,2],[1,-1],[1,3],[0,-1]],[[4170,2362],[-1,-1],[-2,1],[-1,0],[-1,8],[3,15],[3,-4],[-1,-8],[0,-11]],[[4542,2393],[7,-7],[-5,1],[-2,6]],[[2342,2381],[-2,-2],[-1,6],[2,2],[3,2],[1,3],[4,2],[1,-1],[-2,-6],[-3,-2],[-1,-2],[-2,-2]],[[4493,2369],[2,-3],[0,-5],[-2,-1],[-6,7],[-1,-1],[-1,-2],[-3,0],[-7,7],[-1,5],[-4,6],[0,5],[0,2],[1,0],[0,6],[1,3],[1,1],[3,-1],[16,-25],[1,-4]],[[4621,2397],[-2,-4],[-3,5],[1,4],[4,2],[1,-5],[-1,-2]],[[8590,2393],[-2,-1],[-1,5],[1,4],[2,3],[2,3],[1,-9],[3,-4],[-6,-1]],[[7936,2421],[-4,-8],[-2,2],[-1,2],[0,5],[1,6],[1,14],[5,5],[1,-1],[3,-1],[0,-8],[-4,-16]],[[8624,2451],[-7,-9],[-8,-18],[-2,1],[-2,8],[1,4],[2,-2],[1,-4],[1,1],[0,1],[1,3],[1,2],[2,5],[1,4],[1,2],[1,-1],[3,2],[2,5],[2,2],[1,-3],[-1,-3]],[[5612,2458],[-2,-9],[-2,1],[0,12],[-2,16],[1,11],[2,2],[2,-6],[1,-6],[0,-14],[0,-7]],[[8596,2509],[0,-2],[-2,-11],[-2,-3],[-2,-2],[-1,1],[0,5],[2,5],[0,3],[-2,2],[-3,0],[-1,-1],[-1,-2],[-1,-1],[-1,3],[1,7],[2,12],[1,3],[1,2],[0,2],[-1,1],[-1,2],[0,5],[2,6],[0,9],[1,5],[1,1],[2,-7],[1,-8],[-1,-6],[-2,-6],[1,-1],[0,-2],[-1,-2],[0,-1],[1,-2],[2,-8],[0,-5],[1,-1],[2,-1],[1,-2]],[[8657,2645],[-3,-22],[-2,1],[-1,5],[-2,-1],[-2,0],[-1,2],[-1,13],[0,6],[1,1],[2,0],[6,15],[2,3],[2,-2],[3,-3],[-1,-6],[-3,-12]],[[8639,2701],[-2,0],[-2,9],[1,18],[1,6],[2,4],[2,1],[0,-31],[-2,-7]],[[2269,2877],[1,-2],[1,1],[1,-1],[1,-5],[-1,-9],[0,-7],[-5,3],[-2,3],[-2,5],[0,4],[1,4],[2,-3],[2,4],[1,3]],[[2258,2918],[-1,-5],[1,1],[2,-4],[-1,-5],[-1,-3],[-3,-8],[-2,-2],[-2,-4],[-1,3],[2,6],[2,9],[2,11],[1,4],[1,-3]],[[2359,2990],[1,-9],[0,-9],[-2,-1],[-1,-3],[0,7],[-2,7],[-1,0],[0,1],[-1,2],[2,3],[4,2]],[[2425,2992],[-2,-2],[-2,7],[2,3],[2,-1],[0,-5],[0,-2]],[[2281,2977],[-2,-4],[-3,2],[-2,3],[-1,5],[-1,6],[1,2],[1,3],[1,4],[2,4],[3,0],[2,-2],[1,-5],[0,-3],[1,-3],[-1,-5],[-2,-7]],[[2287,3040],[2,-4],[1,0],[-1,-4],[-1,-3],[0,-3],[-1,-2],[0,-5],[-1,-1],[-4,-5],[-1,8],[-2,5],[3,8],[-1,4],[0,1],[2,1],[1,-2],[2,6],[1,2],[1,-3],[-1,-3]],[[3392,3044],[-2,-10],[0,2],[0,3],[0,1],[0,5],[2,2],[0,-3]],[[3302,3063],[0,-1],[-2,3],[2,2],[0,-4]],[[2452,3067],[-1,-2],[-4,2],[-1,2],[5,1],[1,-1],[0,-2]],[[2238,3068],[1,-3],[-1,-2],[-2,-3],[-2,-8],[-2,-2],[-7,5],[-2,0],[-1,0],[0,2],[1,3],[3,5],[1,-1],[1,0],[2,5],[2,-2],[2,5],[1,6],[1,-4],[1,-1],[1,-5]],[[3364,3073],[2,-4],[1,-1],[0,-5],[0,-2],[-2,-4],[0,-3],[0,-1],[-2,2],[-1,3],[2,6],[0,4],[-1,2],[1,-4],[-1,-2],[-1,2],[-1,2],[-2,-3],[0,5],[4,12],[2,6],[-1,-8],[0,-7]],[[3350,3109],[-1,-5],[-1,5],[0,3],[2,-3]],[[3315,3098],[-1,-4],[-2,7],[-1,4],[0,6],[1,2],[1,1],[2,-1],[0,-3],[0,-7],[1,-4],[-1,-1]],[[8650,3098],[-2,-1],[-1,3],[1,6],[0,6],[1,2],[4,-2],[0,-1],[1,-3],[0,-2],[0,-1],[-2,-3],[-1,-3],[-1,-1]],[[6304,3092],[-13,-4],[-3,3],[-2,7],[-3,10],[0,9],[1,4],[3,1],[14,-12],[3,-8],[1,0],[2,-2],[0,-5],[-3,-3]],[[8087,3093],[-2,-2],[-2,2],[0,2],[0,2],[-1,7],[0,10],[1,4],[2,3],[1,1],[1,1],[1,-3],[0,-1],[0,-9],[0,-7],[-1,-10]],[[2220,3158],[1,-1],[1,0],[1,-1],[2,-2],[-1,-2],[-1,-5],[0,-3],[-1,-3],[-2,-1],[-1,3],[-1,1],[0,3],[0,3],[0,5],[2,3]],[[5985,3132],[-7,-3],[-3,3],[-3,2],[-2,3],[2,4],[3,5],[2,6],[5,24],[7,-3],[2,-4],[1,-9],[0,-9],[-3,-12],[-4,-7]],[[8551,3198],[-10,-17],[-3,-12],[-2,-3],[-1,2],[-1,1],[-3,7],[-1,5],[1,4],[1,0],[1,0],[4,3],[2,7],[3,14],[1,5],[2,1],[2,0],[3,-4],[2,-7],[-1,-6]],[[4222,3227],[4,-2],[2,0],[1,-1],[1,0],[0,-7],[0,-4],[-1,-2],[-2,-7],[-1,-3],[-2,-2],[-1,4],[-2,6],[-4,3],[0,5],[0,9],[1,5],[2,2],[2,-1],[0,-5]],[[5982,3216],[-2,-2],[-3,3],[-2,7],[1,11],[2,8],[6,6],[1,-2],[-2,-17],[-1,-9],[0,-5]],[[8533,3221],[-1,0],[-1,2],[1,19],[-1,4],[0,3],[0,5],[1,4],[3,1],[2,-5],[1,-8],[0,-8],[-5,-17]],[[5286,3249],[-1,-11],[-5,-8],[-2,-2],[-1,2],[0,4],[-1,1],[-1,-2],[-1,1],[0,2],[0,3],[-2,6],[0,6],[1,3],[1,-4],[2,-2],[2,8],[0,7],[1,1],[1,1],[1,1],[2,-2],[1,-8],[-1,-3],[3,-4]],[[4227,3283],[-1,-11],[-1,1],[-1,0],[-1,3],[-1,2],[0,6],[-1,5],[1,4],[0,2],[1,1],[2,-3],[2,-5],[0,-2],[0,-3]],[[4990,3314],[-1,-12],[-1,2],[-2,3],[-1,10],[-1,10],[-1,8],[3,0],[1,-6],[2,-6],[1,-9]],[[8607,3341],[-1,-4],[-3,0],[-1,-3],[-4,-22],[-2,-4],[-4,-1],[-4,8],[-1,6],[1,6],[1,4],[1,2],[2,3],[2,3],[2,-1],[0,1],[0,3],[1,5],[4,4],[4,-2],[2,-8]],[[6383,3342],[-2,-2],[-2,6],[0,7],[2,1],[1,-2],[1,-5],[0,-5]],[[4928,3423],[-3,-9],[1,9],[-2,8],[3,10],[4,-12],[-3,-6]],[[4263,3493],[-2,-7],[-1,6],[-1,10],[2,11],[2,5],[1,-16],[0,-6],[-1,-3]],[[4488,3588],[-3,-5],[-1,4],[2,11],[3,5],[2,6],[3,9],[1,4],[0,-8],[-2,-10],[-1,-4],[-2,-6],[-2,-6]],[[6114,3665],[0,-16],[-1,-6],[-2,-2],[-1,2],[0,4],[-1,1],[0,-3],[0,-4],[-1,-3],[-1,2],[-1,1],[-3,3],[-3,-1],[-1,3],[-1,1],[-1,5],[0,3],[2,-1],[2,1],[0,2],[-2,0],[0,2],[1,4],[8,9],[6,-3],[0,-4]],[[4507,3720],[-4,-6],[-3,1],[1,4],[4,8],[2,4],[3,5],[1,1],[0,-1],[0,-2],[-2,-7],[-2,-7]],[[5950,3728],[-6,-14],[-2,1],[1,6],[4,15],[3,6],[2,-1],[-1,-8],[-1,-5]],[[6032,3810],[0,-4],[0,-4],[-1,-2],[-3,6],[-1,1],[-1,1],[0,1],[-1,-3],[-1,0],[-2,4],[-1,5],[1,8],[2,7],[3,1],[2,-1],[2,-3],[1,-3],[0,-3],[-1,-3],[0,-3],[1,-3],[0,-2]],[[5744,4075],[2,-3],[3,2],[3,4],[2,-2],[1,-3],[-1,-3],[-2,-1],[0,-3],[1,-3],[-2,-1],[-3,0],[-1,-6],[2,-12],[-1,-3],[-1,0],[-5,6],[-2,-2],[-2,-4],[0,6],[2,11],[-1,5],[-2,5],[-1,8],[1,2],[2,-3],[2,0],[1,3],[0,4],[1,2],[0,4],[0,2],[1,-1],[0,-14]],[[1312,4133],[-3,-7],[-2,3],[2,8],[2,5],[2,-6],[-1,-3]],[[8509,4182],[8,-23],[0,2],[0,3],[1,-2],[1,-3],[0,-3],[0,-4],[1,-2],[1,-4],[1,-3],[0,-3],[6,-5],[0,-4],[-2,-3],[-1,1],[-1,2],[-3,4],[-1,1],[0,2],[-1,2],[-5,6],[-4,0],[-1,0],[0,2],[-6,4],[-1,2],[-5,28],[-2,5],[0,2],[0,1],[9,2],[1,-3],[4,-7]],[[7815,4212],[1,-2],[1,1],[0,-2],[-1,-4],[-1,-3],[-4,-2],[-1,-2],[-1,0],[-1,6],[2,5],[0,2],[2,5],[1,0],[0,-3],[1,-1],[1,0]],[[8467,4215],[-1,-4],[-1,2],[0,3],[-2,7],[-1,4],[-2,7],[-3,18],[-1,14],[-1,5],[-3,25],[0,7],[1,1],[1,-1],[2,-4],[2,-10],[3,-31],[4,-18],[1,-6],[1,-10],[0,-9]],[[1228,4454],[2,-4],[1,0],[1,-1],[0,-2],[-3,-3],[-4,2],[-1,1],[-1,1],[-1,2],[0,4],[2,2],[4,-2]],[[7784,4540],[-3,-3],[-3,4],[-1,3],[0,3],[0,3],[1,4],[1,2],[4,-3],[1,-3],[1,-5],[-1,-5]],[[3997,4556],[-3,-9],[-1,3],[0,4],[-1,-2],[0,3],[1,4],[-1,5],[1,4],[2,7],[3,6],[1,-8],[1,-4],[0,-5],[-1,-5],[-2,-3]],[[2722,4584],[-1,-3],[-1,5],[0,15],[0,11],[2,2],[3,-2],[2,-2],[0,-3],[0,-2],[0,-2],[-1,-2],[0,-3],[-1,-6],[-2,-4],[0,-2],[-1,-2]],[[2722,4732],[-1,-5],[-1,10],[-1,8],[2,4],[2,-3],[-1,-2],[1,-3],[-1,-2],[0,-7]],[[8872,4766],[1,-1],[-1,-3],[-1,-2],[-1,2],[-1,1],[-1,-1],[-1,-6],[-4,0],[-1,-1],[0,-1],[0,-2],[-1,-2],[-1,-1],[-3,-7],[-2,1],[-2,3],[0,6],[1,7],[2,2],[1,4],[2,2],[2,-1],[4,3],[1,0],[4,-2],[2,-1]],[[2708,4757],[0,-4],[0,-2],[0,-2],[-1,-1],[1,-2],[-1,-1],[-1,0],[1,-3],[-2,-2],[-1,-2],[-1,0],[-1,2],[1,2],[-1,-1],[-1,1],[0,1],[0,1],[0,5],[1,6],[0,1],[-1,-2],[-1,1],[0,5],[1,2],[1,5],[2,2],[1,2],[2,1],[1,2],[2,-11],[-1,-3],[-1,-1],[0,-2]],[[4605,4773],[0,-2],[1,0],[1,0],[2,-2],[0,-5],[-2,-5],[-2,1],[-5,7],[-2,9],[-1,8],[2,4],[1,-1],[3,-4],[1,-5],[0,-2],[1,-1],[0,-2]],[[2550,4787],[-1,-1],[-3,2],[1,9],[2,4],[0,5],[1,0],[1,-3],[1,-1],[0,-3],[0,-6],[-2,-6]],[[3303,4791],[0,-7],[-2,-3],[-2,0],[-1,-1],[-2,1],[-2,6],[-1,2],[-2,-1],[-1,2],[0,4],[5,11],[1,7],[2,3],[1,-3],[1,-2],[2,-5],[2,-8],[-1,-6]],[[2576,4820],[-1,-8],[-4,4],[1,6],[4,-2]],[[2564,4823],[-4,-2],[0,5],[3,0],[1,-3]],[[2698,4853],[2,-7],[1,-3],[1,-3],[-1,-5],[-2,-2],[-4,-5],[-3,2],[-2,3],[1,6],[1,0],[1,0],[2,1],[0,4],[-1,2],[-1,-1],[-1,0],[-1,1],[1,3],[1,1],[2,3],[1,-2],[2,2]],[[8666,4895],[-3,-4],[-2,1],[-6,6],[0,5],[2,8],[3,5],[6,-5],[0,-2],[2,-6],[-2,-8]],[[3280,4873],[-3,-1],[-1,1],[-6,7],[1,3],[2,3],[1,5],[2,16],[1,3],[4,12],[1,1],[1,0],[2,-3],[1,-3],[0,-8],[-1,-3],[0,-13],[1,-2],[0,-4],[0,-4],[0,-2],[0,-2],[-6,-6]],[[8344,5036],[0,-7],[-1,1],[-4,6],[-5,20],[0,6],[2,4],[3,-3],[3,-10],[2,-9],[0,-8]],[[2625,5074],[-1,-2],[-2,3],[0,5],[1,1],[1,-1],[0,-2],[1,-4]],[[2344,5072],[-1,3],[0,7],[-1,3],[2,1],[2,-4],[0,-4],[-1,-3],[-1,-3]],[[8465,5144],[-2,-2],[-5,1],[-3,0],[-2,3],[0,4],[1,3],[1,3],[7,3],[3,-2],[1,-5],[-1,-8]],[[7744,5173],[-3,-3],[-1,0],[-5,0],[-2,1],[0,2],[4,2],[3,1],[3,-1],[1,-2]],[[8421,5172],[-8,-10],[-2,1],[1,6],[10,18],[2,3],[3,0],[1,-8],[-1,-8],[-6,-2]],[[7725,5187],[-3,-4],[-1,1],[-2,0],[0,4],[2,1],[1,1],[3,1],[2,0],[1,0],[-1,-2],[0,-1],[-2,-1]],[[7714,5191],[0,-3],[0,-2],[-1,1],[-2,0],[-1,1],[0,2],[-1,0],[0,-1],[-1,1],[0,1],[1,2],[2,-1],[2,-1],[1,0]],[[7707,5191],[-3,0],[-3,2],[-2,0],[-1,0],[0,2],[0,1],[1,1],[2,0],[1,1],[5,-3],[0,-3],[0,-1]],[[7661,5215],[5,-3],[3,0],[2,-2],[2,0],[1,-1],[1,-3],[-1,-1],[-1,-2],[-1,2],[-1,-1],[-1,0],[-2,1],[0,-1],[0,-2],[1,-3],[1,-1],[-1,-2],[-1,1],[-1,-1],[-2,0],[-1,1],[-2,1],[-2,3],[-1,3],[-1,1],[-2,0],[0,2],[2,1],[2,-2],[1,-1],[2,2],[1,1],[0,3],[-2,-3],[-4,2],[0,2],[-1,1],[0,-2],[-1,4],[2,0],[3,0]],[[8424,5215],[2,-2],[5,1],[0,-3],[-4,-14],[-2,-2],[-9,-15],[-2,-2],[-2,2],[-1,4],[1,4],[5,7],[2,3],[1,12],[1,5],[3,0]],[[8441,5201],[-5,-2],[-2,1],[-1,4],[3,11],[6,13],[4,4],[3,-3],[-1,-4],[-3,-19],[-4,-5]],[[7807,5234],[2,-3],[1,-4],[2,-3],[-3,2],[-1,1],[-1,2],[-1,3],[-1,0],[-1,2],[0,1],[0,1],[2,-1],[1,-1]],[[7706,5247],[1,-2],[-1,0],[-2,3],[1,1],[1,-2]],[[7709,5248],[2,-3],[1,1],[0,-2],[1,0],[1,0],[2,0],[1,-1],[0,-2],[0,-1],[0,-2],[-1,0],[-1,2],[-3,1],[-2,1],[-1,1],[-1,1],[0,1],[-1,3],[0,2],[2,-2]],[[7699,5256],[-1,-1],[0,1],[1,3],[0,-3]],[[7700,5265],[-2,-4],[0,6],[1,2],[1,-1],[0,-3]],[[7712,5283],[-1,-3],[-5,-1],[-4,-3],[-4,-6],[-2,2],[1,3],[1,0],[1,1],[0,4],[1,1],[1,-1],[1,2],[2,0],[1,3],[1,0],[1,-2],[1,1],[0,1],[0,-2],[1,2],[1,1],[2,-1],[0,-2]],[[8643,5290],[-1,-3],[-2,3],[0,5],[-2,11],[4,3],[0,-7],[1,-4],[0,-8]],[[7742,5320],[1,0],[1,1],[1,-1],[1,1],[0,-1],[1,-1],[0,-2],[0,-2],[-3,3],[-3,0],[-1,-1],[0,3],[2,1],[0,-1]],[[7733,5324],[0,-1],[3,-1],[3,0],[0,-3],[-2,-1],[-2,0],[-2,1],[-1,0],[-3,1],[-1,2],[0,3],[1,0],[1,-1],[0,1],[1,2],[0,-1],[1,-2],[1,0]],[[8988,5377],[2,-2],[3,1],[0,-2],[1,-9],[0,-2],[0,-2],[1,-2],[1,-3],[-1,-2],[-1,-3],[0,-6],[-1,0],[-1,3],[-3,9],[-1,6],[1,0],[0,1],[-2,6],[0,3],[0,3],[0,2],[1,-1]],[[9142,5421],[2,-7],[2,-4],[0,-4],[1,-4],[0,-3],[-11,8],[-2,5],[-5,1],[-3,3],[0,4],[2,1],[7,-1],[3,1],[4,0]],[[7096,5416],[-3,-6],[-1,-1],[-2,2],[-3,0],[-1,-1],[0,-3],[-1,-3],[-2,-5],[-1,1],[-1,4],[0,7],[1,6],[1,5],[5,4],[5,1],[2,0],[2,-3],[-1,-8]],[[6313,5393],[0,-6],[-2,2],[-3,8],[-3,21],[0,11],[2,5],[1,-3],[0,-5],[1,-2],[4,-21],[0,-10]],[[7534,5424],[1,-7],[-4,8],[-1,6],[2,6],[2,2],[1,-8],[-1,-7]],[[8877,5435],[-1,-3],[-1,0],[-1,-2],[-3,4],[1,7],[-1,3],[5,3],[0,-1],[1,-2],[0,-3],[1,-2],[-1,-1],[0,-3]],[[922,5414],[-2,0],[0,2],[4,16],[0,9],[-1,6],[0,1],[4,-3],[3,-6],[0,-2],[1,-5],[-1,-3],[1,-2],[0,-1],[0,-3],[-1,-3],[-5,0],[-3,-6]],[[7533,5445],[-1,-7],[-1,3],[-1,2],[1,10],[2,-8]],[[6343,5452],[-1,-6],[-3,8],[-2,9],[1,13],[2,0],[5,-15],[-2,-9]],[[7247,5521],[-2,-2],[-3,5],[-1,9],[2,15],[6,8],[3,-2],[1,-8],[0,-8],[0,-7],[-2,-4],[-4,-6]],[[7661,5623],[-2,-2],[-3,1],[1,7],[3,5],[3,2],[2,2],[3,0],[0,-2],[-2,-6],[-2,0],[-2,-4],[-1,-3]],[[8962,5756],[-2,-5],[-1,0],[0,4],[-1,1],[0,7],[3,5],[3,2],[2,-1],[0,-3],[-2,-7],[0,-2],[-1,0],[-1,-1]],[[9048,5767],[-1,-5],[-2,2],[-2,8],[-1,14],[-2,4],[1,5],[2,3],[1,0],[3,-7],[1,-9],[-1,-3],[0,-5],[1,-7]],[[6156,5753],[-2,-8],[-1,2],[-5,34],[0,6],[4,12],[4,7],[2,-6],[-2,-47]],[[7468,5815],[1,-2],[1,0],[2,0],[2,-4],[0,-3],[0,-9],[-2,1],[-2,0],[-2,2],[1,2],[0,2],[1,4],[-1,3],[-1,0],[-1,-3],[-1,0],[-1,-1],[-1,-2],[-2,1],[-1,1],[0,-2],[-1,-1],[0,-3],[-1,-1],[-1,7],[1,5],[2,3],[3,2],[3,0],[1,-2]],[[7051,5785],[-2,0],[-1,4],[-3,8],[1,22],[-1,4],[-1,3],[0,4],[1,4],[2,1],[2,-5],[2,-11],[2,-24],[0,-3],[-2,-7]],[[7265,5861],[4,-9],[3,-9],[0,-1],[-3,4],[-1,3],[-4,4],[-2,0],[-2,-4],[-2,-4],[-2,-2],[-2,1],[-1,7],[-1,4],[-1,2],[0,4],[4,6],[5,0],[5,-6]],[[1999,5890],[1,-6],[-1,2],[0,4]],[[2005,5882],[-5,-5],[0,7],[1,3],[-1,4],[7,1],[-2,-10]],[[7849,5863],[1,-1],[0,-2],[-1,-1],[-1,1],[-1,2],[-1,1],[0,-2],[-1,-1],[0,1],[0,3],[0,3],[1,15],[0,4],[1,4],[1,9],[0,6],[4,6],[6,4],[2,-3],[0,-4],[0,-2],[1,-3],[-1,-4],[-1,-3],[-1,-1],[-1,-2],[0,-7],[0,-3],[-3,-1],[-2,-3],[0,-3],[1,-4],[-1,-2],[-1,0],[0,-1],[1,-3],[0,-3],[-3,0]],[[2006,6116],[2,-5],[-2,2],[0,3]],[[1964,6198],[-1,-2],[0,2],[1,0]],[[6000,6209],[-4,-1],[-1,-2],[-2,-5],[-2,2],[-2,3],[-2,2],[-1,0],[-2,2],[1,5],[7,3],[1,2],[4,0],[1,2],[2,0],[1,-1],[2,-8],[0,-2],[-3,-2]],[[1999,6272],[2,-5],[1,0],[2,3],[0,-3],[-1,-13],[-1,-4],[-3,1],[-1,5],[-2,11],[0,3],[2,2],[1,0]],[[1999,6284],[0,-1],[2,2],[3,1],[1,-4],[0,-5],[-1,-3],[-2,-1],[-3,1],[-4,1],[-1,2],[-1,5],[1,4],[1,2],[1,0],[2,-2],[1,-2]],[[1990,6292],[-1,-3],[-2,0],[-1,6],[0,4],[2,4],[1,2],[4,-9],[-2,-2],[-1,-2]],[[2006,6295],[0,-3],[-1,2],[-2,5],[1,5],[2,5],[0,-3],[1,-4],[-1,-7]],[[695,6427],[-4,-9],[-1,10],[1,8],[2,4],[2,-13]],[[2110,6465],[3,-13],[-3,9],[-4,6],[1,5],[3,-7]],[[627,6456],[-1,-5],[-2,0],[-3,4],[-2,2],[-2,6],[-2,1],[2,6],[5,5],[2,0],[1,-3],[2,-16]],[[2144,6464],[1,-8],[-1,4],[-2,4],[-3,5],[-2,6],[0,6],[2,-3],[2,-5],[0,-3],[2,-2],[1,-1],[0,-3]],[[7522,6494],[10,-21],[2,-10],[-1,-7],[0,1],[0,3],[0,4],[0,1],[0,2],[-1,1],[-2,-1],[0,2],[-1,6],[-1,1],[-1,0],[-1,-2],[1,-2],[2,-7],[0,-2],[-1,-1],[0,-2],[0,-2],[-1,-1],[-2,2],[-3,6],[-2,12],[0,13],[2,4]],[[2124,6531],[0,-9],[-2,3],[-3,-2],[-3,1],[-1,3],[0,4],[0,2],[2,-3],[4,4],[0,8],[0,-2],[1,-2],[1,-4],[1,-3]],[[2661,6582],[-3,-6],[-1,-2],[1,-3],[-1,-1],[0,-4],[1,-4],[-1,0],[-2,0],[-2,4],[0,5],[0,3],[0,2],[-1,1],[0,3],[2,1],[0,-1],[4,5],[2,3],[1,0],[1,-3],[-1,-3]],[[2068,6575],[-1,-5],[-2,3],[0,6],[-2,1],[-2,4],[0,4],[0,5],[2,-3],[2,-2],[2,-4],[0,-2],[1,-4],[0,-3]],[[2025,6591],[3,-12],[-1,-13],[0,1],[-1,2],[-1,7],[-3,6],[-1,-3],[-1,4],[-1,3],[0,5],[1,3],[0,4],[-2,6],[1,1],[2,-4],[4,-10]],[[2006,6601],[-3,-2],[-4,7],[4,14],[1,2],[2,-3],[1,-9],[-1,-9]],[[7594,6668],[-5,-4],[-3,1],[-2,7],[-1,8],[-2,5],[-1,1],[-1,2],[0,3],[1,0],[8,-1],[3,-2],[1,-2],[2,-18]],[[2039,6669],[-5,-2],[-2,2],[-3,10],[-1,3],[-1,1],[-1,3],[0,3],[0,5],[4,-2],[6,-12],[2,-6],[1,-3],[0,-2]],[[2024,6690],[-1,-5],[-1,2],[-1,3],[-1,14],[1,4],[1,1],[1,-2],[1,-2],[1,-6],[-1,-9]],[[2050,6744],[3,-11],[-3,3],[-1,6],[1,2]],[[2076,6750],[0,-2],[-2,-1],[-4,2],[0,-9],[0,-5],[0,-7],[1,-4],[0,-5],[0,-2],[0,-1],[-1,0],[-1,5],[0,9],[-1,4],[0,4],[-1,6],[0,8],[0,5],[2,1],[1,-2],[4,-1],[1,-1],[1,-4]],[[1865,6753],[0,-8],[-5,7],[-3,9],[-1,7],[6,-5],[3,-10]],[[2048,6776],[-2,0],[-1,2],[-2,1],[-1,2],[0,3],[3,-1],[3,-7]],[[2055,6778],[0,-3],[-4,9],[-1,3],[1,3],[1,0],[2,-6],[1,-6]],[[3012,6809],[1,-4],[0,-4],[0,-8],[0,-5],[0,-3],[-1,0],[0,5],[-2,3],[0,3],[-1,0],[-1,1],[0,3],[2,3],[1,2],[0,3],[1,1]],[[2020,6789],[0,-4],[-2,15],[-1,6],[0,4],[0,1],[0,3],[1,1],[1,-3],[-1,-5],[1,-2],[0,-2],[0,-3],[0,-5],[1,-6]],[[1870,6798],[-2,-4],[-2,19],[-4,14],[0,4],[2,3],[0,-5],[2,-6],[2,-5],[0,-5],[3,-7],[2,-2],[-1,-6],[-2,0]],[[2007,6822],[0,-4],[0,-1],[-1,4],[-1,-1],[-1,0],[-1,3],[0,5],[0,2],[1,4],[2,-1],[1,-9],[0,-2]],[[2605,6861],[-3,-3],[1,6],[2,-3]],[[1998,6827],[0,-2],[-1,3],[0,3],[-2,20],[1,3],[1,4],[0,6],[1,1],[1,-1],[0,-3],[0,-3],[3,-6],[2,-6],[-1,-4],[-2,-1],[-2,-2],[-1,-5],[0,-7]],[[1890,6868],[0,-4],[0,-2],[-3,1],[-1,1],[0,2],[-1,0],[-1,1],[0,5],[0,5],[-1,2],[1,3],[0,-1],[2,0],[2,-4],[2,-2],[1,-2],[-1,-5]],[[1975,6869],[-1,-7],[0,4],[0,9],[-1,7],[0,2],[1,3],[1,-1],[0,-4],[2,-4],[1,-2],[0,-2],[-1,-2],[-2,-3]],[[2026,6902],[1,-5],[0,-1],[-2,1],[-1,1],[0,-2],[-1,1],[0,4],[0,2],[0,2],[0,1],[1,3],[1,1],[1,-4],[0,-4]],[[2020,6914],[0,-3],[0,-3],[1,-1],[0,-2],[-1,-2],[0,1],[-2,-1],[-2,2],[-1,6],[0,2],[2,-1],[2,2],[1,0]],[[1901,6937],[-1,-4],[-2,-3],[-1,-3],[0,-5],[2,-9],[-1,-2],[-1,2],[-3,0],[-5,11],[-1,5],[0,6],[0,2],[2,-1],[3,0],[5,4],[1,1],[2,-1],[0,-3]],[[1885,6926],[-2,5],[-1,2],[0,2],[-2,8],[1,1],[4,-4],[2,-6],[-1,-3],[0,-2],[-1,-3]],[[2097,6944],[-2,-6],[0,-2],[-1,-2],[0,-2],[-1,-2],[0,-2],[-1,-2],[-1,-4],[-1,-4],[0,-1],[0,-2],[-1,1],[-1,1],[-1,0],[-1,2],[-1,3],[1,2],[2,3],[0,5],[0,3],[1,4],[1,3],[1,1],[1,1],[1,-1],[2,1],[1,4],[2,1],[-1,-5]],[[2110,6945],[-1,-4],[-2,3],[-1,8],[1,3],[3,-4],[0,-6]],[[2030,6950],[3,-5],[-1,-4],[-2,6],[-4,3],[-2,-2],[-2,2],[-1,4],[3,1],[2,-1],[3,-2],[1,-2]],[[2118,6949],[-1,-1],[-6,5],[-3,3],[-3,3],[0,4],[1,6],[2,3],[7,-2],[3,-3],[1,-7],[0,-7],[-1,-4]],[[1856,6959],[0,-9],[-3,9],[0,9],[1,3],[1,2],[1,1],[1,-4],[1,-7],[-1,-2],[-1,-2]],[[2984,6945],[0,-7],[-4,7],[0,5],[-1,7],[-1,5],[0,7],[-1,5],[2,6],[1,-13],[1,-10],[1,-3],[1,-1],[1,-8]],[[507,6988],[-1,-7],[-5,9],[0,7],[4,1],[1,-7],[1,-3]],[[2035,6988],[-2,-2],[1,15],[0,5],[1,0],[0,-6],[0,-5],[0,-7]],[[2061,7019],[-1,-2],[-2,0],[-1,-3],[-1,-3],[-2,3],[-3,3],[-1,2],[-2,-2],[-1,3],[1,4],[3,2],[2,1],[1,1],[2,-2],[1,-2],[4,-5]],[[2103,7004],[-1,0],[-1,2],[-1,2],[0,4],[0,6],[1,7],[2,5],[2,1],[2,-2],[0,-2],[-1,-4],[0,-17],[-1,-1],[-1,0],[-1,-1]],[[2093,7035],[1,-4],[2,0],[1,0],[2,-3],[-1,-4],[-5,-11],[-2,-2],[-1,2],[0,2],[0,5],[0,8],[1,5],[1,2],[1,0]],[[1964,7030],[-1,0],[0,1],[0,5],[0,1],[2,2],[0,6],[1,2],[1,1],[1,-1],[-1,-6],[0,-3],[-1,-4],[-1,-1],[-1,-3]],[[1988,7078],[3,-1],[2,1],[-1,-6],[6,-7],[1,-2],[-1,-1],[-1,0],[-1,-1],[-1,-1],[-1,0],[-1,0],[-2,-2],[0,-2],[-1,-1],[-2,1],[0,5],[0,2],[-1,2],[0,3],[1,2],[-1,3],[0,3],[0,3],[1,-1]],[[1971,7050],[-2,-3],[-1,5],[-1,1],[-1,0],[-1,2],[1,20],[1,5],[1,-1],[0,-3],[3,-4],[1,-4],[1,-6],[-2,-12]],[[2703,7080],[1,-1],[2,1],[1,2],[1,0],[1,-2],[0,-3],[2,-10],[0,-2],[-1,0],[-1,-2],[0,-10],[-2,-2],[-1,1],[-2,2],[-1,4],[0,4],[0,3],[-2,2],[-1,4],[0,11],[1,0],[1,-1],[1,-1]],[[2013,7082],[-1,-3],[-2,1],[-2,-1],[-1,3],[-1,0],[0,5],[1,2],[3,4],[2,-2],[1,-4],[0,-5]],[[1994,7095],[-2,-5],[-1,2],[-1,-1],[-1,2],[0,9],[1,4],[3,0],[1,2],[0,5],[2,-3],[0,-5],[0,-2],[-2,-5],[0,-3]],[[1907,7126],[2,-3],[1,2],[1,-2],[1,-9],[0,-7],[-1,-3],[1,-20],[1,-4],[0,-4],[0,-3],[-1,3],[-1,2],[-2,2],[-2,5],[0,5],[-1,11],[0,3],[-2,-1],[-1,-2],[-1,2],[1,6],[0,5],[3,8],[0,4],[1,0]],[[1994,7113],[-1,-4],[-2,4],[-1,8],[1,7],[0,4],[3,3],[2,1],[-1,-4],[2,-7],[-1,-6],[-1,-2],[-1,-4]],[[1913,7156],[1,-2],[1,0],[1,-3],[-2,-5],[-2,2],[-1,5],[1,8],[1,-5]],[[2697,7154],[-4,-3],[0,9],[2,4],[0,2],[2,-4],[0,-8]],[[1805,7176],[-1,-9],[-3,1],[1,3],[0,4],[0,4],[0,1],[1,3],[1,-1],[1,-2],[0,-4]],[[1932,7181],[-1,-1],[-2,1],[1,5],[1,0],[0,3],[1,-8]],[[1927,7190],[-1,-3],[0,4],[1,-1]],[[1826,7176],[-3,0],[-3,12],[3,6],[1,-5],[2,-5],[0,-8]],[[6474,7505],[-1,-2],[-3,1],[-3,4],[-2,7],[-1,7],[4,3],[1,4],[1,7],[1,-2],[1,-8],[1,-5],[1,-3],[0,-10],[0,-3]],[[3066,7729],[-1,-5],[-2,7],[1,4],[0,-3],[2,-1],[0,-2]],[[358,7789],[-5,-10],[-4,9],[-1,13],[6,-4],[1,-6],[3,-2]],[[1233,7795],[0,-8],[-11,23],[-1,5],[-1,5],[3,3],[2,-1],[4,-7],[1,-3],[3,-17]],[[1310,7870],[-4,-2],[-4,1],[-4,-2],[-1,8],[4,1],[4,2],[5,-1],[2,-1],[-2,-6]],[[3033,7975],[0,-2],[-2,2],[-1,2],[0,3],[-1,2],[1,3],[4,1],[0,-3],[-1,-5],[0,-3]],[[2950,8082],[-1,-4],[-1,1],[0,7],[1,8],[0,2],[0,2],[1,1],[2,2],[-2,-13],[0,-6]],[[2255,8129],[0,-1],[-1,2],[1,-1]],[[3021,8120],[-2,-1],[-1,1],[2,6],[2,4],[1,4],[1,2],[2,8],[1,1],[0,-3],[1,-4],[-1,-3],[-2,-6],[-2,-6],[-2,-3]],[[3015,8298],[-5,-8],[0,2],[1,1],[0,5],[-1,6],[-1,4],[-1,4],[1,5],[2,-1],[1,-2],[2,-2],[1,-2],[0,-1],[0,-2],[-1,-3],[1,-6]],[[2387,8301],[-2,-9],[-1,3],[0,4],[-1,-1],[-1,-1],[0,5],[1,7],[0,2],[0,3],[0,5],[0,3],[1,6],[3,4],[0,-5],[0,-8],[-1,-4],[2,-6],[-1,-1],[-1,-5],[1,-2]],[[2318,8341],[0,-4],[-3,2],[0,-2],[0,-3],[-2,4],[-1,4],[0,1],[0,1],[0,4],[0,4],[2,1],[2,-3],[2,-9]],[[2484,8366],[0,-7],[-1,1],[-2,2],[-2,-2],[-1,1],[-1,1],[1,5],[2,7],[1,-2],[2,-1],[1,-5]],[[2440,8477],[-3,-18],[-2,0],[-1,5],[0,7],[0,2],[-1,-1],[0,-3],[0,-12],[-1,-4],[-1,6],[-2,4],[-2,11],[1,6],[5,8],[1,5],[-1,10],[2,5],[3,4],[1,-2],[-1,-3],[0,-5],[0,-9],[1,-6],[2,0],[-1,-10]],[[2836,8622],[0,-7],[-2,3],[0,7],[0,4],[1,3],[1,-2],[0,-8]],[[2850,8638],[-3,-4],[-2,0],[-2,-3],[-2,-1],[0,6],[1,5],[1,4],[1,1],[2,12],[2,0],[3,-3],[1,-8],[-2,-9]],[[2843,8659],[-2,-1],[-2,1],[-1,-2],[-1,2],[-1,10],[2,8],[3,-1],[2,-6],[1,-6],[0,-4],[-1,-1]],[[2834,8743],[-1,-9],[-1,0],[1,5],[-1,4],[0,-1],[-2,0],[-2,3],[1,6],[-1,4],[0,4],[-1,0],[-2,2],[-1,0],[0,4],[2,1],[3,-1],[2,-4],[1,-4],[1,-6],[0,-3],[1,-2],[0,-3]],[[2807,8806],[-1,-2],[-1,1],[-2,6],[0,6],[1,5],[1,-2],[3,-1],[1,-6],[-2,-7]],[[2796,8949],[-2,-6],[-1,-1],[0,2],[-1,-3],[-1,2],[1,2],[0,2],[0,1],[0,4],[0,4],[2,8],[1,4],[1,-1],[1,-3],[0,-2],[-2,-7],[1,-6]],[[2869,9021],[-2,-8],[-1,4],[2,5],[0,4],[1,3],[1,3],[0,-5],[-1,-6]],[[6618,9257],[-1,-3],[0,1],[0,8],[1,2],[1,-7],[-1,-1]],[[6618,9272],[0,-5],[-1,1],[0,3],[1,1]],[[6630,9311],[-1,-2],[-1,-2],[-1,-4],[-1,3],[1,5],[1,0],[1,2],[1,-2]],[[463,7741],[2,-10],[0,-10],[-1,-3],[-5,-8],[-1,-3],[1,-7],[-2,-4],[-2,0],[-8,42],[2,0],[2,6],[1,5],[2,4],[4,1],[3,-4],[2,-9]],[[355,7731],[-5,-2],[-3,5],[0,16],[1,7],[1,5],[2,1],[4,-1],[3,-3],[2,-5],[1,-7],[-1,-8],[-5,-8]],[[474,7810],[4,0],[2,4],[3,5],[3,4],[4,1],[3,-2],[2,-4],[-1,-8],[5,-14],[3,-4],[1,-5],[1,-13],[1,-12],[2,-13],[0,-13],[0,-15],[-1,-5],[-1,-4],[-1,-4],[-2,-3],[0,11],[0,5],[-3,0],[-2,7],[-2,11],[-2,9],[-10,26],[-1,6],[-5,11],[-22,22],[1,4],[4,3],[9,5],[1,0],[1,-2],[1,-2],[2,-11]],[[196,8223],[-1,-20],[-4,10],[-2,-3],[0,-23],[8,9],[2,-10],[8,-10],[4,-22],[4,-8],[6,-5],[13,-6],[4,-5],[4,-9],[1,-11],[-6,-24],[0,-12],[4,7],[2,-1],[2,-4],[2,-2],[2,-4],[1,0],[1,4],[-1,4],[-3,5],[-1,5],[3,1],[19,-47],[3,-5],[7,-10],[3,-2],[4,-3],[3,-9],[5,-18],[1,-7],[1,-12],[1,-9],[4,-2],[1,4],[0,9],[0,19],[3,-9],[2,-2],[1,3],[4,-12],[5,-31],[3,-14],[-1,-10],[1,-11],[0,-9],[-4,-2],[1,0],[-8,-7],[-2,-3],[-2,0],[-9,14],[-4,-7],[-3,0],[-3,5],[-3,6],[1,3],[2,6],[1,3],[-5,6],[-4,19],[-10,7],[-38,77],[-5,8],[-5,5],[-2,0],[-5,0],[-1,1],[-2,6],[-2,1],[-1,-4],[0,-3],[-1,-1],[-2,-2],[-1,-1],[-2,0],[-4,9],[-5,3],[-2,3],[-1,5],[0,5],[0,5],[-3,5],[-16,0],[-1,3],[1,8],[1,14],[-1,4],[-7,12],[1,9],[-3,6],[-3,5],[0,6],[1,6],[-2,1],[-4,-1],[-3,0],[-1,8],[0,12],[1,12],[4,5],[11,0],[3,3],[0,5],[-1,4],[-1,2],[-1,2],[0,6],[1,10],[0,6],[3,12],[0,4],[1,6],[3,-3],[2,-6],[0,-3],[16,-2],[6,-7]],[[708,9040],[-1,0],[-16,4],[-2,-1],[-7,-4],[-2,-3],[-3,-9],[-2,-5],[-3,-1],[-6,-1],[-2,-2],[-1,-6],[3,-11],[0,-5],[0,-7],[-3,-6],[-1,-6],[-2,-27],[-3,-19],[-2,-25],[0,-6],[-1,-12],[-2,-10],[-1,-10],[-1,-10],[-3,-10],[-7,-13],[-2,-7],[-1,-6],[-1,-6],[-1,-5],[-2,-1],[-2,1],[-5,8],[-1,-17],[1,-12],[0,-5],[1,-5],[-4,-15],[-17,-39],[-2,-4],[-1,-3],[-2,-5],[0,-7],[2,-8],[5,-24],[3,-13],[3,-33],[2,-8],[2,-6],[2,-2],[2,-3],[1,-5],[1,-7],[1,-12],[2,-8],[3,-10],[1,-4],[-1,-6],[-1,-10],[0,-6],[1,-8],[1,-9],[2,-7],[2,-7],[8,-15],[2,-4],[3,-18],[-4,-18],[-5,-9],[-14,-10],[-3,-3],[-2,-4],[2,-7],[3,-8],[2,-5],[1,-5],[1,-7],[1,-11],[1,-6],[5,-20],[1,-7],[0,-7],[-1,-18],[-2,-3],[-2,-1],[-3,2],[-2,0],[0,-2],[0,-4],[1,-9],[3,-47],[-1,-24],[0,-8],[1,-4],[2,-4],[3,-4],[5,-2],[2,-3],[6,-24],[2,-6],[3,-4],[4,-3],[2,-5],[2,-7],[1,-8],[-2,-6],[-1,-6],[0,-10],[0,-11],[2,-18],[3,-12],[0,-4],[0,-5],[-2,-6],[-5,-8],[0,-4],[0,-11],[0,-5],[-2,-11],[-1,-7],[0,-7],[2,-29],[5,-41],[1,-8],[2,-3],[2,-1],[2,-2],[2,-6],[1,-13],[4,-21],[2,-24],[-1,-10],[-5,-71],[0,-1]],[[672,7798],[-3,5],[-23,28],[-6,17],[-5,-2],[-11,-11],[-3,-2],[-4,2],[-4,8],[-3,-3],[-2,3],[-1,5],[-2,3],[-2,0],[-3,-3],[-3,-1],[-3,6],[-8,39],[-7,17],[-2,10],[-2,11],[1,69],[-4,83],[-7,107],[-2,10],[-2,4],[-3,2],[-9,7],[-11,15],[-5,4],[-5,1],[-4,4],[-4,9],[-15,52],[-4,18],[-3,18],[-4,51],[-3,21],[-6,14],[-8,2],[-5,3],[-2,5],[-2,8],[-32,150],[-4,14],[-17,35],[-4,17],[-2,19],[-2,10],[-2,4],[-2,1],[-5,9],[-1,4],[-2,2],[-2,2],[-2,2],[-7,12],[-4,3],[-43,-1],[-9,5],[-9,14],[-11,27],[-32,119],[-15,40],[-1,4],[-1,9],[-1,3],[-2,3],[-3,4],[-2,3],[-1,2],[-3,1],[-3,-1],[-1,-2],[-1,-1],[-2,7],[-11,34],[-3,5],[-5,2],[-4,5],[-23,70],[-20,52],[-1,8],[-11,23],[-7,28],[-15,28],[-9,29],[-3,4],[-5,0],[-3,1],[-1,5],[1,4],[2,5],[0,4],[0,4],[-1,1],[-2,-1],[-1,1],[-6,13],[-3,9],[-5,29],[-5,16],[-2,5],[-4,8],[-1,4],[-2,6],[0,3],[0,3],[-1,6],[-1,9],[-2,14],[-2,14],[-3,14],[-1,15],[-7,46],[-2,9],[-3,10],[-3,10],[-1,10],[-2,8],[-4,3],[4,17],[1,13],[-2,11],[-4,12],[-4,7],[-2,4],[0,7],[-1,8],[-1,9],[-1,7],[-3,3],[-4,3],[1,9],[4,11],[2,11],[0,8],[3,12],[1,10],[0,9],[0,8],[-4,15],[3,6],[-2,8],[-3,9],[0,10],[-4,16],[-2,8],[4,16],[2,4],[3,-4],[3,3],[2,-1],[2,-2],[2,0],[2,3],[4,8],[2,3],[4,9],[2,2],[3,1],[3,2],[9,17],[4,3],[4,-3],[6,-15],[4,-7],[2,-4],[1,-2],[3,4],[2,8],[10,5],[7,-3],[33,-29],[17,-29],[3,-3],[4,-2],[3,-4],[2,-11],[2,-26],[6,-21],[27,-60],[7,-10],[8,-9],[36,-13],[3,-3],[9,-13],[4,-4],[9,-5],[5,1],[4,6],[4,4],[5,-4],[4,-6],[4,-4],[9,-2],[18,5],[8,5],[22,20],[9,13],[4,-3],[10,-8],[3,0],[4,4],[11,3],[12,-14],[9,-7],[8,-15],[9,-9],[3,-14],[3,-8],[4,-3],[7,-6],[9,6],[49,57],[7,-6],[30,-100],[36,-79],[9,-12],[5,-8],[3,-9],[10,-49],[2,-11],[2,-49],[2,-16],[5,-27],[1,-6],[-1,-15],[-2,-16],[-1,-10],[1,-4],[7,4],[2,-1],[2,-8],[2,9],[1,1],[3,-5],[1,-4],[1,-2],[1,-2],[1,0],[3,3],[2,0],[5,-2],[5,-8],[3,-10],[2,-12],[2,0],[0,3],[2,3],[1,2],[2,-8],[5,-16],[3,-8],[3,-7],[2,-4],[0,-6],[1,-30],[-3,-42],[0,-3]],[[36,9832],[3,-11],[-2,0],[-2,-1],[-2,-3],[-2,-4],[-2,5],[-3,1],[-2,1],[-2,3],[-1,6],[2,5],[2,5],[2,4],[1,11],[3,-5],[5,-17]],[[15,9899],[4,-12],[5,-9],[-2,4],[3,-6],[1,-6],[0,-7],[-2,-6],[-6,8],[-8,-16],[0,7],[0,4],[0,5],[-2,2],[0,2],[0,2],[2,4],[0,4],[-2,3],[0,4],[2,3],[0,5],[-2,2],[-2,0],[-2,-1],[-2,-1],[-2,2],[0,5],[2,6],[3,3],[5,-1],[5,-10]],[[57,9975],[2,-7],[3,1],[2,8],[2,9],[2,6],[4,-1],[2,-6],[7,-26],[0,-21],[-2,0],[-1,4],[-1,3],[-2,5],[0,-19],[-2,-7],[-2,-2],[-4,1],[-4,2],[-3,6],[-3,7],[-2,8],[-1,11],[-2,9],[-4,9],[-3,10],[-1,10],[0,4],[5,-1],[2,-2],[3,-5],[3,-16]],[[5129,7868],[7,-12],[2,-9],[0,-6],[-3,5],[-7,13],[-2,2],[0,-1],[1,-4],[1,-5],[3,-20],[5,-18],[4,-9],[3,-5],[0,-4],[-5,3],[-5,8],[-4,12],[-3,9],[-2,11],[-2,18],[0,15],[4,4],[3,-7]],[[4898,8459],[0,-9],[-2,-1],[-1,1],[-2,1],[-7,1],[-2,-1],[-2,-2],[-3,-5],[-2,-1],[-3,6],[-1,9],[2,11],[2,8],[4,5],[4,0],[4,-2],[4,-5],[3,-5],[2,-4],[0,-7]],[[4927,8429],[-3,-5],[-2,1],[-1,12],[-2,9],[-12,17],[-3,11],[-3,14],[-2,15],[0,14],[2,15],[5,5],[13,0],[3,-1],[4,-1],[3,-4],[2,-7],[1,-10],[-1,-13],[-1,-12],[-2,-16],[0,-34],[-1,-10]],[[4978,8555],[-1,-7],[-3,2],[-11,20],[-2,11],[-7,16],[-2,11],[2,14],[4,6],[5,-2],[4,-8],[4,-9],[3,-12],[2,-12],[1,-13],[1,-6],[0,-11]],[[4893,8575],[2,-4],[1,-5],[0,-6],[-5,-12],[-9,5],[-18,19],[-18,0],[-4,2],[-4,4],[-3,5],[-2,6],[-2,6],[-1,7],[0,7],[2,7],[2,4],[2,5],[3,3],[2,1],[3,-3],[4,-7],[2,-2],[19,-4],[3,-6],[6,-19],[3,-4],[2,-1],[5,-5],[5,-3]],[[4950,8795],[4,-4],[5,-7],[4,-8],[4,-8],[2,-9],[-2,-8],[-3,-1],[-4,4],[-6,9],[-4,7],[-5,15],[-3,6],[1,0],[4,4],[2,0],[1,0]],[[4937,8862],[-9,-3],[-10,20],[-6,28],[4,27],[8,19],[3,5],[3,-5],[5,-18],[9,-13],[2,-5],[1,-17],[-3,-15],[-7,-23]],[[4936,8966],[8,-4],[9,0],[15,0],[12,0],[1,-7],[2,-26],[3,-24],[-7,-14],[-3,-3],[-3,0],[-8,5],[-4,17],[-12,19],[-5,19],[-8,18]],[[4690,5107],[-1,0],[-22,21],[-17,8],[-50,9],[-7,3],[-18,3],[-5,3],[-6,7],[-2,0],[-2,-3],[-4,-11],[-3,-4],[-4,-4],[-2,-5],[-1,-7],[-1,-5],[-2,-4],[-5,-4],[-2,2],[-1,3],[-1,9],[-1,4],[0,5],[-2,34],[-6,42],[0,13],[1,42],[2,26],[-1,6],[-3,4],[-7,2],[-3,5],[-3,10],[-2,17],[-1,11],[0,10],[1,7],[1,11],[-1,72],[-9,61],[-1,14],[-1,13],[-1,7],[-4,10],[-2,8],[-1,10],[-1,19],[-1,7],[-3,4],[-3,2],[-10,3],[8,30],[5,14],[2,5],[3,3],[5,2]],[[4495,5661],[4,-2],[3,-1],[3,3],[3,9],[3,14],[11,55],[2,13],[0,30],[2,8],[-3,72],[-4,-3],[-3,-4],[-3,-5],[-1,-1],[-2,1],[-1,1],[-2,4],[-1,6],[-2,9],[-5,12],[-1,5],[-2,11],[-2,7],[-4,11],[-2,6],[-3,4],[-2,1],[-2,1],[-1,1],[-7,9],[-8,5],[-2,3],[-2,4],[-11,24],[-2,6],[0,9],[0,7],[0,9],[-1,10],[-7,24],[-2,8],[-5,70],[0,23],[-1,11],[-1,9],[-11,42],[-4,22],[-3,21],[-1,13],[-1,30],[-1,9],[-2,23],[-1,10],[1,44],[2,21],[1,10],[6,28],[1,6],[1,7],[2,41],[1,11],[2,8],[0,2],[-1,2],[-1,3],[-1,1],[-7,4],[-6,5],[-2,0],[-4,-3],[-5,-1],[-3,0],[-5,-12],[-18,-54],[-2,-10],[-1,-4],[-1,-4],[-2,-4],[-7,-8],[-2,-3],[-7,-21],[-2,-1],[-2,0],[-2,8],[0,7],[0,8],[0,7],[0,5],[-1,4],[-1,4],[0,6],[0,6],[1,11],[3,30],[7,44],[0,7],[0,7],[-1,8],[-1,8],[-2,14],[-5,21],[-1,5],[0,6],[0,15],[0,9],[-1,6],[-2,13],[-1,8],[0,7],[0,17],[0,10],[3,21],[12,68],[2,5],[6,12],[2,7],[1,7],[1,9],[0,6],[-1,6],[-2,7],[-1,8],[-1,26],[0,5],[-3,7],[-1,5],[-1,7],[-1,5],[-2,5],[-2,3],[-2,2],[-1,2],[-1,3],[-2,10],[-1,4],[-3,2],[-4,1],[-12,-2],[-2,-1],[0,-1],[-1,-4],[-2,-9],[-2,-3],[-5,-5],[-11,-5],[-11,-10],[-6,-11],[-5,-12],[-4,-7],[-62,-20],[-4,2],[-4,3],[-16,8],[-4,3],[-3,4],[-6,11],[-2,3],[-4,3],[-10,1],[-9,-2],[-9,0],[-4,-1],[-4,-6],[-2,-4],[-3,-9],[-2,-4],[-3,-3],[-9,-2],[-4,-2],[-9,-11],[-3,-2],[-11,-4],[-6,-6]],[[4082,6834],[2,20],[2,7],[2,10],[3,4],[5,6],[2,5],[5,20],[7,23],[3,11],[1,15],[0,12],[1,11],[1,11],[2,12],[1,13],[0,10],[-1,7],[-2,6],[-2,3],[-2,0],[-3,-1],[-4,-5],[-2,0],[-2,1],[0,3],[-1,4],[0,6],[1,13],[0,7],[0,7],[0,7],[1,6],[4,9],[3,5],[10,14],[7,14],[2,4],[4,4],[2,4],[21,49],[2,4],[5,6],[6,14],[2,4],[2,3],[2,7],[1,9],[1,12],[0,10],[-1,10],[-3,11],[0,10],[0,8],[3,48],[1,8]],[[4176,7355],[32,37],[4,3],[5,-2],[5,-6],[17,-34],[5,-4],[5,4],[4,9],[1,11],[0,13],[-1,12],[0,15],[2,10],[8,16],[3,11],[6,25],[4,31],[2,41],[0,18],[-1,8],[0,4],[-1,4],[1,6],[1,6],[2,5],[3,5],[2,2],[11,4],[13,13],[2,7],[1,11],[-1,13],[0,10],[1,10],[2,12],[0,8],[0,9],[-1,7],[-2,4],[-5,-1],[-3,-5],[-3,1],[-2,13],[0,5],[0,20],[-1,6],[-2,9],[-1,6],[0,11],[2,32],[4,23],[6,10],[17,7],[6,5],[1,7],[0,9],[0,12],[1,13],[3,4],[8,-2],[4,8],[10,21],[3,5],[4,5],[8,25],[4,8],[10,3],[5,4],[3,11],[-1,11],[-2,14],[-4,13],[-3,10],[-2,4],[-3,3],[-2,3],[-3,0],[-2,-2],[-5,-6],[-3,0],[-3,9],[1,12],[2,13],[1,12],[-1,6],[-2,12],[-1,5],[2,8],[2,2],[2,1],[2,5],[3,14],[-2,12],[-5,20],[-1,8],[0,2],[2,3],[3,6],[1,7],[1,6],[1,6],[1,7],[3,13],[3,9],[13,23],[2,8],[4,21],[4,15],[3,-3],[5,-22],[6,-8],[7,3],[14,17],[9,2],[4,4],[2,12],[0,25],[2,11],[7,27],[0,5],[-3,3],[-4,11],[0,10],[8,89],[4,28],[4,13],[2,-1],[2,-3],[2,-1],[2,2],[2,6],[0,6],[-2,12],[-4,18],[0,7],[-1,6],[1,12],[0,6],[-6,36],[-1,14],[0,24],[2,23],[8,69],[0,19],[-3,9],[-5,7],[-3,8],[0,14],[2,4],[7,11],[2,7],[5,23],[2,25],[3,53],[1,10],[2,14],[2,5],[4,3],[1,4],[2,6],[9,23],[2,-2],[1,-5],[3,-3],[3,2],[1,6],[1,8],[8,19],[1,18],[0,19],[2,19],[3,8],[2,1],[2,-5],[1,-10],[2,-8],[4,-3],[10,-2],[5,-5],[3,-4],[1,-4],[1,-10],[1,-10],[2,-7],[4,-3],[3,4],[10,28],[4,6],[2,6],[2,7],[2,13],[2,-4],[2,-1],[5,-1],[10,-7],[3,-1],[6,5],[7,8],[5,3],[6,-15],[1,0],[2,0],[1,-1],[1,-3],[1,-8],[6,-25],[2,-3],[2,-1],[2,2],[6,15],[2,0],[2,-3],[4,3],[2,5],[-1,3],[-1,5],[0,6],[2,8],[5,13],[1,7],[2,-1],[10,-37],[3,-1],[5,8],[6,-6],[4,0],[4,4],[7,15],[4,-1],[8,-15],[8,-5],[18,8],[9,0],[12,-9],[40,3],[2,3],[3,8],[3,2],[3,-1],[2,-5],[1,-5],[2,-6],[8,-16],[18,-24],[12,-35],[5,-9],[6,-4],[7,-3],[4,-1],[6,1],[3,-3],[2,-5],[-2,-5],[-6,-14],[-2,-3],[-3,1],[-29,27],[0,-3],[1,-6],[1,-3],[1,-4],[2,-2],[2,-2],[1,-7],[-1,-2],[-2,-7],[0,-6],[3,-3],[5,-1],[4,-2],[3,-5],[2,-8],[-1,-8],[0,-6],[2,-2],[2,2],[3,4],[2,2],[2,-2],[21,-55],[3,-6],[7,-4],[4,-4],[2,-7],[0,-7],[-4,-7],[-4,-1],[-5,3],[-8,15],[-5,4],[-10,2],[0,-4],[6,-2],[6,-7],[5,-11],[5,-10],[3,-4],[3,2],[3,3],[3,1],[2,-2],[6,-11],[2,-6],[11,-30],[1,-7],[0,-5],[-1,-3],[-4,-1],[-12,4],[3,-9],[4,-7],[9,-9],[9,-4],[2,-5],[0,-11],[-2,-5],[-7,-10],[-2,-5],[-3,-15],[-3,-4],[-21,-6],[-5,3],[-9,11],[-4,3],[-5,5],[-3,12],[-2,14],[-3,16],[-1,7],[0,13],[-1,4],[-3,4],[-4,6],[2,-13],[1,-3],[2,-35],[2,-8],[3,-11],[2,-14],[0,-15],[-3,-11],[-3,1],[-10,12],[-4,3],[-28,0],[-18,8],[-28,-1],[-8,-8],[-5,-22],[5,8],[6,5],[7,2],[12,0],[6,-2],[4,-8],[-2,-16],[-1,-13],[2,-15],[4,-14],[3,-9],[2,-2],[8,-6],[3,-4],[2,-5],[3,-15],[4,6],[6,1],[7,-2],[5,-5],[2,-1],[1,1],[1,-1],[1,-5],[0,-16],[-1,-8],[-1,-7],[-1,-5],[-3,-2],[-2,-3],[-2,-6],[-2,-12],[-2,-4],[-2,-4],[-2,-4],[0,-6],[-1,-24],[-1,-6],[-3,-9],[-2,1],[-5,12],[-7,7],[-1,1],[-2,-2],[0,-4],[0,-6],[1,-6],[2,-7],[16,-24],[4,-3],[4,-1],[9,0],[5,-3],[1,-6],[-1,-9],[0,-10],[6,-16],[8,-2],[10,2],[9,-5],[2,-4],[1,-4],[1,-4],[1,-6],[1,-6],[-1,-6],[-2,-4],[-2,-2],[-2,-4],[-6,-19],[-2,-6],[3,-2],[5,1],[4,3],[4,5],[4,2],[4,-7],[3,-9],[-1,-5],[-4,-2],[-8,-10],[-4,-3],[-15,-5],[0,-4],[5,0],[16,-8],[21,-4],[-2,-9],[-5,-4],[-5,-4],[-3,-5],[-9,-16],[-1,-7],[3,-8],[9,-8],[8,-3],[9,-5],[7,-16],[1,-9],[1,-11],[1,-40],[2,-11],[2,-10],[2,-8],[9,-20],[3,-13],[21,-50],[2,-6],[2,-13],[2,-6],[4,-25],[3,-11],[1,10],[4,-8],[4,-18],[3,-19],[1,-16],[-2,-9],[-7,-25],[-3,-7],[-15,-10],[-4,-5],[-3,-12],[-1,-11],[-1,-12],[-4,-10],[0,-8],[-7,1],[-12,7],[4,-11],[8,-12],[4,-11],[-9,-7],[-7,-1],[-8,1],[-8,5],[-3,-1],[2,-8],[3,-3],[9,-3],[3,-2],[3,-7],[3,-8],[2,-5],[3,4],[1,0],[0,-25],[0,-14],[-2,-6],[-2,-3],[1,-7],[1,-7],[1,-3],[3,1],[0,1],[1,-1],[1,-5],[3,-9],[1,-13],[3,-10],[5,-4],[4,-2],[3,-5],[3,-5],[4,-5],[5,1],[3,-1],[1,-6],[-1,-7],[0,-6],[0,-5],[1,-6],[16,-46],[13,-14],[19,-41],[8,-12],[9,-5],[4,-6],[5,-16],[5,-3],[2,-3],[-1,-8],[-4,-6],[-1,-5],[2,-5],[2,-3],[5,0],[2,-3],[1,-4],[0,-15],[1,-5],[1,0],[3,4],[4,-3],[7,-13],[2,-2],[10,-2],[7,-10],[13,-42],[9,-9],[3,-6],[6,-15],[4,-16],[2,-12],[-1,-3],[-1,-1],[-2,-1],[0,-5],[7,-9],[3,-6],[3,-12],[7,-36],[3,-1],[2,0],[2,1],[1,3],[3,7],[2,2],[4,-1],[11,-11],[3,-6],[1,-6],[0,-7],[-1,-7],[0,-6],[0,-3],[1,-3],[2,-3],[0,-8],[-2,-8],[-7,-15],[-3,-14],[-4,-6],[-16,-20],[-3,-7],[-2,-16],[-3,-7],[-4,-5],[-3,-3],[-2,0],[-3,1],[-2,2],[-5,7],[-5,4],[-3,4],[-4,7],[-5,0],[-5,-4],[-13,-16],[-1,-3],[-2,-2],[-3,2],[-2,4],[-2,2],[-5,2],[-8,10],[-10,1],[-2,-2],[-2,-9],[-2,-4],[-2,-4],[-2,-2],[-4,3],[-2,8],[-2,9],[-3,8],[-4,4],[-28,10],[-12,10],[-7,9],[-6,12],[-6,16],[-3,17],[-5,40],[-4,16],[-3,6],[-8,11],[-2,5],[-1,5],[-2,0],[-3,-3],[-2,-3],[0,-6],[0,-5],[2,-10],[7,-24],[1,-4],[8,-28],[1,-10],[1,-24],[2,-9],[1,-3],[1,-7],[1,-1],[2,-3],[0,-1],[2,-8],[1,-8],[1,-9],[0,-13],[0,-13],[-3,-5],[-3,-1],[-3,-1],[-2,2],[-2,4],[-3,11],[-1,5],[-2,4],[-2,2],[-2,2],[-3,1],[-3,-2],[-1,-2],[-2,-3],[-1,-2],[-7,0],[-5,-3],[-3,-5],[-5,-11],[-10,-31],[-3,-15],[-1,-37],[-2,-9],[-5,-12],[-1,-6],[-1,-6],[-1,-13],[-1,-6],[-12,-37],[-2,-14],[1,-5],[2,-15],[0,-6],[-1,-6],[-3,-4],[-2,-3],[-3,-3],[-3,-11],[-4,-23],[-7,-35],[-1,-6],[0,-3],[1,-3],[1,-4],[1,-13],[-1,-9],[-2,-9],[-5,-13],[-2,-6],[-1,-7],[1,-8],[1,-1],[2,-1],[3,-1],[2,-5],[-3,-4],[-5,-5],[-2,-3],[-1,-6],[0,-4],[1,-4],[0,-6],[0,-7],[0,-3],[0,-2],[0,-5],[2,-2],[2,0],[1,-2],[-2,-8],[3,-2],[2,-4],[1,-6],[2,-8],[1,-13],[0,-8],[0,-3],[-1,-3],[-2,-10],[-2,-6],[-2,-6],[-2,-3],[-1,-4],[-3,-22],[-1,-9],[0,-25],[-2,-11],[-4,-21],[-1,-14],[2,-11],[4,-15],[3,-13],[3,-3],[2,1],[0,-10],[-1,-13],[-1,-9],[-4,-14],[-2,-9],[0,-7],[1,-11],[0,-14],[-3,-12],[-2,-10],[0,-4],[7,9],[27,51],[4,5],[3,-2],[2,-11],[-2,-6],[-2,-6],[-2,-6],[-1,-5],[-8,-6],[-3,-3],[0,-7],[7,-5],[2,-6],[0,-23],[-1,-9],[-3,-10],[0,-3],[-1,-1],[-7,-1],[-1,-1],[-2,-3],[0,-4],[4,-3],[4,-2],[2,-4],[-1,-11],[-2,-6],[-3,-4],[-2,-6],[3,-9],[-3,-2],[-2,0],[-6,2],[-3,-1],[-1,-5],[1,-4],[3,-1],[4,-2],[12,-9],[6,-2],[3,-2],[1,-5],[1,-8],[0,-9],[-1,-6],[-1,-3],[-7,-3],[-3,1],[-1,-1],[-2,-2],[-3,-8],[-1,-2],[-11,8],[1,-17],[-7,4],[-2,-13],[0,-14],[-1,-6],[-4,-3],[-3,4],[-5,15],[-2,6],[-1,-10],[-3,-13],[-3,-11],[-2,-3],[-2,6],[0,8],[0,16],[-1,6],[-5,15],[-5,4],[-3,-12],[-2,-17],[0,-16],[-2,-14],[-3,-9],[-9,-15],[-6,-19],[-22,-83],[-5,-10],[-2,-12],[-1,-15],[-1,-11],[-3,-8],[-6,-8],[-5,-6],[-23,-14],[-5,-1],[-2,2],[-1,9],[0,16],[3,9],[0,6],[-3,3],[-1,-2],[-1,-5],[-2,-10],[-1,9],[0,19],[-1,7],[-9,29],[-1,14],[3,37],[-3,-1],[-3,-11],[-2,-16],[-1,-32],[1,-7],[6,-19],[2,-8],[0,-4],[-1,-3],[-1,-5],[-2,-7],[0,-4],[9,-7],[0,-2],[1,-1],[1,-1],[1,-2],[0,-3],[-1,-4],[-2,-11],[-3,-8],[-1,-7],[1,-27],[-1,-12],[-5,-5],[-4,-2],[-24,-26],[-9,-15],[-6,-21],[-1,-26],[2,-9],[2,-6],[2,-7],[0,-12],[-1,-14],[-4,-9],[-5,-7],[-19,-15],[-9,-15],[-9,-7],[-5,-4],[-11,-27],[-2,-8],[-7,-9],[-2,-7],[4,-10],[4,-1],[6,1],[4,3],[3,7],[0,4],[2,3],[5,3],[1,0],[2,-3],[2,-1],[0,1],[1,6],[0,1],[5,1],[5,-1],[4,-6],[1,-12],[-3,-15],[-5,-15],[9,-22],[3,-14],[-4,-29],[3,-37],[-1,-14],[-4,-14],[-3,-6],[-14,-10],[-5,-8],[-6,-13],[-4,-13],[-2,-11],[1,0],[11,14],[7,5],[4,-9],[1,-22],[4,-8],[6,3],[13,17],[4,2],[3,-2],[0,-5],[1,-10],[2,-8],[2,1],[3,6],[3,6],[4,2],[1,-6],[0,-18],[-7,-82]],[[3020,2475],[-1,-1],[-15,-47],[-5,-24],[-1,-9],[-1,-29],[0,-18],[1,-10],[-1,-8],[-2,-7],[-2,-6],[-3,-9],[-3,-8],[-6,-11],[-2,-3],[-3,-3],[-5,-1],[-8,4],[-4,-1],[-4,-3],[-3,-5],[-2,-8],[0,-9],[-1,-13],[-5,-46],[2,-18],[5,-5],[5,-3],[2,-9],[1,-5],[2,-1],[6,5],[2,0],[2,-3],[0,-8],[1,-13],[2,-2],[2,-1],[2,-3],[2,-4],[0,-5],[1,-9],[1,-25],[5,-43],[0,-9],[0,-8],[-2,-9],[0,-6],[0,-9],[1,-4],[1,-3],[12,-28]],[[2999,1972],[-2,-5],[-6,-12],[-6,9],[-1,1],[-2,4],[-2,2],[-2,0],[-2,-4],[-3,-6],[-1,-5],[1,-11],[0,-5],[-1,-1],[-5,2],[-1,14],[-2,3],[-3,1],[-14,-1],[-4,-2],[-7,-17],[-1,-26],[-2,-17],[-9,-15],[-28,1],[-41,18],[-40,27],[-10,1],[-9,-4],[-8,10],[0,17],[-5,8],[-6,4],[-14,5],[-6,5],[-2,14],[-4,15],[-7,9],[-8,17],[-8,5],[-5,7],[-11,7],[-2,12],[-4,3],[-4,3],[-2,0],[-1,1],[-2,6],[-11,-5],[-14,5],[-11,3],[-7,3],[-7,6],[-8,5],[-8,6],[-51,11],[-18,1],[-40,11],[-18,4],[-9,21],[-5,5],[-5,3],[-6,-8],[-2,-2],[0,11],[0,15],[-5,14],[1,26],[0,12],[1,10],[3,13],[3,12],[4,5],[4,0],[4,2],[1,5],[-4,13],[4,10],[9,29],[6,15],[0,22],[-1,20],[-6,11],[-6,-2],[-7,7],[-6,-4],[-4,-17]],[[2478,2370],[-1,8],[0,6],[-1,8],[2,14],[2,15],[8,41],[12,31],[1,9],[-4,10],[-3,4],[-7,6],[-2,8],[-2,14],[-5,102],[1,19],[3,17],[2,15],[0,15],[-1,15],[-1,10],[2,12],[3,5],[2,3],[2,-1],[1,-4],[1,-8],[2,-8],[2,-2],[2,3],[3,6],[4,4],[6,-1],[4,-5],[5,-7],[6,-5],[24,-1],[6,9],[-1,10],[0,31]],[[2556,2778],[3,-5],[1,-4],[1,-5],[1,-4],[3,-5],[2,-6],[2,0],[2,1],[5,8],[7,-9],[8,-18],[4,4],[2,17],[4,40],[2,9],[1,8],[0,8],[0,20],[1,33],[0,38],[0,1]],[[2605,2909],[1,1],[3,3],[1,12],[1,7],[0,7],[-2,9],[-2,6],[2,9],[4,18],[-1,20],[5,6],[8,-4],[8,-10],[2,-7],[2,-7],[3,-7],[5,-4],[4,0],[3,2],[17,13],[8,-5],[8,-8],[5,-19],[8,-32],[7,-24],[5,-25],[9,-11],[11,-12],[13,-2],[7,-22],[5,-8],[5,7],[3,-5],[4,2],[3,5],[5,6],[1,3],[2,2],[2,-2],[2,-2],[2,0],[1,6],[-1,7],[3,3],[5,-4],[0,-8],[4,-1],[3,9],[1,3],[2,-14],[0,-12],[12,-19],[9,-11],[13,-17],[5,-5],[5,-5],[4,0],[3,0],[3,2],[4,7],[5,9],[1,1],[2,4],[1,7],[1,8],[0,7],[-2,6],[-2,6],[2,2],[4,-6],[7,-6],[14,-1],[4,-7],[2,6],[5,3],[1,-16],[1,-40],[18,-60],[4,-6],[3,-3],[12,-18],[7,-108],[7,-54],[12,-4],[10,-16],[9,-10],[10,1],[9,13],[2,-6],[3,-2],[4,-2],[3,-2],[1,-3]],[[3034,1939],[11,-18],[2,-4],[1,-3],[4,1],[1,-4],[-1,-7],[-1,-1],[-3,2],[-5,3],[-12,11],[-13,6],[-3,4],[-3,3],[-9,-3],[-4,2],[-1,8],[1,11],[2,9],[3,5],[11,-15],[11,-4],[8,-6]],[[3624,2522],[-1,-2],[-8,-37],[-2,-15],[0,-11],[-4,-53],[-1,-16],[1,-51],[-1,-20],[0,-7],[2,-25],[1,-7],[-1,-4],[-3,-6],[-9,-21],[-4,-11],[-3,-7],[-6,-12],[-4,-8],[-2,-3],[-1,-3],[-1,-4],[-2,-7],[-1,-4],[0,-7],[-8,4],[-14,13],[-3,5],[-3,5],[-2,1],[-1,-1],[-2,-2],[-3,0],[-3,2],[-4,5],[-5,3],[-4,-9],[-1,-25],[0,-27],[1,-18],[0,-12],[-4,-73],[3,-32],[2,-10],[2,-8],[-1,-6],[-6,-12],[-1,-4],[0,-4],[1,-4],[1,-5],[0,-10],[0,-10],[4,-5],[8,-2],[2,-3],[2,-5],[6,-17],[2,-7],[2,-7],[0,-8],[0,-24],[-2,-13],[-3,-26],[-1,-20],[-2,-4],[-2,-4],[-2,1],[-2,2],[-2,3],[-2,2],[-2,-1],[-5,-11],[-4,-5],[-6,-6],[-11,-18],[-13,-31],[-8,-14],[-4,-10],[-4,-10],[-1,-5],[0,-5],[0,-13],[0,-5],[0,-3],[-3,-29],[0,-4]],[[3466,1640],[-3,3],[-18,12],[-1,0]],[[3444,1655],[-2,40],[-1,0],[-1,0],[-2,-3],[-1,-1],[-2,4],[-1,7],[-1,103],[-1,16],[-1,27],[0,7],[-1,5],[-2,6],[-4,7],[-10,4],[-4,3],[-8,-2],[-4,1],[-12,0],[-9,7],[-7,16],[-3,15],[-4,22],[-7,89],[-1,6],[-5,-18],[-24,-47],[-3,-7],[-5,-15],[-1,-5],[-1,2],[-1,5],[0,15],[-1,3],[-1,1],[-2,-2],[-1,-1],[-2,1],[-13,4],[-5,-5],[-1,-6],[-1,-7],[0,-15],[0,-12],[-2,-10],[-12,-45],[-3,-11],[-1,-5],[0,-15]],[[3270,1839],[-2,3],[-23,17],[-5,11],[-5,-5],[-8,5],[-8,8],[-13,7],[-20,18],[-38,11],[-8,-6],[-5,-1],[-1,6],[-1,4],[-1,1],[-2,2],[-1,3],[0,3],[2,7],[0,2],[-2,2],[-6,6],[-37,10],[-22,6],[-11,-9],[-3,-11],[-3,-7],[-1,0],[-7,15],[-2,3],[-3,1],[-5,0],[-4,2],[-4,4],[-2,7],[-2,27],[-2,13],[-3,-2],[-1,-3],[-6,-7],[-1,-4],[-3,-12],[-2,-4]],[[3020,2475],[2,-5],[2,-7],[2,-6],[5,-3],[5,1],[3,3],[2,9],[0,13],[2,10],[4,0],[5,-4],[2,-4],[9,-17],[5,-5],[6,-10],[1,-1],[6,1],[38,-12],[19,10],[12,34],[8,-20],[43,-16],[37,-33],[9,-3],[10,1],[28,11],[5,4],[3,6],[1,3],[3,12],[2,3],[2,-2],[1,-6],[0,-7],[1,-6],[4,-5],[10,-12],[7,-6],[9,-18],[5,-7],[5,-2],[4,5],[4,6],[4,3],[4,1],[4,3],[3,5],[9,25],[10,35],[16,87],[2,26],[2,23],[0,24],[1,11],[2,7],[1,8],[-3,13],[5,2],[2,4],[4,14],[2,5],[11,12],[6,3],[2,2],[4,4],[2,2],[13,4],[4,4],[2,-4],[6,-10],[3,-2],[4,0],[2,0],[1,2],[1,4],[2,-3],[2,-5],[0,-2],[3,-5],[2,-6],[2,-8],[1,-23],[4,-20],[8,-63],[4,-21],[1,-4],[2,-1],[1,1],[40,-12],[6,0],[9,6],[4,2],[3,6],[8,29],[3,10],[6,-10],[12,-7],[8,-8],[2,-6],[7,-24],[4,-11]],[[3358,3030],[-2,-3],[-2,4],[-1,7],[-1,6],[0,5],[2,3],[6,4],[2,-5],[-1,-10],[-3,-11]],[[1603,3272],[2,-7],[-3,-3],[-10,6],[-1,2],[-1,-2],[-2,0],[-2,1],[-1,-1],[-1,-3],[-2,-13],[-3,7],[-3,18],[-2,9],[-26,55],[-7,9],[11,26],[5,6],[7,-4],[6,-9],[3,-2],[3,-1],[4,-3],[2,-6],[4,-12],[14,-11],[6,-9],[2,-16],[-1,-9],[-3,-7],[-4,-7],[0,-6],[3,-8]],[[1535,4859],[4,-17],[6,-11],[2,-6],[2,-8],[3,-20],[3,-9],[10,-24],[4,-7],[1,-6],[1,-7],[1,-14],[0,-1],[0,-1],[-1,-2],[-4,0],[-2,-2],[1,-7],[6,-22],[3,-4],[1,-1],[3,0],[2,-1],[5,-6],[3,-3],[2,0],[1,2],[3,6],[1,3],[2,1],[2,-1],[14,-13],[5,-13],[4,-7],[2,-6],[1,-6],[0,-5],[0,-5],[-2,-12],[0,-19],[-1,-5],[-1,-4],[-2,-3],[0,-4],[0,-3],[0,-4],[2,-3],[2,-3],[3,-5],[2,-6],[2,-9],[3,-6],[3,-9],[3,-10],[2,-4],[3,-3],[1,-1],[7,-10],[4,-3],[2,2],[3,4],[7,19],[9,19],[5,8],[4,3],[2,-2],[1,-5],[2,-18],[2,-9],[12,-20],[3,-3],[13,-6],[4,-4],[6,-2],[3,-3],[2,-4],[2,-4],[1,-6],[0,-5],[1,-15],[0,-16],[-2,-47],[-3,-11],[-5,1],[-3,0],[-2,-2],[-3,-1],[-4,2],[-5,6],[-2,0],[-1,-3],[1,-7],[2,-8],[1,-8],[0,-8],[-2,-6],[-5,-9],[-4,-5],[-5,-9],[-26,-66],[-4,-5],[-6,-4],[-6,-4],[1,-8],[6,-10],[2,-8],[3,-10],[2,-7],[8,-14],[3,-8],[5,-22],[3,-7],[4,-6],[10,-10],[2,-2],[4,1],[8,6],[4,-3],[2,-2],[9,-21],[4,6],[5,1],[3,-1],[4,1],[6,1],[2,2],[2,0],[2,-1],[3,-6],[2,-2],[1,-4],[1,-4],[2,-20],[6,-35],[1,-12],[1,-49],[3,-13],[3,1],[2,-1],[4,-4],[6,-9],[10,-5],[9,-16],[8,-7],[12,-3],[10,-17],[6,-6],[3,0],[10,-1],[2,-2],[3,-4],[1,-7],[1,-9],[2,-52],[1,-15],[2,-10],[7,-21],[2,-20],[2,-5],[1,-8],[6,-54],[0,-8],[1,-8],[1,-5],[4,-7],[2,-5],[2,-11]],[[1904,3663],[-7,-20],[-6,-14],[-6,-9],[-9,-15],[-3,-3],[-3,-5]],[[1870,3597],[-4,4],[-1,0],[-5,0],[-2,0],[-1,3],[0,2],[-1,2],[-2,4],[-4,9],[-2,4],[-2,3],[-2,3],[-3,2],[-3,0],[-3,-3],[-2,-3],[-3,-3],[-2,1],[-1,5],[-4,27],[-2,6],[-1,3],[-4,7],[-4,-7],[-3,3],[-3,11],[-2,25],[-5,11],[-24,57],[-27,45],[-28,30],[-3,8],[-3,22],[-3,12],[-38,89],[-38,71],[-35,73],[-6,9],[-6,12],[-5,15],[-1,21],[1,9],[4,18],[1,11],[-2,12],[-6,21],[-3,10],[0,7],[0,5],[0,5],[0,4],[-1,7],[-1,5],[-2,6],[0,8],[-1,21],[-1,11],[-3,10],[-34,55],[-41,76],[-52,101],[-6,15],[-5,29],[-5,8],[-31,139],[-3,25],[-17,86],[-6,19],[-8,14],[-19,25],[-8,15],[-8,17],[-17,64]],[[1308,5038],[11,27],[21,39],[3,5],[11,8],[5,6],[9,17],[7,6]],[[1375,5146],[19,34],[3,2],[2,-3],[2,-4],[1,-6],[6,-14],[3,-5],[3,-5],[1,-4],[0,-3],[1,-7],[4,-17],[5,-59],[2,-8],[3,-6],[7,-7],[3,-8],[1,-6],[2,-16],[8,-18],[5,-20],[7,-21],[8,-16],[12,-17],[3,-3],[5,-4],[3,-6],[4,-15],[2,-3],[3,0],[4,5],[2,1],[3,0],[7,-8],[5,-9],[3,-4],[5,-3],[3,-4]],[[2230,2644],[0,-15],[0,-23],[-2,-21],[-3,-10],[-4,-3],[-4,-14],[-3,-3],[-2,4],[1,10],[2,11],[2,8],[-3,3],[-2,6],[-1,14],[-10,-25],[-2,-3],[-1,11],[5,15],[11,23],[1,-4],[2,6],[2,4],[3,1],[1,-1],[0,4],[2,2],[3,0],[2,0]],[[2549,2921],[-1,-1],[-7,-15],[-2,-9],[4,-64],[6,-20],[3,-24],[2,-9],[2,-1]],[[2478,2370],[-1,-1],[-4,-4],[-6,-2],[-4,1],[-3,3],[-2,3],[-2,2],[-3,1],[-1,2],[-2,8],[-2,2],[-3,1],[0,3],[-1,4],[-1,4],[-1,3],[-8,16],[-7,-1],[-10,11],[-15,35],[-10,9],[-7,3],[-4,0],[-4,-2],[-4,-2],[-4,-3],[-1,-8],[-3,-3],[-2,8],[-5,-2],[-6,-1],[-7,-4],[-4,-3],[-4,4],[-7,3],[-5,2],[-23,-8],[-9,-4],[-4,-10],[-8,7],[-3,-4],[-3,9],[-2,4],[-4,2],[-1,-2],[-2,-4],[-2,-2],[-1,2],[0,4],[-1,5],[-2,3],[-1,2],[-9,10],[-10,1],[-2,-2],[-1,-12],[-1,-4],[-2,-4],[-2,-1],[-4,4],[-2,10],[-2,22],[-3,6],[-1,4],[0,4],[2,1],[7,-3],[3,4],[4,8],[6,17],[2,10],[2,10],[2,9],[4,3],[2,-3],[3,-7],[3,-8],[1,-6],[1,-8],[0,-6],[0,-6],[5,-23],[1,-9],[3,-9],[4,-4],[4,4],[3,10],[3,28],[3,13],[17,42],[3,12],[1,9],[-2,49],[6,30],[2,5],[5,-1],[1,-21],[4,-6],[2,-8],[6,3],[10,10],[5,21],[4,25],[-1,20],[3,102],[1,22],[6,48],[5,23],[15,43],[2,3],[2,6],[5,39],[4,14],[8,8],[7,-3],[4,-15],[1,-38],[2,-7],[2,-2],[7,-11],[3,-3],[8,9],[4,19],[6,15],[9,-2],[14,-29],[5,-4],[5,-2],[13,-18],[6,0],[4,6],[3,7],[5,3],[24,-1],[5,-2],[5,-5],[3,-6],[2,-10],[0,-7]],[[2549,2921],[0,-4],[2,-10],[3,-7],[9,-5],[9,0],[33,14]],[[2990,5489],[-7,-2],[-10,4],[3,8],[7,4],[7,-1],[4,-5],[-4,-8]],[[3035,5574],[1,-9],[-1,-9],[-2,-9],[-2,-8],[-3,-5],[-14,-13],[-2,-1],[-6,1],[-1,3],[0,7],[-1,8],[1,4],[1,6],[0,6],[0,6],[-1,5],[-1,2],[-4,-1],[-2,3],[3,9],[5,5],[10,6],[2,4],[1,3],[2,1],[4,-4],[2,-3],[6,-11],[2,-6]],[[3081,5748],[-7,-19],[-1,-2],[-1,3],[0,7],[-1,0],[-2,-1],[-1,0],[0,-3],[-2,0],[-1,2],[0,5],[1,5],[2,2],[1,1],[3,0],[2,3],[4,10],[2,0],[2,-6],[-1,-7]],[[3094,5780],[-3,-1],[-1,4],[0,8],[1,5],[0,4],[4,10],[2,2],[1,1],[2,-4],[0,-7],[-1,-9],[-1,-6],[-2,-3],[-2,-4]],[[3175,5928],[7,-13],[4,-4],[3,0],[3,4],[2,5],[2,2],[4,-1],[4,-7],[2,-10],[2,-10],[0,-43],[1,-3],[1,-3],[2,-4],[0,-6],[0,-5],[-2,-4],[-5,-5],[-10,-21],[-3,-3],[-3,-2],[-15,-18],[-7,-11],[-8,-6],[-7,-20],[-5,-4],[-3,3],[-4,7],[-5,9],[-1,7],[0,14],[5,37],[2,97],[2,11],[3,5],[4,-1],[7,-5],[4,-2],[3,2],[4,9],[3,1],[4,-2]],[[4082,6834],[-5,-9],[-4,-13],[-2,-4],[-3,-5],[-2,-6],[-4,-20],[-2,-12],[-3,-8],[-3,-10],[-2,-9],[-1,-9],[0,-21],[-1,-14],[-2,-6],[-2,-2],[-2,-2],[-3,-3],[-7,-16],[-3,-5],[-2,-1],[-5,1],[-4,-1],[-3,1],[-7,7],[-3,1],[-2,0],[-2,-1],[-4,-4],[-8,-5],[-8,-9],[6,-23],[4,-20],[3,-7],[8,-17],[3,-11],[4,-28],[1,-9],[1,-7],[0,-5],[0,-5],[4,-41],[0,-9],[0,-5],[0,-5],[-7,-28],[-3,-24],[-1,-13],[-1,-4],[-1,-3],[-2,0],[-2,-2],[-1,-3],[-3,-10],[-1,-3],[-1,-2],[-2,-1],[-2,-1],[-2,-2],[-2,-1],[-1,-3],[-1,-2],[-12,-34],[-4,-17],[-1,-5],[0,-8],[1,-5],[1,-4],[1,-2],[3,-3],[2,-4],[1,-6],[2,-13],[1,-7],[-1,-8],[-4,-24],[-4,-31],[-1,-6],[-5,0],[-2,3],[-2,4],[-2,6],[-2,6],[-5,22],[-1,5],[-2,2],[-2,0],[-2,-1],[-3,-5],[-1,-2],[-2,-1],[-2,-1],[-1,-2],[-1,-9],[-1,-4],[-2,-3],[-5,-3],[-3,1],[-5,2],[-2,0],[-2,-1],[-12,-13],[-6,-11],[-6,-9],[-23,-21],[-3,-7],[-2,-3],[-2,-5],[-39,-40],[-3,-2],[-3,0],[-6,5],[-3,0],[-2,-2],[-6,-9],[-20,-22],[-3,-1],[-3,1],[-5,3],[-3,2],[-6,0],[-11,6],[-26,0],[-3,-1],[-2,-3],[-1,-6],[-1,-12],[-6,-13],[-19,-16],[-24,-43],[-9,-13],[-3,-3],[-12,-16],[-21,-39],[-5,-13],[-7,-23],[-2,-7],[0,-8],[0,-8],[2,-17],[0,-9],[-2,-10],[-3,-7],[-7,-11],[-12,-10],[-3,-11],[-13,-16],[-5,-11],[-5,-13],[-2,-3],[-2,-10],[-5,-25],[-7,-12],[-6,-6],[-6,-10],[-4,-11],[-7,-25],[-4,-7],[-8,-22],[-3,-3],[-3,0],[-3,5],[-1,1],[-3,1],[-2,1],[-3,2],[-3,0],[-6,-4],[-7,-14],[-4,-10],[-5,-17],[-2,-5],[-2,-6],[0,-4],[1,-7],[1,-7],[2,-7],[3,-5],[3,-1],[3,3],[3,4],[2,1],[1,1],[1,-2],[2,-4],[0,-7],[0,-8],[-1,-15],[0,-4],[1,-4],[2,-4],[1,-7],[1,-8],[-2,-23],[-1,-10],[1,-10],[-1,-22],[-6,-70],[-1,-11],[1,-40],[1,-15],[2,-18],[28,-164],[0,-13],[-2,-22],[0,-13],[0,-54],[0,-18],[2,-9],[1,-7],[2,-7],[2,-12],[0,-9],[0,-9],[-1,-8],[-2,-7],[-2,-6],[-3,-5],[-13,-14],[-3,-6],[-2,-10],[-3,-24],[-3,-14],[-2,-5],[-2,-3],[-2,-3],[-6,-6]],[[3469,4798],[-1,4],[-5,-3],[-8,-15],[-3,-5],[-11,-10],[-4,-1],[-4,-4],[-4,-10],[-17,-61],[-8,-11],[-7,17],[0,6],[1,2],[2,1],[0,5],[0,6],[-1,14],[-1,12],[-1,14],[-3,25],[-6,19],[-8,5],[-9,-4],[-23,-27],[-22,-46],[-8,-2],[-5,17],[-4,25],[-4,21],[3,11],[4,18],[2,19],[0,17],[-4,26],[-1,23],[-2,20],[-1,10],[-1,7],[-8,5],[-3,6],[1,5],[4,14],[1,7],[4,15],[7,-3],[7,0],[3,23],[-7,-13],[-6,4],[-4,15],[-9,42],[-1,10],[0,26],[-3,51],[-2,13],[-3,6],[-3,3],[-2,10],[0,12],[0,11],[2,25],[3,25],[2,25],[-1,26],[-6,39],[-1,6],[-3,16],[-2,3],[-7,5],[-10,15],[-5,2],[-3,4],[-11,28],[1,2],[3,4],[1,2],[-2,3],[-1,5],[-1,6],[1,6],[2,6],[10,15],[4,3],[2,5],[2,11],[7,39],[1,11],[0,40],[6,75],[1,25],[-2,26],[-4,25],[-3,11],[-5,4],[-4,2],[-6,6],[-3,9],[1,11],[-5,5],[-2,13],[1,16],[3,27],[-1,9],[-3,6],[-4,1],[-2,2],[-5,7],[-2,1],[-6,-1],[-2,6],[-3,18],[-5,7],[-3,9],[-3,16],[-4,14],[-2,8],[0,13],[1,9],[1,5],[2,5],[2,7],[1,8],[0,2],[-6,-5],[-3,-5],[-1,-9],[0,-13],[-1,-13],[-2,-8],[-6,-14],[-6,10],[-4,9],[-2,0],[-1,-1],[-3,-1],[-1,5],[-4,31],[-4,10],[-8,9],[-8,7],[-11,3],[-2,0],[-2,-3],[-1,-5],[0,-4],[1,-5],[1,-6],[-1,-11],[-3,-5],[-3,0],[-3,2],[-9,11],[-2,3],[-2,1],[-8,12],[-2,5],[-6,94],[1,10],[3,7],[3,-1],[4,-10],[4,-6],[15,0],[3,-5],[7,-13],[6,-4],[1,-1],[2,-2],[2,0],[5,4],[2,3],[-1,6],[-2,1],[-6,-2],[-2,3],[-4,15],[-2,5],[-4,9],[-5,5],[-3,1],[-3,1],[-2,2],[0,4],[1,1],[2,3],[-1,3],[-1,3],[-1,2],[0,4],[4,0],[7,-4],[4,0],[0,4],[-5,10],[-6,6],[-6,2],[-15,-1],[-3,-4],[-1,2],[-2,4],[-3,3],[-1,4],[-1,4],[0,3],[-2,3],[-1,1],[-1,0],[-2,0],[-3,-1],[-1,-2],[-2,0],[-2,5],[-5,12],[-2,7],[-1,10],[-5,53],[0,24],[0,5],[2,0],[5,0],[-7,27],[-3,16],[3,14],[0,4],[-3,3],[-3,1],[-2,-3],[0,-9],[-3,5],[-1,10],[1,10],[2,7],[2,3],[3,3],[8,2],[6,-1],[6,-4],[6,-7],[3,-8],[2,0],[-2,9],[-4,12],[-2,8],[0,6],[0,24],[-1,33],[-1,15],[-4,19],[-1,9],[0,17],[1,8],[2,0],[6,-6],[22,-8],[-4,10],[-10,18],[-13,30],[-2,3],[-14,77],[-12,26],[-3,4],[-4,2],[-13,3],[-6,8],[-1,14],[2,24],[2,17],[1,8],[0,14],[-2,11],[-5,23],[-1,16],[1,6],[3,14],[1,6],[0,25],[-1,14],[-2,12],[-9,32],[0,5],[2,6],[1,12],[-2,14],[-6,20],[0,12],[2,6],[3,8],[4,7],[2,4],[5,1],[3,5],[3,8],[2,10],[4,25],[-1,23],[-11,86],[-1,14],[2,8],[4,3],[9,3],[9,6],[16,18],[8,13],[3,8],[13,42],[2,14],[4,12],[5,9],[0,4],[-6,2],[-3,-10],[-2,-11],[-3,-6],[-3,-6],[-5,-28],[-3,-6],[-1,-3],[-1,-7],[-1,-7],[-3,-4],[-2,-1],[-3,-3],[-3,-8],[-5,-4],[-12,-3],[-5,-5],[1,19],[3,16],[8,26],[3,20],[1,19],[0,68],[3,20],[5,16],[34,64],[4,15],[7,35],[4,15],[4,11],[0,3],[0,1],[1,1],[0,2],[1,4],[-1,2],[-1,0],[-1,0],[0,-2],[-11,-22],[1,10],[2,7],[3,6],[3,9],[2,10],[0,11],[0,19],[1,21],[4,7],[14,5],[30,20],[4,4],[3,6],[2,8],[7,32],[2,5],[-4,-32],[-6,-27],[-3,-13],[-2,-8],[-8,-18],[-2,-7],[0,-9],[1,-22],[0,-4],[0,-4],[1,-8],[2,-7],[2,-7],[2,-6],[3,-3],[9,0],[4,-4],[2,-11],[-2,-47],[0,-27],[1,-11],[3,-12],[4,-15],[19,-45],[2,-6],[0,-17],[2,-1],[4,7],[1,-4],[4,-26],[4,-8],[4,-1],[5,1],[4,0],[4,-5],[3,-10],[4,-34],[2,-13],[3,-6],[8,-11],[4,-10],[5,-22],[4,-10],[5,-4],[12,-5],[4,-5],[4,-12],[4,-25],[11,-43],[1,-15],[1,-12],[2,-2],[3,3],[3,1],[11,-6],[2,-3],[4,-9],[9,-34],[8,-18],[10,-13],[11,-3],[9,11],[2,8],[1,4],[1,2],[2,-1],[2,-2],[1,-5],[2,-4],[3,-1],[3,3],[4,10],[2,4],[2,0],[2,-2],[1,0],[4,4],[0,2],[3,4],[1,-1],[2,-5],[1,-1],[2,3],[0,5],[0,11],[3,9],[12,28],[6,8],[6,3],[14,1],[49,34],[4,-1],[29,-35],[5,-4],[5,-1],[4,3],[9,7],[4,0],[2,-6],[1,-9],[1,-10],[2,-13],[3,4],[5,19],[18,19],[3,2],[4,-1],[6,-5],[12,-13],[6,-5],[13,10],[19,62],[14,12],[17,0],[6,2],[3,3],[1,7],[12,90],[6,37],[1,6],[0,7],[-1,5],[-5,1],[-1,5],[1,14],[5,9],[25,32],[5,5],[13,4],[4,3],[4,8],[3,8],[3,7],[6,3],[65,-9],[5,-5],[2,0],[2,3],[2,5],[1,6],[2,5],[4,4],[4,-1],[4,-4],[4,-2],[10,1],[4,-2],[5,-5],[4,-6],[2,-8],[0,-13],[-1,-13],[-3,-12],[-3,-9],[-7,-14],[-1,-6],[1,-5],[3,0],[8,8],[9,4],[8,-2],[8,-11],[7,-15],[3,-3],[10,-1],[13,-7],[10,-11],[16,-34],[10,-1],[9,10],[4,3],[5,0],[5,-7],[11,-36],[6,-8],[5,3],[35,63],[13,45],[5,12],[4,4],[31,14],[9,0],[8,-7],[2,-5],[2,-7],[2,-5],[3,-3],[2,2],[5,9],[1,0]],[[2139,3068],[-2,-6],[-4,5],[-6,15],[-3,9],[-1,6],[0,6],[1,6],[2,0],[5,-8],[4,-2],[1,-1],[3,-7],[1,-7],[-1,-16]],[[2353,4045],[-4,-47],[1,-21],[1,-16],[2,-14],[4,-17],[2,-17],[-1,-13],[3,-5],[3,-7],[3,-20],[1,2],[1,2],[1,-11],[-2,-25],[2,-20],[-1,-12],[-2,-11],[-1,-10],[0,-10],[3,-30],[-3,-5],[-2,-11],[-2,-50],[-1,-26],[1,-14],[8,-36],[0,-20],[-2,-19],[-4,-19],[-3,-20],[-1,-50],[1,-50],[0,-27],[-6,-48],[-1,-27],[1,-51],[-1,-13],[-2,-23],[2,-37],[0,-24],[-1,-13],[-4,-25],[-1,-12],[-3,-46],[-2,-19],[-4,-17],[-7,-20],[-1,-4],[-2,6],[0,23],[-1,9],[-7,8],[-17,6],[-4,11],[-1,46],[-3,19],[-5,14],[-1,-3],[-2,-8],[-1,-2],[-2,1],[-2,3],[-1,3],[-2,2],[-2,3],[-8,21],[-11,25],[-5,14],[-14,54],[-7,13],[-6,-9],[-1,-12],[3,-22],[-3,-12],[1,-3],[-2,-16],[-1,-2],[-1,-2],[-3,1],[-3,3],[-5,-7],[0,-9],[2,-12],[1,-14],[0,-16],[1,-7],[2,-5],[1,-3],[1,-3],[-3,-5],[-6,-6],[-5,-6],[1,-10],[4,-4],[6,-2],[2,-3],[-2,-9],[-4,-5],[-5,-2],[-7,-1],[-3,3],[-10,21],[-37,45],[-14,28],[-10,8],[-5,11],[-13,39],[-2,6],[-4,5],[-8,5],[-4,4],[-3,7],[-1,0],[0,-2],[1,-10],[-5,0],[-4,-1],[-4,-4],[-4,-9],[-1,-10],[1,-11],[34,-147],[2,-22],[1,-25],[2,-14],[1,-6],[-1,-4],[-3,-2],[-30,2],[-2,5],[2,21],[-1,14],[-3,11],[-12,26],[-2,4],[-3,5],[-2,6],[-1,12],[-14,35],[-4,4],[-15,25],[-2,11],[5,12],[-2,11],[-10,27],[-5,8],[-2,2],[-2,0],[-2,2],[-2,4],[-2,5],[-1,7],[-1,6],[-7,5],[-4,8],[-4,9],[-15,53],[-10,26],[-2,9],[3,12],[1,8],[-3,10],[-3,8],[-3,4],[-5,2],[-5,0],[-3,2],[-2,10],[1,6],[3,12],[0,7],[0,12],[0,5],[-1,5],[-4,11],[-12,21],[-6,16],[-3,6],[-4,3],[-6,0],[-2,2],[-3,4],[0,5],[3,18],[-1,3],[-1,2],[-2,4],[-3,4],[-3,2],[-2,-2],[-2,-4],[-4,-10],[-5,26],[-3,9],[-2,2]],[[1904,3663],[12,-18],[4,-3],[2,-4],[1,-4],[1,-5],[0,-6],[0,-7],[-1,-5],[1,-5],[1,-7],[0,-5],[2,-4],[4,-3],[8,-1],[13,-4],[8,-1],[6,-2],[7,0],[16,9],[12,23],[8,1],[6,-3],[3,1],[2,1],[1,3],[4,10],[3,17],[1,5],[0,8],[-1,3],[-1,4],[-1,2],[-2,6],[-1,4],[-4,10],[-1,5],[0,6],[-1,14],[-1,3],[-2,5],[-1,4],[-1,4],[1,4],[0,3],[1,11],[0,3],[4,5],[1,4],[1,5],[2,9],[0,10],[0,9],[-2,41],[-1,18],[1,17],[2,16],[19,20],[3,8],[7,17],[5,9],[14,17],[5,3],[11,0],[16,10],[36,45],[10,7],[8,9],[11,5],[8,10],[1,6],[3,7],[3,7],[2,6],[1,9],[1,8],[2,7],[2,5],[7,9],[1,4],[0,4],[-2,6],[-1,3],[0,3],[1,5],[4,12],[0,3],[0,4],[0,12],[1,6],[1,5],[1,4],[4,3],[2,5],[3,10],[2,2],[3,0],[3,-3],[3,0],[2,2],[2,5],[3,8],[1,4],[3,21],[0,5],[0,11],[1,3],[0,2],[1,1],[1,2],[1,3],[0,4],[0,6],[0,6],[1,5],[1,4],[1,3],[2,-1],[2,-6],[2,-14],[1,-6],[3,-2],[1,0],[3,4],[3,0],[2,-2],[3,-5],[4,-17],[2,-5],[7,-3],[6,-8],[2,-4],[2,-9],[0,-5],[0,-5],[1,-3],[1,-3],[2,-1],[2,-3],[3,-9],[2,-8],[3,-6],[1,-9],[1,-7],[2,-9],[1,-1],[0,-6],[1,-6],[-1,-5],[-1,-11],[0,-4],[1,-3],[3,2],[2,-1],[2,-2],[1,-6],[1,-5],[0,-5],[0,-7],[1,-3],[5,0],[2,-4],[1,-5],[2,-13],[2,-5],[8,0],[4,5],[5,3],[9,-13]],[[2071,5479],[0,-4],[1,-12],[0,-7],[-1,-6],[-3,-16],[-1,-7],[-6,-23],[-1,-12],[0,-10],[1,-7],[2,-16],[4,11],[3,30],[2,8],[6,-2],[5,-12],[4,-13],[4,-6],[3,-7],[-2,-16],[-3,-18],[-3,-9],[-2,-5],[-1,-6],[0,-4],[4,1],[3,4],[5,17],[2,7],[2,-12],[0,-13],[0,-11],[4,-5],[1,-2],[0,-1],[2,-1],[0,2],[1,2],[0,3],[2,1],[1,2],[4,11],[9,8],[9,-6],[8,-18],[5,-25],[2,-27],[-1,-23],[-4,-20],[-7,-28],[-15,-50],[-3,-6],[-4,-2],[-9,-1],[-3,-3],[-3,-8],[-7,-14],[-4,-8],[15,18],[7,0],[5,-22],[0,-26],[-1,-15],[-3,-20],[0,-27],[-1,-10],[-2,-5],[-4,-5],[-4,-4],[-4,-2],[-2,-2],[-7,-13],[-7,-18],[-5,-16],[-2,-21],[0,-23],[0,1],[-1,-3],[0,-6],[3,7],[3,13],[3,14],[1,12],[1,10],[4,8],[7,13],[15,19],[6,11],[4,18],[4,39],[1,12],[-1,26],[1,10],[3,11],[7,18],[3,11],[3,26],[4,8],[4,2],[4,-5],[2,-11],[0,-15],[0,-14],[4,-8],[1,14],[2,9],[4,4],[4,2],[5,-4],[3,-7],[3,-8],[3,-6],[2,0],[5,4],[2,0],[3,-3],[3,-7],[1,-1],[5,2],[14,17],[4,2],[5,1],[5,-3],[8,-13],[6,-2],[10,-1],[19,-8],[10,-2],[5,-2],[4,-4],[0,-4],[-1,-1],[-2,1],[2,-8],[3,4],[4,8],[2,4],[4,-1],[3,-3],[2,-9],[1,-15],[-2,-13],[-3,-25],[-1,-13],[0,-14],[1,-13],[1,-12],[2,-12],[2,-9],[4,-11],[4,-9],[6,-4],[5,-6],[2,-2],[5,1],[3,-1],[2,-4],[4,-20],[-1,-81],[4,-22],[6,-18],[9,-13],[9,-4],[3,1],[4,3],[2,1],[3,-2],[3,-5],[2,-1],[4,-4],[2,-8],[4,-17],[2,-21],[0,-48],[1,-24],[1,-6],[3,-13],[0,-6],[0,-7],[-1,-13],[0,-6],[-2,-6],[-14,-20],[-8,-17],[-7,-22],[-7,-25],[-4,-26],[-13,-130],[1,-24],[6,-18],[18,-35],[4,-19],[0,-21],[-4,-24],[-14,-56],[-2,-19],[-1,-20],[-6,-41],[0,-11]],[[1535,4859],[8,24],[2,4],[10,5],[4,5],[12,20],[6,26],[8,-16],[11,-8],[11,-17],[4,-6],[7,-5],[4,-1],[4,0],[3,2],[3,3],[14,3],[4,4],[2,6],[1,8],[2,8],[3,8],[10,15],[4,8],[4,10],[2,1],[0,-3],[2,-2],[2,2],[4,6],[3,8],[3,9],[16,62],[1,8],[-1,7],[-2,5],[-2,4],[-1,6],[0,8],[1,10],[1,10],[3,6],[2,2],[4,-2],[7,-5],[6,-4],[8,-6],[6,-1],[6,7],[12,-13],[5,-4],[5,2],[9,10],[3,5],[1,5],[0,7],[0,9],[-2,9],[-2,7],[-2,6],[-1,6],[-1,9],[2,13],[4,14],[4,24],[4,3],[3,-2],[3,-6],[3,-9],[3,-22],[2,-13],[2,-10],[25,-64],[4,-6],[2,0],[2,1],[1,3],[0,4],[0,4],[0,4],[-1,3],[1,3],[0,5],[0,4],[0,16],[-3,28],[0,5],[0,5],[1,8],[2,5],[2,2],[8,3],[3,3],[4,4],[2,4],[1,4],[0,4],[-1,3],[-3,7],[-1,4],[-2,13],[-1,18],[3,73],[-2,11],[3,6],[76,103],[7,3],[9,-1],[36,-23],[11,-4],[13,5],[19,14],[4,8],[2,6],[6,40],[1,6],[2,4],[2,4],[3,0],[3,-2],[6,-10],[7,-13],[2,-3],[3,-2],[1,0],[4,4]],[[2578,4715],[-1,-2],[-9,6],[-4,5],[-9,19],[-8,7],[1,6],[2,6],[1,2],[1,9],[1,3],[5,9],[4,6],[5,3],[3,-6],[4,-6],[10,-4],[4,-6],[1,-13],[-5,-26],[1,-14],[-7,-4]],[[2627,4788],[-1,-4],[-3,1],[-2,3],[-4,3],[-2,5],[-4,5],[4,13],[3,10],[3,6],[0,2],[1,3],[2,1],[1,-1],[1,-10],[3,-11],[0,-16],[-2,-10]],[[2715,4803],[-3,-13],[-4,-10],[-7,-6],[-4,-13],[-3,6],[-6,19],[-6,11],[1,7],[4,-4],[4,4],[3,4],[1,10],[5,10],[7,6],[6,2],[2,-1],[0,-9],[1,-4],[1,-6],[-2,-13]],[[2792,4996],[8,-8],[8,-3],[3,3],[12,-6],[3,-4],[2,-6],[4,-30],[2,0],[1,16],[2,7],[3,5],[7,-8],[1,-3],[2,-10],[1,-3],[4,-2],[3,-7],[2,-9],[1,-11],[4,6],[3,-2],[15,-47],[2,-22],[3,-21],[1,-11],[-1,-11],[-2,-8],[-2,-6],[-1,-5],[-2,-16],[-9,-31],[-2,-16],[0,-5],[1,-10],[0,-5],[-1,-6],[-1,-11],[-1,-5],[0,-3],[-1,-4],[-1,-4],[-1,-6],[1,-4],[4,-8],[1,-6],[-5,-1],[-8,-9],[-4,-2],[-5,-1],[-4,-2],[-3,-6],[-1,-11],[0,-21],[-2,-3],[-6,-1],[-5,-3],[-4,-3],[-3,1],[-2,13],[0,27],[-1,13],[-6,10],[-11,27],[0,1],[1,4],[-1,6],[-1,6],[-3,5],[-1,-1],[-1,-3],[-4,-1],[-4,-4],[0,-8],[4,-17],[0,-22],[-6,-13],[-13,-18],[-15,0],[-6,-20],[-6,-5],[-6,7],[-2,13],[2,18],[8,26],[0,2],[0,4],[-1,3],[-1,1],[-1,6],[-6,13],[-1,5],[0,7],[0,7],[0,7],[-1,6],[-1,5],[-1,6],[0,7],[1,8],[4,12],[1,6],[1,22],[-2,2],[-4,-2],[-5,-6],[-2,0],[-1,6],[0,7],[2,7],[3,5],[3,2],[4,6],[1,17],[-1,19],[-2,15],[3,3],[3,6],[3,7],[1,6],[0,37],[3,60],[3,14],[9,5],[4,-1],[6,-4],[4,0],[3,4],[7,13],[3,4],[3,-15]],[[2363,5624],[4,-1],[4,-2],[2,-6],[1,-9],[3,-10],[2,-2],[2,0],[5,0],[1,-2],[11,-20],[1,-4],[1,-6],[0,-6],[-2,-6],[-1,-7],[0,-24],[1,-7],[2,-5],[2,-3],[1,-3],[1,-5],[1,-11],[1,-4],[1,-3],[2,-3],[1,-3],[0,-6],[1,-7],[1,-6],[1,-3],[3,-2],[2,-2],[0,-6],[-1,-7],[0,-5],[11,-35],[1,-5],[-1,-6],[-3,-39],[1,-26],[8,-101],[14,-102],[5,-25],[6,-23],[8,-18],[4,-6],[5,-6],[5,-1],[2,6],[3,2],[25,-23],[28,-13],[14,-15],[4,-2],[11,0],[3,-4],[0,-8],[-1,-3],[-2,0],[-2,0],[-2,-1],[-7,-11],[-3,-1],[-3,-4],[-4,-9],[-10,-41],[-14,-101],[-2,-24],[2,-19],[8,-12],[3,-2],[3,0],[2,-2],[2,-6],[1,-5],[2,-4],[3,-2],[4,-3],[1,-10],[0,-10],[-1,-9],[2,-9],[1,-3],[-2,-4],[-2,2],[-1,-3],[-2,-5],[-3,-2],[-2,1],[-1,2],[-1,1],[-4,-6],[-1,3],[-1,4],[-1,3],[-12,5],[-6,-3],[-2,-15],[-2,3],[-1,2],[-4,-7],[-3,6],[-2,13],[-1,14],[-1,6],[-2,5],[-5,9],[-2,7],[-3,13],[-2,7],[-4,3],[-11,-1],[-4,3],[-10,28],[-45,43],[-5,3],[-15,3],[-4,6],[-14,62],[-3,25],[-1,27],[2,25],[4,26],[3,26],[-3,24],[-7,13],[-8,9],[-7,15],[-2,28],[1,17],[0,7],[0,6],[-2,9],[-1,9],[-2,12],[-1,7],[0,20],[0,17],[-1,7],[-3,5],[-3,5],[-4,4],[-13,5],[-1,1],[-2,5],[-1,2],[-1,-1],[-3,-3],[-7,2],[-2,2],[-3,6],[-4,16],[-2,6],[-5,-9],[-12,-10],[-4,-5],[-4,-9],[-2,-1],[-5,2],[-14,0],[-11,-8],[-2,2],[-1,3],[-4,18],[-1,5],[-8,10],[-4,2],[-7,-2],[-4,-2],[-3,-4],[-5,21],[0,24],[2,23],[4,17],[7,12],[24,25],[17,31],[6,23],[-2,26],[-8,14],[-4,10],[1,5],[2,2],[0,5],[-1,11],[1,6],[2,3],[2,2],[2,3],[1,4],[1,9],[1,4],[2,0],[2,0],[2,2],[9,24],[2,3],[10,-1],[4,3],[2,3],[2,5],[3,5],[6,4],[4,-9],[1,-14],[1,-15],[1,-14],[5,-12],[5,-8],[6,-5],[-2,-9],[-9,-21],[0,-9],[3,-11],[4,-9],[3,-6],[4,-5],[3,1],[3,3],[4,1],[1,-2],[2,-10],[1,-4],[1,-1],[6,1],[-1,12],[-3,11],[-7,20],[-2,10],[0,12],[1,22],[0,2],[-4,17],[-1,5],[0,10],[-1,5],[-1,8],[-2,8],[-2,7],[-2,5],[5,5],[20,-1],[5,5],[9,17]],[[4473,1376],[3,-14],[2,-13],[4,-13],[2,-17],[-4,-11],[-4,-12],[-6,5],[-12,23],[-4,12],[-3,2],[-1,3],[0,5],[8,26],[3,5],[3,-2],[4,5],[5,-4]],[[4457,1671],[7,-13],[7,-15],[12,-40],[7,-18],[8,-15],[5,-18],[-3,-26],[-2,-6],[-7,-16],[-4,-6],[-5,-16],[-2,-5],[-16,-3],[-2,-3],[-2,-13],[-4,-9],[-29,-28],[-9,-16],[-7,-21],[-5,-24],[-3,-9],[-5,-4],[-4,-4],[-2,-11],[1,-13],[3,-12],[2,4],[-1,3],[-2,9],[4,5],[1,-11],[-1,-28],[-1,-6],[-4,-6],[-4,-4],[-3,-2],[-5,-1],[-5,0],[-4,4],[-4,7],[-1,9],[5,8],[10,13],[2,8],[3,13],[0,14],[-2,12],[-1,4],[-3,20],[-2,2],[-2,2],[-1,2],[-7,13],[-2,9],[-2,9],[-1,9],[-4,8],[-8,13],[-15,38],[-6,10],[-28,37],[-9,4],[-26,0],[-7,7],[-7,14],[-5,17],[-18,68],[-4,58],[1,15],[6,4],[5,-1],[3,-5],[2,-9],[3,-8],[3,-4],[4,3],[5,11],[4,-6],[4,-4],[9,-2],[4,-2],[36,-35],[8,8],[20,0],[8,4],[9,18],[16,41],[8,11],[4,0],[5,-3],[4,-5],[4,-6],[3,-6],[15,-9],[36,-41]],[[3994,1481],[-17,0],[-3,4],[-1,9],[1,9],[3,6],[-1,5],[0,4],[11,-7],[12,-2],[2,-3],[2,-9],[0,-8],[-1,-3],[-3,-1],[-5,-4]],[[4266,2277],[0,-9],[-1,-2],[-19,5],[-4,0],[-3,0],[-1,2],[0,7],[1,3],[1,2],[8,10],[2,1],[2,-2],[5,-5],[3,-1],[2,0],[2,-1],[2,-3],[0,-7]],[[4543,2291],[-1,-23],[-4,-13],[-8,-7],[-9,5],[-8,12],[-3,11],[2,6],[2,1],[1,-3],[0,1],[2,16],[2,-1],[1,-5],[1,-8],[1,-5],[2,-2],[3,0],[4,-4],[6,-2],[2,1],[1,3],[-2,0],[-1,4],[-1,6],[1,5],[2,3],[1,0],[1,-4],[0,2],[0,8],[1,4],[0,-3],[1,-8]],[[4217,2287],[-1,-15],[0,-13],[-3,1],[-5,6],[-5,5],[-2,7],[-4,-1],[-3,3],[-2,10],[-2,15],[-1,12],[6,16],[6,2],[4,-3],[3,-8],[3,-12],[3,-14],[3,-11]],[[4128,2437],[5,-5],[4,-7],[3,-10],[5,-4],[6,-6],[3,-9],[4,-20],[-7,-1],[-9,-17],[-16,-5],[-5,-15],[-5,-3],[-5,1],[-4,-6],[-5,-21],[4,-3],[2,-6],[0,-6],[-5,-5],[-9,-2],[-12,4],[-15,7],[-5,0],[-4,2],[-5,-13],[-7,2],[-4,-6],[-2,-9],[-2,-9],[-1,-8],[-1,-7],[-1,-11],[-3,-12],[-3,-4],[-4,-5],[-2,5],[-2,6],[-5,5],[-11,-3],[-34,5],[-3,5],[-4,1],[-11,-9],[-4,2],[-2,20],[-1,5],[-1,3],[0,4],[2,4],[0,5],[-2,0],[-6,6],[-1,-1],[-1,-6],[0,-12],[-2,-4],[3,-7],[4,-7],[3,-7],[-1,-7],[-3,-3],[-68,41],[-8,2],[-8,-2],[-4,2],[-1,6],[-1,18],[1,9],[2,8],[-2,4],[-2,-9],[-2,3],[-1,10],[-1,10],[0,12],[2,3],[3,1],[4,2],[6,10],[7,16],[11,35],[0,10],[6,6],[9,4],[7,0],[8,0],[19,6],[17,-8],[27,1],[38,6],[17,-8],[32,10],[26,-2],[29,11],[9,-4],[5,-4]],[[4430,2463],[18,-5],[5,-5],[15,-23],[4,-9],[0,-15],[-3,-6],[-10,1],[-2,1],[-4,6],[-3,2],[-3,4],[-1,1],[-1,3],[-2,-1],[-1,-4],[-1,-1],[-2,-3],[-1,0],[-2,2],[-1,3],[-1,3],[-3,1],[-7,-10],[-1,-1],[1,-7],[2,-3],[2,-1],[2,-3],[3,-5],[1,-3],[1,-4],[-5,-9],[-5,4],[-8,17],[-3,-8],[-1,-4],[0,-3],[1,-2],[0,-3],[2,-5],[0,-4],[-1,-2],[-2,-1],[-1,-1],[-1,3],[-1,0],[-4,12],[0,4],[2,22],[-8,-2],[-4,2],[-1,6],[0,14],[3,8],[3,6],[3,11],[-3,10],[2,5],[5,1],[4,0],[18,1]],[[3624,2522],[5,-12],[5,-10],[5,-6],[14,-11],[10,-2],[3,-2],[4,-1],[5,4],[7,10],[4,3],[4,-3],[8,-20],[12,-44],[4,-8],[5,-2],[9,0],[9,3],[8,7],[2,1],[9,0],[4,2],[9,9],[5,1],[8,-3],[4,-4],[1,3],[2,3],[1,1],[4,-2],[4,-7],[3,-8],[3,-6],[5,-4],[4,0],[4,5],[1,13],[0,7],[0,5],[1,0],[3,-3],[2,-3],[1,-5],[1,-6],[1,-6],[-1,-12],[-3,-24],[-1,-14],[1,-6],[5,-20],[2,-4],[2,-3],[3,4],[3,1],[2,-11],[-7,-5],[-3,-4],[-2,-5],[1,-7],[2,-10],[2,-9],[2,-4],[4,-4],[3,-10],[2,-13],[-1,-10],[-3,-4],[-13,4],[3,-13],[6,-9],[12,-15],[3,9],[3,12],[3,9],[5,3],[4,-4],[3,-8],[2,-9],[3,-16],[1,-9],[0,-9],[-2,-22],[0,-10],[0,-24],[-2,-12],[-8,-15],[-2,-10],[0,-48],[18,-37],[28,-32],[4,-3],[5,0],[5,-1],[4,-5],[4,-9],[8,-21],[5,-8],[7,-5],[5,-6],[2,-1],[2,1],[5,3],[2,0],[5,-6],[5,-18],[3,-4],[5,1],[4,5],[8,14],[8,11],[5,4],[4,1],[4,3],[7,11],[5,2],[28,-12],[3,1],[4,6],[2,1],[5,-1],[9,-9],[5,-2],[4,3],[3,7],[4,14],[4,6],[3,-1],[4,-3],[5,-2],[4,2],[3,3],[16,35],[6,4],[7,-11],[9,-30],[5,-12],[7,-7],[5,0],[9,6],[5,2],[3,-3],[8,-21],[3,-6],[2,-1],[3,-1],[5,1],[2,-1],[2,-2],[4,-9],[8,-13],[4,-9],[1,-12],[0,-13],[-1,-25],[-1,-5],[-3,-11],[-1,-7],[0,-6],[1,-5],[0,-5],[1,-4],[0,-28],[-10,-85],[-8,-118],[-1,-17],[-1,-13],[0,-6],[1,-7],[2,-13],[1,-27],[0,-13],[3,-5],[3,7],[1,15],[0,26],[3,-10],[1,-19],[0,-39],[2,-12],[2,-12],[4,-9],[3,-4],[5,0],[3,-2],[5,-10],[12,-11],[1,-7],[2,-7],[2,-7],[3,-10],[-1,-14],[-6,-21],[-9,-1],[-19,17],[-5,3],[-12,-3],[-5,4],[1,9],[5,15],[-2,21],[-8,20],[-10,12],[-9,0],[-9,-15],[-5,-5],[-2,6],[-3,9],[-5,-1],[-10,-10],[-2,0],[-8,4],[-2,3],[-2,11],[-2,2],[-4,-3],[-4,-5],[-3,-1],[-3,9],[1,7],[1,8],[0,7],[-2,3],[-3,-1],[-4,-6],[-2,-1],[-4,1],[-6,5],[-5,6],[-4,8],[-1,-3],[-1,-1],[0,-1],[-1,-3],[-1,8],[-1,20],[-2,4],[-3,-1],[-4,-3],[-3,-4],[-1,-6],[-1,-2],[-2,0],[-4,0],[-1,2],[1,11],[0,3],[-3,5],[-2,0],[-2,-2],[-4,1],[-3,6],[-4,15],[-3,4],[-6,3],[-2,3],[-2,8],[-1,2],[-7,-3],[-3,1],[-8,12],[-2,4],[-1,4],[-1,8],[-2,2],[-4,1],[-4,-5],[-3,-3],[-4,5],[-11,34],[-5,9],[-9,10],[-9,6],[-9,3],[-28,-9],[-9,-7],[-9,-12],[-11,-34],[-7,-13],[-7,7],[-3,-1],[-5,10],[-1,-3],[-1,-5],[-2,-4],[-2,-1],[-2,2],[-2,4],[-1,1],[-3,-5],[-3,-8],[-2,-3],[-3,-2],[-4,-1],[-3,-2],[-2,-5],[-4,-10],[-4,6],[-9,12],[-9,4],[-11,11],[-17,0],[-4,2],[-3,5],[-3,5],[-5,0],[1,6],[1,2],[-4,9],[-5,6],[-6,2],[-4,0],[-3,-2],[-6,-6],[-2,0],[-2,2],[-1,3],[-1,3],[-4,3],[-40,11],[-5,4],[-7,12],[-2,0],[-6,-10],[-1,-3],[0,-1],[-2,-1],[-5,4],[-5,14],[-3,3],[-6,-1],[-2,1],[-3,2],[-2,3],[-2,2],[-2,-3],[-2,-12],[0,-12],[-1,-9],[-4,-4],[-1,3],[-1,8],[-1,7],[-2,3],[-2,-3],[-1,-5],[-2,-13],[0,-2],[-2,-6],[0,-5],[3,-5],[1,-4],[-1,-4],[-3,-2],[-5,2],[-4,6],[-3,9],[-2,11],[-2,0],[-2,-8],[-4,2],[-7,10],[-3,1],[-3,-7],[-4,-1],[-15,10],[-1,9],[0,7],[0,5],[-4,5],[-1,-1],[-4,-3],[-2,0],[-2,1],[-2,5],[-2,2],[-11,0],[-3,-1],[-1,2],[-2,5],[-2,2],[-2,-1],[-2,-2],[-1,-3],[-18,-15],[-2,1],[-1,6],[0,6],[-2,5],[-2,2],[-3,1],[-2,3],[-1,8],[0,8],[-2,5],[-1,-1],[-1,-4],[-1,-6],[-1,-5],[-2,-7],[-2,-4],[-2,-1],[-8,0],[-5,3],[-11,14]],[[3851,3112],[3,-6],[1,-10],[1,-14],[0,-13],[-2,-11],[-2,-8],[-4,-4],[-2,-1],[-6,1],[-1,2],[-1,5],[-2,-2],[-3,-5],[-6,0],[-2,7],[-1,11],[-2,14],[2,5],[6,13],[0,3],[6,16],[2,-3],[3,2],[3,3],[4,1],[3,-6]],[[4523,3653],[-4,-4],[-3,8],[5,17],[12,28],[0,-4],[-1,-7],[0,-4],[0,-3],[1,-3],[1,-3],[1,0],[-12,-25]],[[4651,4356],[-2,-4],[-3,11],[-8,35],[-2,8],[0,9],[2,13],[5,30],[1,12],[1,6],[6,14],[1,8],[1,11],[3,-5],[4,-16],[-1,-22],[-4,-44],[-2,-33],[-2,-22],[0,-11]],[[4593,4121],[-2,-4],[-4,-14],[-2,-4],[0,10],[-1,8],[-3,2],[-3,-4],[-2,12],[1,13],[2,13],[0,13],[1,2],[2,1],[2,3],[1,6],[0,5],[-3,9],[-1,4],[-1,11],[2,36],[0,14],[-2,8],[-5,12],[-4,16],[-1,9],[-2,44],[1,12],[5,37],[2,41],[1,11],[10,47],[4,37],[0,8],[2,3],[7,9],[3,4],[12,30],[4,4],[2,4],[1,6],[2,2],[2,-8],[0,-8],[0,-6],[-1,-7],[-3,-59],[1,-23],[5,-23],[4,-9],[3,-12],[0,-10],[-9,-10],[-1,-11],[2,-12],[1,-8],[2,-11],[0,-10],[0,-26],[1,-14],[1,-6],[0,-22],[1,-4],[3,-5],[2,-4],[0,-6],[-3,-4],[-2,-17],[-2,-8],[-3,-10],[0,-15],[2,-8],[2,-14],[1,-9],[-1,-7],[-2,-2],[-2,0],[-2,-1],[-2,-5],[-1,-5],[-2,-4],[-2,-2],[-3,-1],[-2,0],[-2,-3],[-1,-4],[-1,-4],[1,-7],[-1,-3],[-1,-3],[-4,-4],[0,-2],[-1,-3],[-1,-5],[-4,-10],[-2,-2],[-4,-4]],[[4690,5107],[-7,-89],[-5,-24],[-8,-4],[-2,8],[-1,12],[-1,12],[-4,5],[-5,1],[-3,-1],[-1,-2],[-2,-5],[-1,-1],[-2,0],[-1,1],[-1,2],[-1,1],[-7,-4],[-3,0],[-2,-3],[-1,-5],[-1,-6],[1,-2],[4,-5],[-1,-12],[-5,-24],[3,-4],[7,28],[5,6],[4,0],[2,-10],[-1,-9],[-4,-26],[-1,-11],[1,-102],[-1,-22],[-3,-20],[-4,-18],[-10,-36],[-5,-11],[-4,-2],[-4,4],[-2,10],[-1,27],[0,5],[-1,5],[-2,4],[-4,4],[-2,4],[-1,8],[-2,13],[-1,13],[0,12],[-1,5],[-1,0],[-2,-4],[-1,-7],[1,-3],[1,-11],[0,-6],[-2,-13],[-3,-11],[-1,-13],[2,-14],[1,-7],[-1,-6],[-3,-6],[-1,-7],[1,-5],[2,1],[3,4],[7,-3],[1,-7],[0,-9],[2,-11],[3,-8],[14,-27],[3,-9],[-1,-8],[-10,-6],[-8,-8],[-3,3],[-1,-10],[4,-21],[1,-14],[-1,-14],[-3,-6],[-4,-3],[-5,-5],[0,9],[2,6],[2,1],[2,-4],[1,4],[2,4],[1,11],[-4,1],[-7,-8],[-2,-4],[-3,-11],[-3,-25],[-13,-62],[-3,-24],[-3,-52],[-2,-25],[-4,-16],[-5,-3],[-14,0],[-5,-4],[-5,-7],[-9,-22],[-8,-16],[-38,-49],[-59,-61],[-55,-61],[-40,-50],[-36,-59],[-10,-8],[-9,8],[-4,23],[1,25],[5,45],[-5,51],[-1,43],[1,101],[-3,27],[-13,44],[-3,26],[0,26],[6,75],[-4,-5],[-4,-6],[-3,-9],[-2,-63],[-3,-7],[-5,1],[-9,8],[-10,16],[-12,15]],[[4198,4474],[35,254],[5,58],[1,7],[1,8],[5,18],[2,2],[1,2],[15,8],[5,4],[1,3],[1,3],[3,8],[1,5],[0,4],[0,7],[1,4],[2,3],[15,15],[1,3],[2,4],[4,11],[2,9],[1,14],[0,13],[1,13],[2,13],[2,11],[2,11],[10,28],[1,4],[3,22],[4,18],[1,7],[0,6],[0,20],[-1,6],[-1,4],[-1,3],[-1,6],[-2,10],[0,6],[0,19],[0,5],[0,4],[0,2],[2,4],[3,3],[27,16],[12,9],[10,8],[6,7],[7,14],[31,80],[-5,26],[1,7],[2,12],[4,13],[4,20],[0,15],[-1,14],[-3,16],[-1,17],[1,20],[14,172],[1,13],[2,6],[2,5],[10,10],[1,1],[7,2],[9,5],[20,22],[5,4],[3,-1],[1,-4],[0,-8],[-2,-26]],[[5783,235],[4,0],[1,0],[3,-1],[-1,-7],[-3,-7],[-4,-4],[-5,-3],[-5,-1],[-4,1],[-1,6],[3,8],[5,7],[7,1]],[[6169,253],[-2,-5],[-1,-1],[0,-5],[2,-1],[3,1],[2,-1],[5,-8],[2,-8],[-1,-26],[-2,-10],[-4,0],[-5,2],[-4,1],[-4,-5],[-12,-25],[-2,-2],[-2,-3],[-3,-2],[-1,-5],[0,-14],[0,-6],[-1,-6],[-5,-14],[-7,-4],[-8,-2],[-33,-25],[-5,-6],[-2,-7],[3,-7],[0,-4],[-20,-10],[-8,1],[-5,17],[-1,53],[-1,11],[0,4],[5,3],[5,10],[13,11],[5,1],[5,0],[3,0],[1,2],[3,5],[2,1],[3,-1],[2,1],[5,6],[11,29],[4,7],[9,10],[4,9],[1,6],[0,12],[2,6],[2,3],[2,-2],[1,1],[1,8],[1,10],[4,9],[8,12],[12,11],[4,7],[5,21],[2,6],[2,-9],[1,-9],[-1,-7],[-4,-12],[4,-8],[-1,-12],[-3,-11],[-1,-5],[2,-3],[-2,-6]],[[5858,337],[4,-6],[4,1],[4,-2],[2,-16],[-2,-24],[-1,-8],[-9,-18],[-5,-8],[-2,-5],[-1,-1],[-1,-1],[-2,0],[-2,-2],[-1,-3],[0,-5],[-1,-2],[-5,-3],[-13,3],[-10,-1],[-5,2],[-4,7],[-3,5],[-1,3],[-1,4],[4,7],[26,35],[8,31],[4,7],[4,5],[5,0],[4,-5]],[[6188,464],[-2,-6],[-1,-9],[-2,-2],[-3,4],[-2,9],[-4,-4],[5,-27],[2,-15],[-3,-7],[1,-8],[-1,-5],[-2,-1],[-3,2],[0,4],[-3,8],[-2,6],[-1,-4],[-2,-9],[-3,-9],[-4,-1],[-1,16],[0,17],[1,10],[3,7],[5,12],[3,11],[4,24],[3,11],[3,4],[5,5],[4,2],[2,-7],[1,-7],[7,-5],[0,-10],[-2,-6],[-8,-10]],[[5438,971],[13,-50],[5,-11],[4,-6],[4,-4],[4,-1],[4,5],[3,2],[6,-5],[4,-10],[4,-10],[0,-24],[1,-15],[1,-23],[1,-10],[3,-7],[12,-16],[4,0],[2,8],[2,7],[5,4],[11,4],[4,-1],[5,-5],[3,-10],[1,-15],[2,-8],[16,-22],[6,-21],[8,-49],[5,-19],[6,-12],[15,-20],[6,-13],[4,-13],[5,-19],[1,-21],[-3,-24],[-2,-6],[-7,-14],[-9,-27],[-4,-16],[-3,-5],[-13,-10],[-2,-5],[-2,-3],[-14,5],[-4,-3],[-10,-14],[-2,-5],[-1,-12],[-1,-9],[-3,-6],[-4,0],[-4,6],[-5,18],[-4,4],[-33,13],[-2,-2],[-2,3],[-15,11],[-1,4],[-2,12],[-1,4],[-9,11],[-1,4],[-6,26],[-3,3],[-2,-1],[-1,2],[-1,26],[-3,14],[-9,30],[-1,6],[-3,4],[-2,1],[-3,1],[-3,2],[-1,5],[-1,8],[-3,-5],[-1,3],[-1,5],[-1,5],[-5,7],[-2,1],[-8,2],[-4,4],[-8,15],[-13,19],[-2,7],[-1,17],[-2,7],[-9,6],[0,2],[0,8],[0,2],[-1,1],[-2,-2],[-1,-2],[-1,0],[-5,3],[-10,2],[-9,8],[-5,3],[-4,-1],[-4,-3],[-4,-4],[-2,-6],[-2,-11],[-4,4],[-8,17],[-2,0],[-3,-4],[-1,0],[-2,2],[-6,10],[-5,-3],[-9,0],[-9,3],[-9,10],[-9,4],[-3,4],[-10,21],[-3,9],[-3,19],[-2,7],[-3,7],[-7,11],[-3,9],[-1,10],[1,16],[4,16],[5,14],[9,22],[6,9],[6,4],[7,2],[3,2],[6,10],[4,4],[8,4],[7,1],[2,1],[3,6],[1,1],[9,0],[17,-8],[2,1],[3,6],[10,5],[5,-2],[9,-8],[2,0],[4,7],[5,5],[13,7],[4,0],[3,-3],[2,-8],[2,-6],[26,-8],[5,3],[27,54],[3,-2],[1,-13],[1,-6],[9,-20]],[[6509,1138],[3,-2],[4,1],[3,3],[5,9],[11,13],[3,7],[0,4],[1,11],[1,4],[2,2],[1,-1],[1,-4],[2,-4],[4,-6],[4,-7],[3,-10],[2,-12],[0,-12],[-4,-38],[0,-5],[1,-6],[1,-4],[0,-3],[-1,-5],[-2,-3],[-5,1],[-2,0],[-4,-5],[-2,-5],[-2,-4],[-3,1],[-1,2],[-3,8],[-1,3],[-2,1],[-4,0],[-7,-3],[-4,-12],[-1,-18],[2,-20],[1,-10],[1,-7],[6,-12],[4,-8],[1,-4],[1,-4],[-1,-9],[0,-4],[5,-21],[1,-9],[3,-36],[-7,-13],[-6,-17],[-4,-24],[-1,-43],[-2,-7],[-21,-37],[-6,-14],[-19,-61],[-3,-21],[-2,-8],[-13,-18],[-8,-15],[-7,-18],[-10,-17],[-5,-13],[-3,-27],[-3,-8],[-3,-9],[-10,-21],[-7,-10],[-8,-4],[-24,3],[-16,-5],[-7,-4],[-3,1],[-4,4],[-3,0],[-3,-7],[-4,-25],[-2,-5],[-5,-2],[-2,-7],[-1,-8],[-2,-7],[-3,-3],[-19,-8],[-23,-41],[-6,-7],[-2,4],[-2,6],[-5,-1],[-8,-7],[-5,3],[-4,6],[-4,4],[-5,-3],[-4,-7],[-4,3],[-6,14],[-3,3],[-5,1],[-5,-3],[-3,-10],[-2,-4],[-2,-4],[-2,1],[-1,5],[1,7],[3,12],[2,13],[0,12],[-1,22],[2,8],[3,11],[7,15],[11,12],[3,6],[2,2],[8,4],[2,2],[18,27],[4,14],[-5,14],[-4,7],[-4,5],[-5,3],[-5,1],[-5,-4],[-7,-14],[-4,2],[-2,10],[0,12],[1,41],[2,9],[8,13],[5,10],[2,11],[1,12],[0,14],[-1,6],[-3,12],[-1,8],[1,5],[1,3],[2,2],[1,3],[1,12],[0,54],[1,12],[3,11],[5,11],[8,11],[2,4],[6,24],[2,6],[2,1],[1,1],[3,2],[1,3],[2,7],[1,3],[1,0],[3,-1],[1,1],[7,28],[3,4],[1,4],[10,24],[4,16],[3,6],[4,3],[4,1],[7,-33],[6,-14],[7,-3],[3,4],[4,17],[3,6],[4,4],[3,1],[3,-4],[3,-7],[2,-8],[2,-10],[2,-10],[1,-10],[0,-4],[-1,-11],[0,-3],[1,-8],[0,-1],[1,2],[2,2],[5,1],[3,2],[3,5],[2,8],[0,6],[-1,10],[0,4],[1,5],[2,8],[1,4],[0,18],[2,6],[1,1],[1,0],[2,3],[6,15],[4,15],[1,2],[1,2],[1,5],[1,21],[3,33],[0,12],[3,0],[11,1],[10,4],[9,9],[14,25],[1,4],[0,5],[2,14],[1,3],[1,1],[15,12],[2,3],[4,14],[8,6],[4,5],[6,4],[6,11],[5,8],[0,-15],[-2,-20],[-1,-10],[1,-9],[2,-7],[3,-6]],[[5365,1384],[4,-5],[4,4],[2,11],[0,12],[4,3],[6,0],[5,-5],[0,-10],[-7,-11],[-2,-7],[0,-8],[-3,-2],[-3,0],[-3,-3],[-1,-7],[0,-11],[4,-10],[0,-12],[-1,-5],[-3,-13],[-1,-5],[-2,1],[-2,4],[-2,6],[-2,6],[-1,3],[-3,-3],[-2,-4],[-2,-1],[-2,2],[-2,5],[2,17],[1,6],[3,2],[-1,5],[-1,2],[4,5],[3,6],[1,6],[-4,4],[1,13],[-4,23],[1,13],[5,-9],[1,-4],[1,-5],[1,-14],[1,-5]],[[5960,1486],[-7,-9],[-6,13],[-1,18],[3,10],[6,-2],[5,-5],[2,-10],[-2,-15]],[[5320,1490],[3,-4],[10,4],[4,-1],[2,-2],[1,-2],[2,-6],[1,-5],[-1,-3],[-1,-2],[-1,-2],[0,-8],[2,-5],[2,-5],[2,-8],[-3,-2],[-1,-6],[1,-6],[-1,-3],[-7,-1],[-3,1],[-2,11],[-2,4],[-2,-4],[-3,-11],[-2,-3],[-4,0],[2,-8],[1,-3],[2,0],[1,6],[2,-4],[-2,-14],[-2,-7],[-1,-1],[-3,3],[-1,-6],[-2,-15],[1,-7],[1,-11],[2,-11],[2,-7],[-5,-4],[-10,12],[-4,-8],[-2,3],[2,0],[-1,7],[1,8],[4,20],[1,5],[-1,15],[0,4],[-2,2],[-1,0],[-1,2],[0,17],[-1,15],[1,5],[1,6],[2,0],[3,-1],[1,1],[0,1],[2,11],[0,5],[-1,19],[2,4],[0,9],[-3,17],[2,1],[7,10],[1,-9],[1,-12],[1,-11]],[[6125,1519],[2,-8],[0,-10],[-3,-8],[-9,-7],[-19,-3],[-6,-10],[-12,-46],[-5,-11],[-3,-2],[-3,2],[-4,13],[6,40],[19,39],[2,1],[2,-2],[3,-1],[2,1],[7,7],[3,0],[4,-1],[2,1],[2,2],[4,5],[1,1],[5,-3]],[[5812,1566],[-5,-2],[-3,6],[-4,21],[2,3],[2,3],[1,4],[3,2],[5,-3],[2,-11],[0,-13],[-3,-10]],[[6151,1628],[6,-9],[1,3],[2,1],[2,-3],[2,-5],[0,-7],[-1,-5],[-1,-3],[-1,-3],[-2,-41],[-1,-10],[-7,-12],[-9,0],[-18,8],[-18,-10],[-9,-1],[-5,11],[1,20],[3,15],[20,44],[3,5],[3,4],[7,5],[4,0],[7,0],[6,-2],[5,-5]],[[6293,1629],[-1,-12],[-1,-4],[-3,-3],[-9,-6],[-14,-1],[-5,-3],[-3,-7],[-2,-10],[-3,-20],[-5,-22],[-9,-25],[-3,-2],[-1,7],[-2,8],[-1,5],[-3,-4],[-4,-9],[-3,-11],[-2,-7],[-1,-3],[-3,-2],[-2,-3],[-1,-6],[1,-6],[8,-26],[-3,-12],[-3,-6],[-4,-2],[-5,0],[-2,4],[-5,17],[-2,7],[-10,-28],[-2,-2],[-3,-9],[-2,-2],[-3,1],[-2,2],[-3,10],[-8,15],[-5,5],[-3,-8],[-2,-2],[-2,-2],[-2,0],[-1,0],[-3,4],[-1,2],[-1,2],[-1,-2],[-1,-2],[-2,0],[-2,13],[5,18],[14,26],[9,24],[3,4],[3,2],[18,21],[3,5],[1,4],[-1,12],[-2,6],[-8,2],[-14,0],[-1,8],[3,9],[4,9],[3,4],[3,-2],[4,-4],[3,-1],[2,6],[3,0],[4,13],[4,3],[5,-1],[6,-3],[-1,-4],[0,-10],[-1,-6],[-1,-6],[-6,-15],[-2,-12],[0,-9],[2,-7],[4,-4],[5,-2],[4,1],[4,5],[1,13],[-2,8],[-3,7],[-1,7],[4,6],[3,-8],[3,1],[2,8],[1,11],[-1,8],[-2,5],[-1,5],[1,6],[1,4],[2,3],[2,1],[1,0],[2,-4],[0,-4],[0,-5],[1,-3],[3,-2],[4,0],[2,3],[-1,7],[0,4],[5,3],[4,8],[4,9],[4,5],[1,0],[2,3],[1,1],[2,-2],[0,-2],[1,-3],[0,-2],[1,-1],[4,-8],[2,-3],[3,-3],[5,-2],[9,-3],[2,-3],[1,-7]],[[6356,1548],[-3,-12],[-2,-13],[-1,-25],[-3,-14],[-2,-13],[-3,-10],[-4,-6],[-4,-6],[-5,-3],[-5,-1],[-5,2],[-2,8],[1,22],[-1,11],[-4,16],[-1,7],[-2,8],[-4,0],[-5,-4],[-9,-12],[-1,-1],[-2,-1],[-3,4],[1,7],[3,7],[1,3],[8,38],[4,14],[8,14],[4,5],[3,0],[3,-6],[1,-3],[2,-17],[0,-2],[0,-2],[3,-12],[1,-3],[2,-2],[0,12],[2,9],[7,12],[7,34],[4,12],[6,25],[4,8],[0,4],[2,4],[3,2],[3,-3],[2,-6],[3,-16],[-3,-22],[-1,-13],[2,-11],[0,-12],[-4,-12],[-8,-15],[-3,-10]],[[6429,1696],[4,-9],[1,-26],[3,-10],[9,16],[4,6],[5,3],[19,4],[27,-6],[9,6],[1,2],[1,2],[1,1],[3,-1],[1,-2],[1,-2],[2,-3],[3,-1],[10,4],[8,-1],[1,1],[1,-2],[3,-7],[4,-19],[2,-7],[2,-10],[-1,-51],[0,-11],[-3,-8],[-5,-3],[-5,-1],[-12,-7],[-19,-4],[-37,-18],[-8,-1],[-12,4],[-2,0],[-3,-1],[-2,-3],[-5,-8],[-4,-3],[-5,-5],[-4,-2],[-2,-3],[-1,-1],[-1,1],[-3,6],[-1,2],[-4,1],[-1,0],[-2,-1],[-6,-8],[-1,-1],[-1,-2],[-2,-4],[-1,-4],[-2,-2],[-2,2],[-3,8],[-2,2],[-1,-1],[-4,-5],[-1,-2],[-3,3],[-1,4],[-1,6],[-2,6],[-1,9],[3,10],[7,15],[2,8],[4,22],[1,9],[14,22],[6,2],[3,2],[1,2],[3,8],[2,4],[1,4],[0,4],[-2,2],[-5,-3],[-5,-5],[-16,-20],[-6,2],[1,26],[2,6],[3,5],[3,7],[1,9],[1,8],[2,7],[2,7],[3,3],[5,-3],[10,5],[5,-1]],[[6085,1679],[-2,-22],[7,-38],[3,-10],[1,-6],[0,-5],[0,-14],[-2,-8],[-4,-4],[-12,-2],[-5,-3],[-4,-8],[-1,-15],[1,-23],[0,-12],[-1,-8],[-4,-1],[-6,5],[-5,6],[-2,5],[0,5],[-2,-1],[-1,-5],[-1,-8],[0,-11],[0,-5],[1,-5],[9,-39],[0,-19],[-9,-16],[-2,-1],[-11,-4],[-1,-2],[-3,-7],[-1,-1],[-8,3],[-2,-1],[-5,-7],[-1,-4],[-2,0],[-16,-10],[-3,-4],[-6,-18],[-2,-4],[-15,-13],[-9,-4],[-22,2],[-4,-1],[-5,-5],[-2,-1],[-6,8],[-14,6],[-10,-3],[-8,-13],[-8,-16],[-8,-13],[-28,-21],[-9,-12],[-9,-15],[-3,-3],[-2,1],[-3,1],[-2,1],[-3,2],[-4,6],[-4,6],[-2,6],[-3,-8],[-3,-21],[-3,-4],[-1,5],[-3,26],[-2,10],[-8,11],[-9,2],[-9,-1],[-9,3],[-8,8],[-6,2],[-4,-3],[-2,-12],[1,-14],[1,-13],[0,-11],[-8,-20],[-9,-1],[-19,16],[-10,-2],[-8,-8],[-13,-19],[-4,-2],[-12,2],[-7,7],[-1,2],[-6,-1],[-2,1],[-3,7],[-10,27],[-1,8],[-2,15],[-3,7],[-5,2],[-4,-5],[-3,-8],[-1,-10],[-2,-7],[-4,-3],[-4,2],[-4,4],[-2,6],[-4,3],[-2,1],[-5,-1],[-2,0],[-4,11],[-1,2],[-4,12],[-1,4],[-2,2],[-2,1],[-4,1],[-5,-2],[-9,-5],[-5,-1],[-7,4],[-3,0],[-2,-1],[-2,-2],[-3,0],[-2,3],[-13,-21],[-10,1],[-7,4],[-5,7],[-9,21],[-3,4],[-5,0],[-3,-1],[-8,-11],[-8,-6],[-18,-9],[-6,-11],[-1,0],[-1,0],[0,-2],[0,-4],[1,-6],[0,-3],[-2,-4],[-3,-3],[-3,-1],[-1,6],[-2,33],[-2,2],[-2,-1],[-3,1],[-4,6],[-4,7],[-2,10],[-2,14],[0,85],[1,16],[3,13],[11,31],[0,13],[-1,15],[0,20],[6,-18],[5,-10],[2,2],[1,1],[7,10],[1,1],[2,1],[1,-2],[2,-5],[2,5],[2,8],[1,12],[1,2],[0,8],[1,2],[2,1],[2,-2],[1,-2],[2,-1],[0,1],[1,1],[2,1],[1,1],[2,-2],[1,-6],[1,0],[3,4],[1,6],[1,9],[1,9],[1,-2],[2,-6],[2,-4],[1,0],[3,13],[7,20],[2,10],[2,3],[14,14],[22,-3],[3,4],[4,19],[2,5],[4,-3],[1,-8],[1,-10],[2,-7],[6,-2],[8,14],[5,-6],[2,-5],[3,-4],[3,-3],[3,2],[1,7],[0,8],[-1,13],[9,-9],[4,-7],[2,-10],[2,-8],[12,-18],[4,-4],[14,5],[4,-4],[4,-4],[5,-3],[8,-2],[10,3],[5,0],[4,-6],[5,-18],[3,-9],[5,-7],[11,-11],[4,-1],[5,0],[2,-2],[2,-4],[2,-3],[6,1],[2,0],[2,-3],[1,-5],[1,-3],[3,-2],[2,0],[4,-2],[2,-2],[2,-6],[6,-22],[5,-6],[9,-28],[6,-6],[4,2],[2,4],[3,3],[5,-1],[4,-4],[1,-4],[1,-6],[0,-5],[2,-1],[3,4],[1,3],[8,13],[2,2],[0,11],[0,6],[2,0],[5,-3],[-1,12],[0,15],[2,12],[3,5],[3,-3],[9,-23],[4,1],[12,11],[4,3],[3,-2],[1,-2],[1,-1],[3,0],[1,2],[5,10],[3,-6],[5,-4],[4,-1],[9,11],[2,4],[0,6],[1,3],[8,3],[2,3],[2,5],[1,4],[3,1],[2,-3],[2,-6],[1,-5],[-4,-7],[0,-11],[0,-12],[3,-9],[2,-1],[5,2],[2,-1],[3,-3],[4,-7],[3,-2],[3,-4],[20,-44],[6,-9],[6,-1],[36,17],[6,6],[5,11],[3,14],[-1,14],[-1,4],[-4,2],[-1,2],[-1,5],[0,4],[1,3],[0,6],[2,6],[12,13],[3,7],[8,27],[3,5],[9,1],[3,4],[4,-4],[4,3],[3,6],[4,3],[5,2],[3,5],[4,17],[6,11],[13,12],[14,41],[2,7],[-3,6],[-5,4],[-9,1],[-5,-4],[-5,-6],[-4,-8],[-4,-9],[-1,1],[-8,-3],[-2,2],[0,5],[1,9],[6,26],[1,9],[1,14],[3,8],[8,13],[4,9],[2,2],[3,0],[2,-3],[2,-10],[2,-3],[3,-2],[4,-6],[6,-12],[4,-9],[1,-8]],[[5829,2126],[-7,-8],[-4,1],[-1,13],[0,9],[1,9],[2,7],[3,5],[8,6],[4,-14],[0,-19],[-6,-9]],[[5625,2203],[20,-5],[12,1],[7,-3],[4,-10],[-2,-11],[-7,-6],[-7,-1],[-4,4],[-3,7],[-14,6],[-4,5],[-3,-4],[-6,-1],[-5,1],[-3,4],[-2,5],[0,5],[0,5],[2,4],[3,4],[4,-2],[8,-8]],[[5598,2321],[2,-1],[4,10],[2,2],[0,-10],[0,-10],[-2,-16],[-1,-8],[-6,-3],[-8,1],[-5,5],[0,-9],[-3,-6],[-8,11],[-2,14],[0,8],[-5,-2],[-4,4],[-4,-2],[-1,13],[2,3],[5,-7],[5,6],[1,15],[0,13],[1,14],[3,-5],[4,-2],[5,-20],[11,-14],[4,-4]],[[5542,2677],[-2,-3],[-1,25],[-2,19],[-1,11],[2,65],[-1,6],[-1,3],[-3,2],[-1,4],[0,7],[0,6],[-3,19],[0,5],[1,7],[3,12],[1,8],[0,35],[-2,61],[1,80],[2,25],[3,20],[2,2],[2,-2],[1,-4],[1,-6],[-1,-13],[2,-10],[2,-8],[1,-10],[1,-13],[5,-37],[2,-25],[1,-25],[0,-26],[-1,-26],[-5,-37],[-1,-13],[1,-32],[0,-23],[-2,-29],[-1,-9],[-3,-13],[0,-11],[1,-23],[-2,-12],[-2,-12]],[[5783,4746],[-13,-21],[-5,-5],[-3,-2],[-3,-1],[-2,2],[-10,15],[-18,39],[-15,29],[-4,4],[-4,3],[-4,1],[-4,-1],[-9,-4],[-8,-7],[-9,-15]],[[5672,4783],[0,4],[-1,19],[-2,12],[-3,-6],[-1,0],[-1,6],[-2,16],[-2,6],[-2,-5],[-1,-12],[-1,-3],[-2,0],[-2,4],[-2,5],[0,5],[1,8],[3,2],[3,3],[2,14],[3,-3],[3,4],[3,15],[1,-2],[0,-1],[1,0],[1,-1],[-7,35],[-3,5],[0,3],[-1,4],[-3,8],[-3,3],[-26,11],[-3,-1],[-2,-2],[-2,0],[-2,5],[-2,6],[-2,4],[-2,2],[-3,2],[-6,0],[-3,-4],[-3,-5],[-3,-3],[-4,-1],[-4,-3],[-12,-17],[-3,-2],[-5,-1],[-4,-4],[-2,-8],[-2,-11],[-2,-10],[-3,-9],[-55,-92],[-8,-20],[-5,-8],[-6,-5],[1,-7],[4,-11],[1,-8],[0,-7],[1,-7],[1,-6],[2,-2],[2,-7],[4,-31],[2,-11],[-2,-2],[-1,-2],[-2,-8],[5,-12],[4,-6],[11,-10],[6,-11],[1,-4],[0,-5],[1,-8],[2,-8],[1,-5],[4,2],[-1,-7],[-2,-10],[-2,-7],[1,-6],[0,-7],[0,-6],[-1,-10],[-1,-22],[0,-6],[2,-12],[0,-6],[0,-6],[-1,-10],[-1,-30],[1,-10],[4,-27],[0,-11],[0,-50],[1,-4],[4,-10],[1,-23],[-4,-22],[-9,-36],[-4,-20],[-2,-20],[-1,-21],[-1,-100],[1,-10],[5,-21],[1,-9],[0,-24],[-1,-6],[-1,-12],[0,-7],[0,-8],[3,-18],[0,-21],[-6,-34],[2,-22],[5,-17],[2,-11],[-1,-10],[-1,-10],[0,-16],[1,-15],[1,-10],[3,-11],[6,-20],[2,-11],[-1,-6],[-2,-5],[-4,-10],[-1,-4],[-4,-59],[0,-14],[-2,-10],[-5,-4],[-5,-1],[-3,-3],[-4,-17],[-1,-72],[-5,-70],[-1,-14],[-3,-9],[9,-36],[2,-11],[3,-23],[2,-9],[10,-32],[1,-9],[0,-11],[10,-92],[1,-23],[0,-5],[5,-16],[0,-11],[-1,-4],[-6,8],[-3,-2],[-8,24],[-1,6],[-1,7],[-3,19],[-2,5],[-5,2],[-6,-5],[-5,-8],[-5,-5],[-9,-4],[-2,-2],[-5,-11],[-4,-5],[-9,-6],[-4,-5],[-1,3],[-1,1],[-3,0],[-14,7],[-3,3],[-2,5],[-6,1],[-6,-1],[-4,-3],[-3,-6],[-9,-24],[-2,-6],[0,-13],[-1,-5],[-5,-11],[-4,-8],[-7,-5],[-10,-2],[-11,4],[-6,11],[-1,11],[0,14],[-2,11],[-5,5],[-4,-6],[-3,-13],[-2,-8],[-4,7],[-1,7],[0,14],[0,7],[-2,6],[-2,4],[-2,4],[0,9],[-4,1],[-6,-3],[-4,-8],[3,-13],[-4,1],[-4,4],[-1,9],[-1,13],[1,5],[1,6],[1,6],[-1,7],[-1,5],[-3,11],[-7,29],[-5,22],[-1,24],[2,29],[2,18],[1,38],[1,12],[3,21],[2,19],[1,5],[2,4],[4,6],[2,4],[3,11],[1,11],[1,21],[3,20],[8,41],[1,20],[-7,76],[1,21],[1,3],[4,6],[1,3],[3,19],[1,8],[9,43],[2,9],[3,85],[4,41],[0,22],[0,6],[-1,10],[0,6],[-1,7],[-3,8],[0,6],[1,11],[4,23],[0,12],[-1,25],[-1,5],[-2,3],[0,2],[0,7],[2,9],[1,6],[0,6],[0,11],[0,7],[5,20],[1,9],[-4,4],[-5,-3],[-1,-6],[0,-11],[-2,-13],[-1,11],[-1,22],[-4,18],[-10,68],[-5,19],[-2,23],[-7,24],[0,8],[3,18],[3,33],[3,10],[3,12],[1,8],[-1,9],[-3,31],[0,4],[-1,2]],[[5325,4443],[-2,34],[-4,34],[-1,9],[0,22],[-1,22],[-1,3],[-2,6],[-5,18],[-1,5],[0,7],[0,6],[2,7],[2,3],[2,2],[2,-1],[3,-3],[2,-1],[4,2],[4,5],[7,15],[4,6],[5,5],[9,6],[3,4],[1,6],[-2,8],[-6,22],[-14,90],[-1,12],[0,11],[0,12],[1,12],[0,8],[0,7],[-6,26],[4,5],[6,2],[4,1],[4,-1],[9,-6],[5,-1],[14,12],[9,12],[2,6],[2,8],[0,4],[0,4],[-2,4],[-1,5],[-1,6],[0,7],[1,11],[1,7],[-8,28],[-1,23],[1,15],[-1,9],[-1,7],[-3,8],[0,6],[0,7],[3,15],[0,10],[0,7],[-2,8],[-3,10],[-8,18],[-2,3],[-5,6],[-3,4],[0,5],[0,8],[1,11],[0,29],[1,11],[3,10],[23,56],[3,3],[2,-1],[3,0],[2,4],[3,7],[3,8],[10,54]],[[5408,5348],[8,10],[12,21],[18,24],[5,5],[7,1],[12,-5],[29,-23],[7,-2],[5,2],[1,5],[1,5],[2,13],[2,7],[2,5],[5,2],[4,-6],[5,-11],[23,-94],[8,-25],[8,-22],[30,-67],[9,-13],[118,-65],[11,-9],[11,-14],[5,-9],[4,-9],[12,-39],[13,-32],[7,-11],[23,-31],[4,-11],[3,-11],[2,-14],[2,-15],[0,-13],[0,-12],[-1,-12],[-1,-11],[-3,-14],[-34,-94],[-4,-8]],[[5325,4443],[-1,1],[-5,4],[-2,4],[-5,-3],[-6,8],[-7,12],[-5,7],[-8,2],[-3,-1],[-1,-3],[-2,-7],[-9,-18],[-3,-6],[-4,-2],[-4,1],[-4,4],[-4,1],[-3,-2],[-5,-10],[-4,-3],[-16,-3],[-6,-9],[1,-21],[-3,2],[-2,9],[-2,1],[-2,-4],[-3,-13],[-2,-3],[-3,4],[-2,12],[-8,61],[-5,19],[-2,12],[-1,13],[-1,12],[1,12],[2,9],[0,10],[-4,21],[-2,40],[-2,13],[-1,5],[-2,4],[-2,3],[-2,4],[-1,7],[-1,6],[-2,12],[0,6],[1,4],[3,12],[2,3],[1,-1],[5,-6],[3,-1],[3,3],[1,9],[1,47],[2,18],[4,11],[0,8],[1,17],[-1,7],[-1,5],[-2,4],[-2,4],[-6,4],[-5,-2],[-9,-10],[0,13],[-2,25],[-1,13],[1,6],[3,12],[1,6],[0,26],[1,11],[2,13],[3,12],[4,5],[4,-4],[3,-8],[3,-7],[5,-1],[4,4],[10,18],[5,12],[5,8],[2,4],[2,6],[2,21],[3,11],[4,6],[4,5],[12,24],[1,7],[-1,37],[-2,15],[0,59],[1,6],[1,8],[1,8],[-2,8],[8,32],[3,17],[7,66],[4,16],[7,11],[5,3],[3,-2],[3,-3],[4,-2],[3,7],[1,14],[3,52],[0,8],[0,3],[-2,2],[-2,5],[-3,11],[-1,10],[-5,51],[0,25],[0,13],[5,22],[1,12],[-6,40],[-1,7],[-1,49],[-1,3],[0,4],[1,7],[2,4],[5,12],[1,6],[-1,12],[-4,26],[0,24],[4,18],[4,15],[5,12],[2,6],[2,8],[2,7],[3,3],[3,2],[4,7],[2,10],[1,23],[3,21],[2,34],[2,11],[2,8],[2,8],[2,25],[1,9],[3,7],[6,9]],[[5341,6011],[0,-1],[2,-25],[-2,-69],[1,-19],[1,-15],[5,-40],[1,-18],[-1,-11],[-2,-9],[-13,-23],[-4,-8],[-2,-11],[-3,-20],[0,-13],[2,-11],[3,-6],[3,-6],[26,-26],[3,-5],[3,-8],[2,-11],[3,-16],[3,-61],[2,-16],[2,-12],[9,-34],[6,-15],[6,-20],[4,-17],[1,-10],[0,-10],[-2,-17],[-3,-31],[0,-8],[0,-13],[1,-10],[2,-8],[2,-6],[2,-3],[4,-1]],[[2074,6269],[10,-30],[1,-9],[-1,-12],[-4,-10],[-9,-16],[-1,-12],[-1,-29],[-3,-10],[-7,0],[-7,15],[-5,8],[-6,-23],[-2,-23],[-2,-4],[-4,-1],[-3,49],[-2,21],[-2,8],[-3,-1],[-12,33],[-1,9],[2,8],[3,20],[2,7],[6,13],[3,8],[1,11],[2,0],[1,-10],[-2,-24],[1,-14],[1,0],[1,12],[1,12],[1,0],[5,-8],[8,11],[11,30],[4,-10],[2,-3],[5,-5],[1,-3],[2,-4],[2,-9],[1,-5]],[[2062,6322],[-1,-2],[-2,1],[-2,-1],[-3,-4],[-2,-1],[-6,1],[-3,4],[-1,8],[1,9],[4,3],[12,4],[2,-2],[1,-4],[1,-5],[0,-5],[-1,-6]],[[2083,6509],[7,-7],[12,-30],[1,-6],[-7,-5],[0,-5],[1,-5],[2,-4],[1,-2],[2,3],[2,3],[2,1],[3,-5],[6,-18],[4,-26],[3,-10],[4,-4],[6,1],[2,5],[-1,9],[2,13],[5,5],[6,-16],[11,-42],[18,-26],[-2,-8],[-4,2],[-6,6],[-4,2],[-4,-6],[0,-7],[3,-8],[1,-11],[-12,14],[-4,2],[-3,2],[-4,11],[-12,15],[-3,9],[-3,9],[-3,7],[-5,3],[-9,-1],[-3,-2],[-4,-5],[-5,-10],[-2,-2],[-1,0],[-4,4],[-1,-2],[-2,-5],[-1,-3],[-3,-8],[-2,-2],[-3,1],[-1,2],[0,4],[-1,5],[-3,9],[-2,4],[-3,3],[-5,0],[-3,2],[-1,3],[-1,6],[0,8],[0,6],[1,3],[3,5],[9,19],[3,13],[2,14],[1,49],[3,17],[5,-11],[0,4],[1,8],[0,4],[1,-7],[4,-6]],[[2051,6591],[11,-38],[1,-7],[-2,-3],[-2,-1],[-2,0],[2,-11],[1,-6],[0,-7],[-1,0],[-4,14],[-10,26],[-3,17],[2,0],[1,-3],[1,-2],[2,-3],[-1,4],[-3,22],[0,7],[0,5],[1,3],[2,-2],[1,-5],[3,-10]],[[2066,6642],[5,-10],[-1,2],[1,2],[1,2],[0,1],[1,0],[1,-2],[31,-91],[4,-16],[-1,-6],[-4,2],[-5,9],[-5,11],[-1,4],[-2,15],[-1,2],[-3,-9],[-2,6],[-4,14],[-2,7],[-1,4],[0,9],[-1,2],[-2,0],[-1,0],[-1,2],[-2,3],[-1,4],[0,7],[-1,4],[-5,16],[-2,5],[0,7],[2,-3],[2,-3]],[[2045,6678],[-2,-1],[-1,2],[-1,3],[-1,9],[-1,2],[-1,1],[-2,2],[-5,21],[-2,3],[0,1],[2,2],[1,1],[1,-2],[4,-8],[6,-9],[3,-6],[1,-7],[-1,-7],[-1,-7]],[[1846,6875],[-2,-4],[-4,2],[0,8],[1,10],[1,4],[1,4],[3,16],[2,4],[2,-2],[1,-5],[0,-6],[-1,-7],[-2,-16],[-2,-8]],[[2018,6889],[-3,-15],[-2,5],[-1,6],[-3,14],[-6,17],[-1,7],[6,-8],[6,-12],[4,-14]],[[2118,6931],[-2,-3],[-2,3],[-2,10],[1,6],[3,0],[3,-7],[-1,-9]],[[2090,6964],[-1,-7],[-3,-1],[-7,4],[-3,0],[-3,-3],[-7,-9],[0,14],[3,8],[4,5],[5,1],[9,-2],[3,-4],[0,-6]],[[2015,6970],[0,-14],[1,-10],[1,-10],[3,-13],[-3,0],[-2,-3],[-2,-1],[-2,2],[-5,8],[-4,2],[-2,3],[-3,11],[-1,11],[2,9],[4,7],[4,-3],[2,0],[1,5],[1,2],[2,1],[2,-2],[1,-5]],[[1895,6957],[-2,-2],[-3,2],[-1,5],[-2,10],[-4,19],[0,10],[7,-15],[4,-10],[2,-11],[-1,-8]],[[2095,6981],[-3,0],[-1,3],[1,3],[1,7],[1,12],[2,5],[3,-7],[0,-7],[0,-3],[0,-5],[-1,-4],[-1,-2],[-2,-2]],[[1852,6976],[-1,-12],[-7,26],[-3,6],[-8,7],[-3,6],[-1,12],[2,-4],[13,-13],[2,-3],[1,-4],[2,-4],[1,-5],[1,-6],[1,-6]],[[1942,6963],[-2,-3],[-2,1],[-2,5],[-4,17],[-1,5],[-8,10],[-1,4],[-1,5],[-5,18],[0,3],[9,-5],[8,-14],[6,-18],[3,-19],[0,-9]],[[1837,6893],[-5,-6],[-4,6],[-3,12],[-2,12],[-2,6],[-8,33],[-1,12],[-1,12],[1,8],[2,12],[1,20],[3,8],[3,2],[4,-5],[2,-10],[1,-10],[3,-9],[7,-7],[2,-7],[4,-18],[3,-8],[1,-5],[0,-8],[-6,-34],[-5,-16]],[[1920,6959],[-1,-2],[-2,0],[-1,2],[-4,9],[-8,12],[-4,11],[-4,14],[0,16],[3,12],[2,-3],[4,-3],[2,-2],[5,-17],[3,-6],[3,-15],[2,-17],[0,-11]],[[1842,7024],[-2,-6],[-3,0],[-3,3],[-2,4],[-1,6],[-2,3],[-2,5],[-1,4],[10,6],[2,-1],[2,-6],[2,-9],[0,-9]],[[1993,7027],[2,-2],[9,0],[4,-2],[3,-5],[2,-8],[-2,-9],[-2,-6],[-2,-4],[-11,-14],[-3,-1],[-2,4],[-1,8],[-1,17],[-2,7],[-3,5],[-6,3],[-3,5],[2,8],[-1,23],[1,9],[3,2],[3,-5],[6,-19],[2,-5],[0,-6],[2,-5]],[[1935,7099],[7,-6],[3,-5],[2,-7],[1,-9],[0,-8],[-2,-4],[-3,-3],[-3,0],[-2,0],[-2,2],[-12,18],[-2,5],[-2,8],[0,7],[1,6],[3,1],[4,-6],[0,5],[1,11],[3,-10],[3,-5]],[[2138,7071],[-2,-2],[-1,6],[0,7],[0,9],[-1,4],[-7,15],[2,4],[2,-3],[5,-2],[3,-3],[-1,-8],[1,-4],[1,-4],[0,-4],[1,-5],[-1,-4],[-1,-3],[-1,-3]],[[2739,7101],[-6,-17],[-4,-6],[-2,3],[0,4],[1,3],[1,4],[0,6],[-1,2],[-2,-1],[-2,1],[-1,6],[0,6],[2,4],[2,2],[3,0],[5,-7],[3,-5],[1,-5]],[[1834,7103],[0,-4],[0,-3],[0,-3],[-1,-3],[-3,0],[-4,3],[-6,8],[-5,-3],[-3,9],[-6,25],[0,7],[2,11],[2,11],[2,5],[1,2],[4,5],[2,1],[3,-1],[1,-5],[-1,-6],[0,-7],[1,-14],[1,-8],[1,-5],[2,-2],[2,-1],[2,-2],[0,-2],[0,-3],[0,-3],[0,-3],[1,-2],[1,-4],[1,-3]],[[1988,7178],[0,-12],[-4,-42],[-2,1],[-4,9],[0,-4],[0,-4],[0,-4],[2,-4],[-2,-3],[-1,-3],[-1,-5],[-1,-6],[0,-2],[0,-7],[0,-2],[-1,-1],[-2,1],[-1,0],[-5,-4],[-4,3],[-8,12],[-2,1],[-4,-2],[-3,1],[-1,3],[-7,22],[-2,12],[-1,11],[2,6],[2,-3],[4,-9],[2,-1],[2,4],[-1,5],[-1,6],[-1,12],[0,4],[0,2],[2,4],[3,0],[4,-4],[2,-1],[3,7],[2,20],[3,6],[2,-4],[6,-21],[4,-8],[1,8],[0,7],[-1,8],[-2,6],[3,4],[3,1],[2,-2],[3,-3],[2,-6],[1,-3],[1,-4],[1,-12]],[[2084,7213],[-1,-22],[0,-10],[2,-11],[11,-12],[1,-5],[1,-10],[2,-29],[-3,-13],[-1,-7],[1,-12],[1,-17],[0,-4],[1,-3],[-1,-5],[-2,-6],[-2,-2],[-3,-1],[-2,-4],[0,-6],[-1,-8],[-2,-28],[-8,-3],[-18,17],[1,10],[-1,10],[-3,9],[-4,4],[0,4],[5,0],[2,1],[2,3],[-1,5],[-3,2],[-5,1],[-5,4],[-1,5],[0,7],[1,4],[8,5],[-1,6],[0,5],[1,9],[1,0],[2,5],[2,4],[-3,3],[-1,2],[-2,8],[-2,2],[-3,-1],[-1,-2],[-10,-14],[-3,-2],[-5,-1],[-2,-2],[-3,-8],[-2,-2],[-8,-1],[-2,1],[-6,8],[0,11],[0,12],[-2,11],[0,11],[5,9],[10,10],[3,4],[1,4],[2,9],[1,6],[0,5],[1,4],[4,1],[4,-3],[3,1],[1,8],[1,6],[3,-1],[5,-7],[9,-6],[7,1],[6,6],[7,11],[0,7],[1,3],[3,-3],[1,-13]],[[3054,8005],[10,-1],[2,-3],[2,-5],[-1,-4],[-4,-7],[-3,-5],[-6,-5],[-5,-1],[-4,7],[1,8],[2,5],[0,5],[-4,6],[-1,0],[-2,-5],[-1,-1],[-2,1],[-1,2],[-1,3],[0,3],[1,7],[2,3],[3,1],[3,-1],[2,-3],[5,-8],[2,-2]],[[2443,8123],[-1,-3],[-1,5],[-3,10],[-2,14],[-1,9],[-2,8],[1,5],[3,2],[2,-3],[2,-6],[1,-8],[1,-19],[0,-9],[0,-5]],[[3009,8190],[-1,-3],[-2,1],[-3,5],[-4,10],[-3,6],[-2,3],[0,4],[0,1],[5,7],[3,8],[4,8],[1,7],[1,8],[0,8],[3,17],[6,0],[4,-12],[-3,-18],[0,-6],[1,-23],[0,-9],[-2,-2],[-4,-4],[-2,-3],[-1,-3],[-1,-10]],[[2775,8266],[-3,-1],[-2,3],[1,17],[5,8],[5,0],[2,-6],[2,-12],[-1,-5],[-9,-4]],[[2342,8265],[1,0],[2,2],[0,4],[0,4],[2,2],[3,-1],[6,-5],[2,-3],[-1,-8],[-2,0],[0,5],[-1,0],[-5,-43],[-2,-4],[-3,5],[-1,-1],[-2,-4],[-10,-10],[1,-5],[1,-2],[2,-1],[2,0],[1,-2],[1,-4],[0,-5],[-1,-2],[-2,-1],[-3,-2],[-3,-1],[-2,2],[-2,5],[-1,6],[-1,7],[0,7],[0,7],[2,14],[1,14],[3,15],[0,5],[-2,7],[-5,8],[-2,5],[2,5],[1,8],[0,9],[-2,7],[3,3],[2,-10],[1,-2],[0,-1],[4,-5],[1,-2],[0,-10],[0,-9],[0,-7],[4,-3],[1,0],[4,-3]],[[2442,8412],[4,-7],[4,-11],[2,-10],[0,-54],[-1,0],[-5,16],[-3,-4],[-2,4],[-2,6],[-3,2],[1,4],[0,3],[0,4],[0,5],[-2,30],[0,11],[4,0],[3,1]],[[2454,8465],[0,-21],[0,-5],[-2,-5],[-1,2],[0,6],[0,7],[-1,2],[-1,1],[-1,-1],[0,-2],[0,-4],[2,-16],[1,-4],[1,-4],[-1,-6],[-11,16],[1,2],[1,4],[0,10],[2,12],[0,12],[2,11],[3,10],[5,4],[1,-6],[-1,-25]],[[2892,8921],[13,-42],[5,-11],[1,-4],[1,-8],[0,-16],[1,-8],[-2,-7],[-4,-5],[-2,-6],[-1,-10],[2,3],[2,-2],[3,-10],[3,6],[0,-6],[-4,-31],[-2,-7],[-9,-32],[-1,-9],[-1,-10],[-1,-18],[-2,-5],[-4,-5],[-3,-1],[-7,2],[-3,-1],[-3,-3],[-6,-11],[-3,-2],[-2,2],[-7,14],[-8,9],[-2,3],[5,17],[1,6],[0,7],[2,3],[2,0],[1,-1],[4,4],[1,8],[1,9],[3,4],[3,0],[3,-1],[2,-3],[3,-8],[6,-20],[3,-4],[0,8],[-4,28],[-1,1],[-2,9],[0,2],[-2,1],[-7,-1],[-6,2],[-16,17],[-7,4],[-2,2],[-2,5],[-2,8],[-3,19],[-1,5],[0,9],[-1,5],[-1,3],[-2,3],[-1,3],[0,4],[0,14],[0,6],[-2,3],[-1,2],[-1,4],[1,5],[2,8],[5,17],[2,4],[2,0],[2,0],[2,2],[2,4],[3,10],[1,2],[2,3],[16,44],[3,14],[3,10],[3,9],[3,5],[4,-8],[2,-12],[0,-30],[1,-17],[3,-11],[8,-15]],[[2824,9278],[-3,-4],[-5,0],[-2,2],[-2,2],[-1,2],[0,2],[0,3],[1,4],[3,5],[3,5],[3,6],[1,7],[0,4],[1,5],[2,4],[1,1],[2,-2],[0,-5],[-1,-4],[-1,-5],[-1,-21],[-1,-11]],[[6109,7054],[1,-4],[5,-24],[5,-9],[3,-3],[10,-15],[2,-6],[2,-5],[0,-4],[0,-17],[5,-29],[2,-6],[3,-7],[7,-11],[5,-17],[25,-31],[5,-15],[4,-17],[3,-38],[1,-20],[0,-18],[-2,-19],[-5,-37],[-2,-13]],[[6188,6689],[-3,-1],[-8,-6],[-4,-2],[-21,7],[-7,7],[-3,1],[-2,1],[-1,3],[-1,8],[-1,2],[-2,4],[-5,22],[-1,2],[-4,0],[-1,2],[-1,3],[-6,27],[-9,27],[-4,13],[-1,0],[-3,-9],[-5,-5],[-12,-5],[-32,5],[-20,-6],[-9,1],[-3,3],[-4,16],[-3,5],[1,-18],[0,-8],[-3,-3],[-4,1],[-3,3],[-2,5],[-3,3],[-4,1],[-53,0],[-2,-1],[-5,-6],[-2,-1],[-16,0],[-2,0],[-2,-2],[-4,-5],[-1,-1],[-5,1],[-9,5],[-14,1],[-4,-3],[-3,-13],[-5,-4],[-20,-7],[-11,-1],[-9,-5],[-3,1],[-1,3],[-10,40],[-4,9],[-6,5],[-3,0],[-7,-4],[-1,-1],[-3,4],[-2,5],[-1,6],[-2,6],[-1,-7],[-2,-4],[-3,-1],[-4,0],[-2,2],[-2,3],[-2,-1],[-2,-8],[-1,-8],[0,-8],[-1,-6],[-3,-2],[-4,-1],[-3,-1],[-2,-3],[-2,-3],[-4,7],[-3,1],[-3,-3],[-8,-3],[-4,-6],[-2,0]],[[5726,6778],[2,13],[0,7],[-1,33],[0,9],[-1,5],[-1,1],[-1,0],[-1,0],[-1,-1],[-2,-1],[-1,0],[-2,1],[-3,4],[-5,2],[-3,4],[-3,9],[-3,11],[-12,35],[12,13],[2,4],[2,6],[2,6],[2,17],[2,9],[4,14],[2,8],[3,6],[9,14],[3,3],[4,3],[4,1],[6,-1],[9,-6],[3,-2],[1,-1],[3,0],[3,1],[9,9],[13,9],[4,5],[6,8],[14,12],[26,30],[3,3],[2,0],[3,-1],[3,-2],[22,-21],[12,5],[20,26],[12,21],[1,3]],[[5914,7112],[5,-9],[3,-2],[2,1],[4,3],[3,1],[1,-1],[2,-3],[1,-1],[1,1],[2,6],[1,2],[3,0],[10,-9],[5,1],[10,6],[2,0],[7,-15],[9,-9],[9,-5],[12,-3],[5,-5],[4,-7],[1,-9],[2,-7],[5,-7],[8,-8],[2,-4],[1,-4],[1,-3],[3,-1],[2,-2],[1,-9],[5,-4],[5,-14],[4,-4],[9,18],[4,2],[2,4],[5,29],[1,3],[2,5],[1,4],[0,10],[1,7],[1,3],[5,0],[3,-1],[15,-15],[5,-4],[0,1]],[[1375,5146],[-7,69],[-9,58],[-3,14],[-2,9],[-7,15],[-4,9],[-3,16],[-7,33],[-3,32],[-2,35],[-1,60],[8,-4],[4,2],[4,-4],[4,-7],[5,-1],[38,16],[3,-7],[7,-2],[3,3],[3,6],[5,22],[4,15],[9,20],[18,37],[5,14],[2,11],[3,18],[0,5],[-1,4],[-1,5],[-1,6],[3,17],[0,7],[-4,34],[1,18],[1,11],[2,6],[2,2],[1,1],[2,0],[8,4],[6,7],[4,10],[5,17],[3,14],[2,12],[1,7],[-1,4],[-1,1],[-1,-2],[-1,-1],[-2,0],[-4,5],[-3,6],[0,13],[0,13],[0,13],[-3,16]],[[1470,5890],[24,23],[2,3],[2,4],[1,5],[3,12],[1,8],[1,5],[2,6],[4,12],[5,9],[2,3],[2,2],[1,1],[3,1],[12,-1],[11,3],[4,3],[6,7],[3,1],[2,1],[3,-1],[8,-6],[3,-3],[2,-4],[1,-8],[2,-15],[1,-4],[11,-27],[2,-8],[1,-5],[1,-6],[0,-2],[1,-2],[6,-3],[2,-3],[2,-4],[2,-5],[2,-10],[3,-4],[4,-5],[20,-10],[4,2],[4,9],[3,32],[2,6],[6,12],[2,4],[2,4],[2,7],[2,18],[2,6],[1,6],[2,5],[7,12],[1,5],[9,27],[3,8],[2,5],[3,4],[25,18],[8,1],[31,-6],[71,13],[3,2]],[[1833,6063],[3,-2],[2,-5],[1,-6],[0,-9],[-4,-10],[-2,-7],[10,4],[5,0],[4,-6],[2,-9],[4,-18],[2,-8],[1,-1],[3,1],[1,0],[0,-1],[1,-5],[0,-2],[2,-4],[1,-5],[2,-5],[5,-4],[1,-6],[1,-6],[1,-2],[8,-4],[3,-7],[5,-15],[3,-3],[5,-1],[4,-3],[3,-7],[3,-9],[3,-22],[2,-7],[2,24],[4,12],[5,8],[4,5],[10,5],[2,3],[15,-18],[4,-8],[3,-3],[12,-1],[4,-2],[13,-21],[5,-4],[9,11],[2,3],[13,10],[12,1],[1,-5],[6,-52],[-2,-37],[0,-24],[2,-18],[1,-6],[7,-19],[1,-7],[1,-37],[0,-90],[2,-25],[3,-25],[9,-43],[3,-27]],[[4198,4474],[-5,5],[-3,7],[-2,9],[0,11],[2,10],[4,4],[2,6],[5,39],[6,18],[2,9],[1,13],[-9,-21],[-8,-35],[-9,-32],[-13,-13],[-7,2],[-6,7],[-4,12],[-1,20],[4,57],[-1,16],[-1,-5],[-1,-6],[-2,-27],[0,-13],[-1,-3],[-3,-6],[-8,-38],[-14,-17],[-7,-6],[-13,-21],[-16,-15],[-22,-10],[-18,9],[-1,44],[3,24],[1,26],[0,25],[-5,42],[-2,6],[-4,3],[-19,0],[-4,-3],[-5,-6],[-3,-9],[-1,-13],[-1,-10],[-4,-5],[-13,-3],[-2,2],[-2,7],[0,13],[-1,9],[-2,10],[-3,9],[-3,3],[9,-50],[1,-15],[-11,34],[-3,6],[-7,11],[-3,6],[-2,7],[-2,9],[-1,9],[-1,18],[-2,6],[-4,10],[-5,7],[-7,6],[-6,7],[-14,71],[0,-42],[-1,-9],[-2,-5],[-1,-12],[-2,-5],[-1,-1],[-3,1],[-1,0],[-1,-2],[-1,-5],[-3,-7],[-3,-10],[-2,-12],[2,-11],[3,-8],[1,-3],[2,-3],[3,-2],[4,0],[3,-2],[0,-4],[-77,-134],[-7,-16],[-4,-4],[-8,4],[-1,-2],[-1,-6],[-2,-5],[-2,-3],[-2,-1],[-5,4],[-29,58],[-9,10],[-10,6],[-22,-10],[-18,-31],[-31,-85],[-10,-19],[-5,-8],[-4,1],[-4,6],[-10,9],[-3,7],[0,13],[4,25],[2,12],[1,38],[0,13],[-6,102],[1,27],[3,49],[-2,25],[-14,66],[-1,23],[0,26],[-1,2],[-1,2],[-2,3],[-1,5],[1,12],[4,16],[0,11],[-3,-5],[-4,-7],[-3,-10],[-1,-8],[2,-27],[0,-8],[-1,-7],[-2,-5],[-2,-3],[-1,-3],[-1,-3],[-1,-3],[-1,-3],[0,-5],[1,-5],[1,-2],[1,-2],[2,-5],[1,-1],[1,-2],[0,-5],[0,-2],[-2,0],[-1,-2],[-9,-9],[-14,-28],[-3,-4],[-4,-2],[-4,4],[-2,9],[-1,11],[-1,9],[-7,13],[-8,7],[-18,4],[-9,-2],[-6,-6],[-51,-74],[-16,-16],[-10,-2],[-8,5],[-18,27],[-3,3],[-8,0],[-4,4],[1,8],[2,10],[2,6],[6,15],[8,9],[7,6],[18,20],[2,1],[-1,8]],[[8385,4002],[11,-36],[4,-5],[-5,0],[-5,13],[-6,16],[-4,8],[-3,-1],[-5,-3],[-2,-1],[-4,0],[-2,2],[-2,3],[-4,8],[-2,4],[-6,5],[-2,3],[-2,6],[-2,7],[-2,5],[-4,2],[-2,3],[-2,7],[-1,9],[0,8],[1,10],[2,-1],[16,-30],[1,-1],[2,-1],[0,-1],[1,-8],[1,-3],[4,-8],[2,-3],[2,-1],[6,-1],[6,-4],[4,-5],[4,-6]],[[8194,4480],[5,-18],[2,-9],[1,-11],[-1,-10],[-2,-9],[-3,6],[-2,8],[-2,10],[-1,15],[-1,2],[-4,-1],[-1,3],[-4,14],[1,3],[4,6],[2,1],[3,-2],[3,-8]],[[7959,4935],[-5,-1],[-1,3],[2,3],[4,6],[6,9],[3,4],[3,0],[-2,-9],[-5,-9],[-5,-6]],[[8381,5061],[3,-5],[0,4],[1,0],[3,-5],[3,-5],[1,-1],[3,-4],[0,-13],[-4,-14],[-5,0],[0,3],[-1,2],[-8,10],[-2,7],[-1,9],[-2,9],[-2,9],[4,4],[7,-10]],[[8604,5055],[-3,0],[-3,3],[-1,6],[3,8],[-5,9],[0,9],[7,14],[1,10],[1,12],[0,22],[3,-3],[1,-6],[0,-7],[0,-7],[0,-50],[0,-13],[-1,-4],[-3,-3]],[[8563,5233],[-4,-2],[-4,11],[-2,14],[1,16],[1,17],[2,13],[2,6],[1,5],[2,4],[3,2],[3,-1],[2,-4],[3,-6],[1,-6],[0,-4],[-1,-4],[-5,-27],[-2,-23],[-3,-11]],[[8523,5368],[-4,-13],[-3,29],[0,10],[2,28],[12,51],[2,3],[3,-3],[1,-10],[-2,-21],[-1,-2],[-4,-8],[-3,-8],[4,-13],[-3,-21],[-4,-22]],[[7689,5502],[-1,-28],[11,-22],[3,-8],[3,-13],[2,-12],[-1,-9],[-2,-3],[-2,0],[-1,-2],[0,-14],[-2,-1],[-2,-1],[-2,-1],[-7,-15],[-2,-9],[19,-21],[1,-7],[-2,-3],[-2,0],[-3,-2],[-1,-3],[-1,-3],[-1,-4],[-2,-4],[-2,-3],[-2,2],[-1,5],[-2,2],[-2,2],[0,6],[0,6],[1,2],[0,3],[-1,6],[0,3],[-3,-6],[-4,-18],[-2,-4],[-3,-4],[-2,-9],[-2,-9],[-2,-7],[-7,-7],[-15,0],[-7,-5],[-1,5],[-1,3],[-2,3],[-2,1],[3,4],[1,0],[-6,8],[-5,2],[-11,-2],[-10,13],[-9,0],[-2,2],[-3,5],[-7,6],[-3,8],[-4,3],[-1,2],[-4,12],[-1,2],[-9,11],[-6,3],[-2,5],[-4,14],[7,10],[27,26],[1,2],[0,3],[0,2],[1,1],[3,6],[2,2],[8,2],[4,5],[12,18],[4,4],[4,3],[10,2],[9,6],[5,1],[13,-7],[2,1],[4,9],[4,8],[5,8],[7,7],[2,2],[3,0],[2,-2],[1,-9]],[[7602,5809],[-1,-8],[-6,-13],[0,4],[-1,2],[0,3],[0,4],[-9,-18],[-5,-8],[-6,-2],[9,16],[2,4],[-1,3],[-3,-2],[-3,-4],[-1,-2],[-2,0],[-16,0],[-4,7],[1,8],[4,8],[20,18],[5,0],[3,-7],[5,-2],[4,0],[4,-3],[1,-8]],[[7814,5957],[1,-4],[2,0],[3,5],[4,4],[10,2],[1,0],[1,-1],[2,-4],[2,-6],[5,-21],[0,-4],[-3,-9],[-1,-7],[0,-2],[2,-10],[1,-6],[0,-27],[-7,-88],[-5,-25],[-1,-12],[-1,-13],[-2,-13],[-3,-9],[-5,-3],[-3,3],[-3,13],[-3,4],[-2,-1],[-3,-5],[-4,-6],[-3,1],[-2,4],[-6,24],[-2,5],[-5,11],[-6,9],[-2,6],[-2,9],[0,4],[0,8],[0,4],[-1,3],[-1,3],[-1,1],[0,1],[-1,9],[0,5],[0,5],[-2,5],[-2,6],[-2,3],[-2,3],[-1,8],[4,9],[1,14],[-2,14],[-3,12],[-9,22],[0,8],[7,11],[24,16],[9,13],[8,8],[5,2],[5,-3],[3,-10],[1,-8]],[[7794,6050],[2,-1],[1,1],[4,2],[1,0],[2,-2],[4,-5],[3,-1],[1,-1],[-2,-3],[-2,-3],[-1,-1],[-2,-2],[-2,-1],[-2,-1],[0,-6],[1,-5],[1,-1],[2,-1],[0,-3],[0,-4],[-2,-4],[-2,-3],[-6,-4],[-6,-11],[-4,-3],[-8,-1],[-32,-19],[-16,-3],[-7,-5],[0,4],[2,2],[1,2],[-4,1],[-4,2],[-3,-2],[-1,-9],[-2,0],[-2,7],[-3,-2],[-8,-9],[2,10],[4,5],[3,6],[-2,11],[3,8],[1,25],[2,8],[0,-6],[0,-2],[2,0],[0,7],[2,4],[3,1],[2,-4],[-1,-13],[5,-7],[7,3],[3,17],[2,-3],[1,-3],[1,-5],[1,-5],[6,12],[3,3],[4,-3],[-1,-1],[0,-1],[-1,-2],[3,-3],[2,2],[2,3],[2,2],[3,-2],[5,-5],[3,-1],[6,4],[5,8],[4,2],[4,-10],[0,5],[0,3],[-2,4],[2,6],[-4,11],[1,7],[2,-4],[1,-2],[5,0]],[[7761,6230],[-1,-8],[-7,-23],[-3,-7],[-9,-6],[-4,-1],[-2,5],[3,4],[3,20],[0,16],[-7,-8],[-1,-2],[-1,-9],[0,-3],[-2,-3],[-3,-2],[-1,-3],[-3,-2],[-12,-4],[2,6],[3,3],[2,4],[1,7],[-3,-3],[-3,3],[-2,7],[-1,9],[2,-1],[1,-1],[1,-2],[0,-4],[2,8],[2,8],[3,5],[1,-2],[1,-10],[2,-4],[2,0],[4,3],[2,5],[2,7],[3,6],[5,4],[1,2],[0,3],[1,3],[2,2],[1,-1],[3,-5],[6,-6],[1,-4],[2,-7],[1,-9]],[[7587,6212],[-3,-5],[-3,2],[-2,10],[-2,12],[0,10],[1,8],[1,3],[1,2],[4,5],[4,3],[2,1],[1,-3],[2,-9],[-1,-9],[-1,-4],[-1,-5],[-1,-12],[-2,-9]],[[8627,4826],[-1,-2],[-39,-86],[-4,-5],[-3,-5],[-2,-5],[0,-7],[1,-25],[0,-7],[-6,-22],[-20,-44],[-5,-18],[-6,-22],[-5,-30],[-4,-27],[-1,-18],[5,-9],[219,-213],[-85,-293]],[[8671,3988],[-3,2],[-8,-4],[-3,3],[-4,9],[-11,20],[-1,4],[-1,6],[-1,22],[0,5],[-4,3],[-6,0],[-5,2],[-2,9],[2,11],[7,16],[2,11],[-1,5],[-3,7],[-1,4],[0,6],[1,33],[2,8],[3,4],[5,2],[3,-1],[9,-6],[18,-2],[4,-3],[5,-11],[2,-2],[3,2],[2,2],[1,3],[1,2],[5,7],[0,3],[0,6],[-2,-1],[-2,-5],[-2,-2],[-2,1],[-2,4],[0,2],[0,1],[-1,1],[0,3],[0,2],[-1,2],[-1,1],[-2,-2],[-1,-2],[-2,-1],[-9,0],[-16,7],[-17,2],[-2,1],[-2,3],[-1,-3],[-1,-6],[-1,-4],[-6,-9],[-3,-5],[-1,-8],[-1,-12],[-2,-8],[-3,-4],[-12,-8],[-2,-3],[-3,6],[-6,16],[-4,6],[3,11],[-2,10],[-5,10],[-2,8],[-1,3],[-3,2],[-6,1],[-3,3],[-9,17],[4,-17],[2,-16],[-3,-11],[-9,0],[0,-4],[2,-4],[3,-6],[2,-8],[0,-9],[-3,-14],[-2,0],[-2,3],[0,3],[-1,2],[-2,4],[-2,8],[-3,9],[-4,4],[-4,1],[-5,4],[-4,7],[-2,10],[0,6],[-2,10],[0,4],[-1,3],[-2,-3],[-3,-4],[-1,-2],[-2,8],[2,9],[10,19],[1,4],[0,6],[-4,22],[-3,10],[-3,8],[-4,7],[-1,-4],[0,-5],[1,-4],[0,-7],[0,-11],[-1,-4],[-3,-7],[-4,-4],[-4,7],[-3,8],[-4,3],[-4,-7],[-5,-24],[-3,-5],[-3,2],[-3,8],[-10,64],[-3,16],[-10,29],[-2,9],[-1,12],[1,12],[-1,4],[-2,2],[-1,-2],[-3,-3],[-1,-4],[-2,-4],[0,-13],[1,-14],[3,-12],[2,-17],[1,-6],[0,-5],[-3,-1],[-1,2],[-3,18],[-2,6],[-2,7],[-3,5],[-4,2],[-3,-4],[-4,-6],[-2,0],[-2,14],[2,11],[1,6],[0,6],[-2,12],[-2,15],[-9,36],[-2,12],[0,13],[3,10],[5,5],[4,5],[1,14],[0,15],[-4,44],[0,43],[2,9],[4,-9],[1,4],[0,6],[0,13],[2,6],[3,0],[4,-4],[3,8],[3,26],[4,6],[5,4],[5,17],[4,4],[4,-7],[3,-13],[3,-8],[4,7],[-1,3],[-1,2],[-1,4],[0,5],[-1,5],[-2,2],[-2,2],[-1,2],[-2,4],[-2,7],[-1,7],[-1,10],[0,10],[4,17],[0,10],[0,6],[-1,7],[-2,6],[-1,5],[-4,-3],[-4,-1],[-2,-3],[3,-12],[0,-3],[-3,-14],[-1,-16],[-2,-5],[-15,-20],[-3,-6],[-6,-18],[-5,-17],[-3,-39],[2,-103],[-8,-32],[-3,-3],[-12,-7],[-2,1],[-1,4],[-3,23],[-1,2],[-3,2],[0,-3],[1,-11],[1,-17],[-2,-4],[-5,1],[0,-5],[5,-6],[8,-8],[4,-8],[3,-11],[2,-13],[0,-13],[-1,-13],[-2,-8],[-4,-9],[-4,-8],[-4,-3],[-3,-5],[-21,-59],[-3,-20],[2,-26],[7,-16],[4,-12],[-1,-11],[-2,-4],[-5,-4],[-2,-4],[-2,-6],[-3,-16],[-26,-76],[-4,-9],[-9,-6],[-10,1],[-18,9],[-6,0],[-4,-6],[-6,-20],[-4,-6],[-4,2],[-11,12],[-1,1],[-1,1],[-2,4],[-1,7],[0,12],[-1,7],[-2,5],[-5,7],[-2,4],[-2,7],[-2,13],[-1,7],[-2,4],[-3,4],[-2,6],[-1,8],[1,5],[3,-2],[4,-9],[0,6],[-1,6],[-4,35],[-4,8],[0,4],[0,20],[0,6],[-12,66],[0,19],[6,13],[8,-4],[10,-7],[9,2],[2,5],[0,5],[-1,4],[0,6],[1,8],[1,5],[3,10],[4,5],[1,5],[-2,6],[-2,5],[-2,3],[-1,3],[-1,8],[-3,21],[-2,2],[-5,1],[-4,6],[-2,14],[-2,28],[0,13],[1,38],[-1,13],[-4,6],[-5,1],[-7,-4],[-1,-2],[-1,-4],[0,-7],[1,-14],[0,-6],[-5,-5],[-4,1],[-5,6],[-4,9],[-1,5],[-3,19],[-2,6],[-5,12],[0,6],[3,4],[3,6],[-1,11],[-1,2],[-5,8],[-2,2],[-1,3],[-2,17],[-1,4],[-1,3],[-1,7],[-2,7],[-2,3],[-2,3],[-4,11],[-2,3],[-2,1],[-2,5],[-1,5],[-1,5],[-24,36],[-6,4],[1,12],[-4,7],[-11,6],[-2,0],[-7,0],[-3,1],[-2,3],[-3,4],[-2,3],[-1,-11],[-3,-6],[-4,0],[-2,6],[-2,-3],[-2,-1],[-2,1],[-2,3],[1,-11],[-2,-3],[-6,1],[0,4],[-3,20],[-5,-5],[-9,7],[-3,-9],[-1,0],[0,9],[2,4],[2,3],[2,4],[2,6],[1,4],[1,14],[-4,1],[-3,3],[0,4],[3,3],[4,4],[3,7],[2,8],[-2,6],[-5,2],[-10,-1],[-2,2],[3,7],[8,11],[4,0],[4,-2],[3,2],[1,8],[2,-6],[2,-2],[0,4],[-1,8],[2,2],[9,-2],[6,3],[6,5],[-5,5],[-11,-2],[1,9],[1,4],[9,8],[5,0],[2,3],[2,2],[24,0],[3,-2],[9,-11],[3,-1],[7,1],[-1,0],[1,1],[3,-1],[-1,-8],[2,-6],[0,-6],[-2,-8],[3,0],[5,7],[4,1],[0,4],[-2,10],[3,5],[5,1],[3,-2],[1,-6],[4,-2],[5,0],[4,-2],[8,-14],[13,-36],[8,-7],[2,1],[2,2],[4,8],[2,6],[3,4],[13,25],[4,11],[10,43],[6,10],[5,28],[12,39],[2,12],[4,9],[17,22],[6,4],[1,0],[2,2],[1,1],[1,3],[2,2],[2,-1],[1,-2],[2,-1],[4,1],[6,6],[4,0],[12,-15],[1,-9],[0,-20],[2,-8],[2,5],[4,0],[3,-4],[2,-5],[2,-9],[1,-7],[-1,-17],[0,-50],[-2,-14],[5,0],[1,9],[-1,27],[1,14],[1,15],[6,37],[2,5],[2,-2],[0,-5],[0,-23],[1,-29],[-1,-14],[-1,-14],[3,3],[2,12],[0,27],[0,7],[-1,8],[0,8],[1,6],[2,3],[2,-4],[1,-6],[2,-10],[1,-13],[1,-10],[5,1],[0,3],[0,8],[0,3],[2,2],[2,-1],[2,1],[4,5],[2,4],[3,8],[1,-5],[2,-1],[1,1],[1,1],[2,-2],[6,-13],[1,-6],[1,-8],[0,-36],[-1,-6],[-1,-7],[3,-28],[2,8],[0,8],[0,9],[0,12],[0,11],[3,23],[1,12],[0,33],[1,6],[4,-3],[3,-7],[4,-23],[4,-18],[3,-26],[3,-7],[1,3],[1,9],[0,13],[2,36],[-1,7],[-1,2],[-2,9],[-1,1],[-1,7],[1,6],[1,5],[2,6],[-4,4],[-8,-1],[-3,6],[-2,10],[1,5],[4,1],[4,0],[9,6],[6,1],[2,-5],[1,-6],[6,-14],[2,-7],[1,0],[-2,12],[-5,15],[-2,12],[4,6],[15,-4],[7,1],[4,11],[-12,-1],[-6,1],[-5,6],[-1,9],[11,11],[4,11],[-5,-1],[-10,-8],[-6,0],[0,4],[10,9],[5,6],[3,9],[2,12],[0,16],[0,15],[-2,10],[-2,-30],[-2,-12],[-5,10],[-1,0],[-6,-14],[-4,-7],[-4,-4],[-3,3],[-4,14],[-2,4],[-1,3],[1,7],[3,6],[8,6],[3,6],[3,8],[1,8],[5,-5],[3,5],[3,8],[4,4],[-1,4],[-3,-3],[-4,-4],[-3,0],[-1,7],[1,2],[5,4],[2,3],[1,3],[0,10],[1,5],[0,6],[-4,2],[-5,-1],[-3,-3],[-1,0],[-2,2],[-3,0],[-1,-2],[-3,-15],[-1,-4],[-2,-1],[-4,-1],[-2,-1],[-5,-10],[-2,-3],[-8,0],[-4,-3],[-1,-11],[-2,-2],[-4,-4],[-3,-6],[-2,-8],[-1,-4],[-1,-1],[-2,1],[-1,4],[-2,1],[-2,-1],[-4,-6],[0,25],[0,7],[-4,-22],[-3,-10],[-3,-4],[-3,4],[-3,17],[-4,3],[0,-4],[3,-9],[-4,-3],[-5,0],[-6,-4],[-9,9],[-4,3],[-10,-3],[-6,0],[-2,5],[-2,6],[-5,-1],[-9,-7],[-9,2],[-5,-2],[-7,-12],[-5,-3],[-10,-1],[-10,-7],[-8,-9],[-9,-7],[-9,2],[-13,18],[-5,3],[-5,-3],[-5,-6],[-16,-27],[-2,-1],[-2,2],[-1,5],[-1,4],[-3,1],[-4,6],[-3,12],[-1,15],[-1,12],[-3,5],[-4,7],[-5,3],[-4,-5],[-4,-6],[-15,-8],[-15,-23],[-8,-8],[-9,3],[-6,9],[-3,13],[-3,13],[-4,13],[-4,11],[-31,35],[-5,13],[-1,14],[1,4],[6,9],[2,5],[1,8],[2,5],[6,6],[-6,-2],[-10,-9],[-6,-1],[-5,20],[-5,7],[-2,4],[-1,7],[1,6],[1,7],[0,6],[-1,5],[-2,2],[-1,1],[-2,2],[-2,6],[0,6],[0,20],[0,8],[0,5],[-3,13],[5,7],[3,10],[3,10],[3,9],[4,8],[2,6],[1,9],[-1,14],[0,-1],[0,-1],[1,1],[0,5],[-5,-1],[-7,-11],[-9,-6],[-2,0],[-2,2],[-2,8],[1,3],[1,4],[0,3],[-1,3],[-2,3],[-1,3],[-1,3],[2,25],[1,5],[3,7],[0,4],[2,2],[6,4],[1,2],[5,12],[1,6],[-4,0],[-12,-16],[-6,-4],[2,10],[-1,3],[-3,-1],[-3,-4],[-8,-23],[-3,-5],[-2,15],[2,19],[1,17],[-4,14],[-1,-17],[-1,-13],[-3,-9],[-4,-6],[-6,1],[-4,9],[0,13],[4,9],[-4,5],[-4,-3],[-5,-4],[-4,-2],[-4,3],[-3,6],[-5,14],[-4,4],[-4,2],[-7,0],[-2,1],[-1,2],[-2,1],[-2,0],[-3,-2],[-1,-3],[-1,-5],[1,-6],[-3,-3],[-2,-1],[-3,1],[-1,3],[-5,16],[-1,2],[-1,3],[-2,3],[0,3],[2,7],[1,7],[-1,8],[-3,7],[-2,4],[-7,-5],[-4,2],[-10,16],[-1,-11],[4,-11],[9,-17],[1,-8],[-3,-10],[-4,-8],[-3,-4],[-8,-4],[-6,-11],[-5,-5],[-1,2],[-2,15],[-1,6],[-2,5],[-2,4],[-9,10],[-9,1],[-18,-3],[-5,2],[-4,4],[-2,7],[-1,13],[1,4],[7,8],[3,8],[1,4],[6,43],[0,9],[0,5],[2,2],[1,2],[3,12],[4,6],[17,8],[6,4],[2,6],[2,27],[7,21],[1,6],[1,6],[3,15],[0,11],[0,21],[0,7],[3,7],[-1,9],[2,23],[-2,12],[1,1],[5,7],[-9,25],[-3,16],[1,16],[20,15],[9,3],[3,3],[2,10],[6,4],[3,3],[2,3],[9,2],[1,3],[2,5],[3,1],[4,-2],[2,-2],[-5,-14],[-1,-8],[0,-6],[3,1],[5,4],[4,4],[1,5],[3,3],[41,22],[18,16],[3,1],[2,5],[5,28],[10,27],[5,13],[6,9],[11,10],[3,2],[1,5],[4,24],[2,7],[11,21],[3,2],[8,10],[8,8],[7,10],[4,2],[5,1],[18,15],[9,4],[53,-13],[6,5],[43,-55],[4,-2],[3,2],[5,7],[3,-2],[1,-4],[0,-5],[1,-6],[4,-6],[7,-10],[3,-6],[2,-2],[3,-1],[4,1],[1,-2],[3,-8],[1,-2],[2,-1],[5,1],[2,0],[29,-57],[6,-16],[3,-14],[2,-7],[9,-16],[3,-3],[36,-13],[1,0],[1,-2],[1,-2],[2,0],[1,8],[1,3],[2,3],[1,1],[3,-5],[3,-4],[5,-4],[20,-2],[3,4],[-2,8],[2,6],[3,2],[4,-1],[3,-2],[1,-3],[4,-10],[2,1],[3,2],[12,5],[9,0],[3,1],[3,4],[4,-6],[13,-37],[3,-4],[5,-3],[2,-3],[2,-5],[3,-11],[2,-5],[7,-6],[2,-4],[-1,-7],[-4,-4],[-14,-4],[-3,-3],[-1,-7],[0,-15],[-2,-9],[-3,-2],[-2,-4],[9,-52],[3,-10],[1,-6],[0,-12],[2,-7],[2,-6],[3,-20],[3,-10],[4,-11],[4,-8],[3,-3],[2,-6],[14,-69],[3,-12],[-9,-39],[-2,-12],[0,-24],[-2,-40],[-1,-9],[-2,-8],[-11,-33],[-4,-5],[-2,-9],[-2,-2],[-3,-1],[-2,-3],[-1,-5],[-1,-7],[1,-8],[3,-24],[9,-119],[1,-46],[-1,-6],[1,-2],[0,-2],[1,-4],[0,-4],[-1,0],[-1,0],[-2,1],[-1,-3],[-3,-38],[0,-12],[2,-6],[3,-6],[1,-5],[1,-7],[0,-6],[0,-6],[-1,-7],[1,-12],[3,-19],[1,-12],[-1,-13],[-1,-5],[1,-6],[3,-9],[1,-5],[1,-10],[1,-11],[3,-9],[2,-8],[9,-19],[3,-14],[3,-9],[3,-7],[3,-4],[2,-4],[2,-10],[2,-12],[1,-20],[4,-25],[0,-10],[4,-11],[2,-16],[3,-38],[1,-6],[3,-6],[2,-8],[2,-17],[5,-28],[0,-4],[5,0],[4,5],[6,11],[-1,7],[-2,26],[-1,5],[-2,12],[-1,7],[0,8],[0,16],[0,8],[-1,8],[-3,15],[-1,6],[-1,17],[0,15],[1,14],[1,11],[3,12],[3,6],[10,10],[-3,3],[-2,4],[1,6],[2,4],[2,-1],[5,-10],[1,-2],[5,-2],[4,-6],[3,-8],[2,-8],[2,-22],[2,-156],[1,-7]],[[7644,6451],[-5,-3],[-8,7],[-5,2],[3,10],[6,15],[3,0],[4,-4],[2,-11],[0,-16]],[[7790,6502],[30,-24],[1,-2],[1,-3],[1,-3],[1,1],[2,5],[0,1],[7,4],[1,1],[4,0],[3,-2],[0,-5],[-3,-9],[4,-1],[5,-3],[6,-1],[3,-2],[6,-5],[2,-4],[2,-6],[2,-5],[2,-2],[1,-3],[1,-7],[3,-4],[3,2],[1,-2],[1,-1],[4,-1],[2,-1],[1,-3],[1,-3],[5,-4],[2,-7],[3,-19],[-3,-8],[-1,-6],[-1,-6],[2,-8],[7,-16],[2,-6],[-1,-5],[-6,-2],[-1,-5],[-1,-8],[-2,-4],[-2,-5],[-1,-10],[-1,1],[-2,2],[-1,1],[0,-13],[-2,-9],[-4,-3],[-4,7],[-8,18],[-5,8],[-2,-1],[-1,2],[-7,0],[-2,2],[0,2],[-1,1],[-3,-1],[-3,-5],[-10,-20],[-1,8],[-1,2],[-4,-2],[0,-1],[-1,-1],[-2,-1],[-1,-1],[-2,1],[-3,6],[-1,1],[-5,19],[-5,10],[-1,4],[1,4],[-3,12],[-3,6],[-3,2],[-7,1],[-3,2],[-2,1],[-3,3],[0,6],[0,11],[-1,12],[-1,6],[-12,29],[-3,10],[0,12],[-2,-2],[-1,0],[-3,2],[1,4],[0,4],[-4,1],[-6,-1],[-5,-3],[-3,-5],[6,-3],[2,-3],[1,-6],[-4,0],[-2,-7],[1,-9],[8,-8],[3,-9],[8,-28],[5,-23],[1,-11],[1,-8],[9,-11],[4,-7],[1,10],[1,4],[2,2],[10,-1],[3,-2],[1,-3],[1,-6],[2,-4],[2,-2],[1,-2],[2,-7],[2,-11],[2,-7],[-1,-2],[-2,-5],[-2,-6],[-1,-5],[-1,-5],[-2,-4],[-9,-10],[-18,-9],[-6,-1],[-5,3],[-3,8],[-2,11],[-6,41],[3,5],[0,8],[0,9],[-1,7],[-18,-14],[-6,-11],[-3,-24],[1,0],[3,5],[-1,-11],[-4,-25],[-1,-4],[-2,-2],[-1,3],[1,7],[2,19],[-3,3],[0,9],[1,12],[-1,13],[-1,5],[-3,9],[-2,6],[0,5],[2,5],[1,4],[-1,6],[-4,4],[-4,-3],[-7,-9],[-1,-2],[-1,-5],[-1,-1],[-1,1],[-1,5],[-1,2],[-4,1],[-2,1],[-2,2],[-2,-7],[-1,1],[-1,4],[-1,2],[-6,1],[0,-1],[-5,2],[-1,2],[-1,3],[-1,6],[-1,5],[-1,2],[-6,3],[-7,7],[-4,7],[6,4],[1,-2],[4,-5],[2,-2],[1,1],[5,0],[0,-1],[8,4],[4,1],[2,-3],[3,-5],[4,0],[3,4],[2,5],[1,8],[-2,1],[-5,1],[-2,5],[4,3],[2,7],[0,10],[-2,8],[-2,-11],[-2,-7],[-3,1],[0,13],[-1,0],[-1,-6],[-2,-2],[-2,1],[-1,3],[0,-8],[2,-8],[0,-7],[-1,-5],[-3,0],[-3,4],[-3,5],[-1,4],[-1,8],[-3,12],[-1,9],[1,7],[2,4],[3,-1],[3,-4],[1,3],[2,3],[1,5],[1,5],[1,-8],[0,-9],[1,-8],[2,-3],[2,3],[0,8],[-1,10],[-1,7],[5,4],[3,-6],[3,-8],[4,-6],[-1,12],[-1,4],[2,0],[0,-4],[1,-4],[10,11],[4,7],[3,11],[2,-3],[2,-4],[3,-10],[1,3],[1,6],[0,-3],[1,-3],[0,-3],[1,4],[2,13],[1,-3],[3,-5],[1,6],[6,-2],[4,4],[5,0],[6,5],[6,2],[1,-12],[3,3],[6,-1],[5,3],[-2,4],[-2,3],[-2,1],[-2,0],[3,7],[3,6],[5,3],[5,0]],[[8555,6940],[-4,-4],[-4,2],[-1,6],[3,8],[3,5],[4,0],[1,-8],[-2,-9]],[[7882,7113],[-2,-6],[0,3],[2,6],[0,-3]],[[7886,7127],[-2,-5],[0,5],[0,9],[2,4],[2,-2],[-1,-6],[-1,-5]],[[756,6202],[2,-6],[1,-8],[1,-10],[-1,-8],[-2,0],[0,4],[0,3],[-1,2],[0,3],[-2,-5],[-1,-2],[-1,0],[-2,3],[2,8],[-2,5],[-3,2],[-3,-3],[-2,-7],[0,-11],[-1,-10],[1,-5],[-7,6],[-16,25],[-9,6],[2,2],[2,5],[2,1],[2,-1],[3,-4],[2,1],[1,7],[5,38],[0,12],[0,24],[0,12],[1,7],[5,16],[1,6],[2,2],[2,1],[1,2],[1,3],[1,6],[-2,18],[2,8],[3,-2],[2,-7],[9,-41],[3,-22],[-1,-13],[2,-10],[0,-11],[0,-12],[-2,-10],[1,-8],[-1,-7],[-1,-8],[-2,-7]],[[772,6340],[-1,-24],[0,4],[-1,-6],[-2,-7],[0,-6],[0,-6],[1,-9],[0,-7],[-1,0],[-7,37],[-23,89],[-3,16],[-6,39],[-4,18],[-3,4],[-3,5],[-4,6],[-1,7],[2,3],[5,4],[8,3],[9,-10],[8,-27],[6,-32],[2,-30],[4,-25],[8,-23],[6,-23]],[[786,6608],[10,-3],[10,3],[6,-5],[5,0],[8,-4],[7,-11],[3,-19],[-1,-15],[-10,1],[-8,0],[-8,-7],[-8,-2],[-9,5],[-6,4],[-10,0],[-8,3],[-2,12],[-1,20],[5,8],[9,8],[8,2]],[[514,7402],[4,-6],[3,4],[2,3],[2,-3],[3,-12],[0,-6],[0,-3],[2,-1],[2,0],[3,-1],[2,1],[1,-1],[0,-2],[1,-8],[1,-2],[5,-14],[1,-2],[1,-3],[1,-14],[2,-6],[11,-29],[3,-11],[2,-24],[17,-56],[4,-8],[10,-6],[4,-5],[4,-6],[2,-7],[3,-13],[2,-9],[1,-8],[1,-7],[4,-3],[4,-2],[4,-2],[3,-8],[4,-24],[1,-5],[3,-6],[-1,-13],[-4,-21],[0,4],[-4,-17],[0,-18],[1,-36],[-1,-8],[-2,-14],[-1,-35],[-1,-45],[-2,-12],[-10,-35],[-1,-3],[-3,2],[-2,3],[-5,11],[-2,-10],[-3,0],[-6,10],[0,-2],[-2,-4],[-3,-1],[-1,8],[-1,3],[-2,3],[-1,1],[3,15],[-2,11],[-3,10],[-3,9],[0,8],[1,16],[-1,7],[-2,6],[-3,19],[-1,7],[-3,25],[-9,22],[-19,32],[1,11],[-2,6],[-5,3],[-5,0],[-9,-2],[-1,4],[0,14],[0,26],[-4,24],[-11,48],[-2,15],[-1,5],[-2,5],[-2,4],[-2,6],[-2,13],[-3,7],[-1,8],[0,7],[-1,4],[-1,4],[-2,2],[-2,3],[-2,2],[-3,2],[-2,6],[-1,6],[-2,14],[-2,6],[-9,24],[-4,9],[-6,6],[0,-2],[-3,-6],[-1,12],[4,8],[6,4],[5,0],[2,-2],[2,-4],[2,-4],[1,-5],[1,3],[3,1],[5,-2],[7,2],[4,4],[5,7],[9,23],[2,7],[1,8],[-1,17],[1,5],[3,5],[6,-16]],[[760,7489],[3,-6],[2,4],[2,7],[4,5],[3,-5],[4,-13],[2,-12],[-4,-3],[-4,-2],[-7,0],[-7,2],[-7,10],[-3,2],[-2,2],[-2,7],[-1,9],[1,9],[3,7],[3,3],[4,-3],[2,-8],[4,-15]],[[1153,8015],[-4,-35],[-3,-84],[0,-21],[1,-19],[3,-26],[3,-38],[2,-61],[-1,-17],[-3,-26],[0,-3],[-2,-20],[0,-25],[0,-14],[2,-9],[2,-6],[9,-17],[3,-8],[2,-9],[4,-39],[9,-48],[1,-18],[0,-12],[0,-10],[-2,-9],[-2,-7],[-2,-7],[-14,-21],[-7,-8],[-3,-4],[-43,-53],[-4,-7],[-2,-4],[-2,-5],[0,-5],[-1,-5],[0,-4],[1,-3],[10,-23],[2,-5],[1,-7],[1,-7],[0,-21],[0,-6],[1,-6],[2,-5],[9,-14],[3,-5],[2,-5],[1,-6],[1,-7],[1,-9],[0,-14],[-3,-26],[-1,-7],[1,-8],[1,-12],[0,-9],[1,-13],[-2,-39],[0,-26],[0,-7],[0,-5],[-2,-4],[-1,-3],[-2,-4],[-1,-6],[-2,-11],[-1,-7],[0,-12],[1,-17]],[[1123,6952],[-3,-4],[-3,-2],[-3,0],[-2,1],[-4,2],[-4,7],[-4,12],[-2,5],[-3,4],[-9,5],[-7,7],[-4,6],[-3,4],[-9,5],[-10,11],[-6,3],[-2,-4],[-2,-1],[-3,-2],[-4,1],[-3,1],[-2,3],[-7,12],[-2,1],[-1,0],[-1,-4],[0,-6],[2,-13],[2,-7],[2,-4],[1,-3],[1,-3],[2,-10],[2,-3],[1,-2],[4,-4],[2,-2],[1,-3],[1,-4],[1,-8],[2,-22],[1,-8],[10,-26],[1,-7],[2,-10],[3,-11],[5,-29],[1,-5],[0,-6],[0,-7],[0,-7],[-2,-13],[-2,-5],[-2,-5],[-10,-9],[-3,-2],[-4,0],[-5,5],[-2,6],[-1,2],[-2,1],[-13,1],[-2,1],[-3,3],[-1,5],[-3,11],[-1,4],[-1,2],[-2,1],[-2,0],[-2,2],[-6,9],[-3,3],[-5,0],[-5,-5],[-16,-24],[-5,-6],[-4,-3],[-7,-1],[-6,-5],[-3,-2],[-2,-7],[-16,-57],[-26,-73],[0,-1]],[[900,6653],[-2,4],[-1,3],[1,6],[3,8],[1,6],[0,13],[-2,8],[-4,5],[-5,3],[4,27],[1,12],[-1,43],[-1,14],[-3,9],[-2,-6],[0,10],[1,28],[-1,14],[-2,12],[-4,5],[-5,-6],[-2,18],[2,53],[-2,22],[-7,24],[-2,4],[-4,4],[-1,9],[1,23],[-1,21],[-13,116],[-14,94],[-3,15],[0,6],[0,6],[1,7],[1,7],[-1,6],[-9,25],[-3,9],[-2,23],[-2,13],[0,11],[-1,4],[-2,3],[-2,2],[-2,2],[-1,2],[-1,5],[-1,13],[-3,11],[1,3],[3,2],[1,-1],[2,-4],[1,-5],[0,-4],[2,-8],[3,8],[4,22],[2,8],[5,12],[1,6],[0,22],[-1,9],[-3,4],[-4,1],[-1,5],[1,7],[-1,11],[-2,11],[-3,9],[-7,17],[-3,-4],[0,-4],[0,-9],[3,-4],[0,-4],[-1,-6],[0,-4],[-2,-4],[-5,6],[-7,16],[-18,74],[-9,28],[-20,33],[-3,3],[-5,3],[-4,1],[-5,0],[-2,0],[-1,2],[0,9],[-1,4],[-1,3],[-2,2],[-4,1],[-5,-1],[-5,0],[-1,7],[-1,14],[-3,9],[-8,13],[-12,28],[-11,18]],[[708,9040],[0,-45],[-1,-6],[-5,-7],[-9,-9],[-3,-3],[-1,-7],[0,-10],[0,-19],[5,14],[3,7],[4,3],[1,2],[4,11],[1,1],[0,2],[8,-52],[1,-5],[13,4],[4,0],[5,-5],[8,-12],[4,-3],[4,-4],[4,-19],[2,-6],[4,-1],[4,2],[3,-3],[2,-20],[3,-8],[3,-6],[4,-4],[14,-13],[5,-23],[0,-25],[2,-18],[19,-46],[22,-26],[13,-6],[5,-8],[6,-13],[4,-4],[6,-4],[4,-8],[6,-15],[17,-22],[20,-36],[21,-46],[4,-5],[8,-4],[3,-5],[4,-13],[6,-9],[2,-6],[2,-16],[1,-8],[5,-14],[7,-16],[7,-10],[20,-14],[8,-8],[4,-1],[3,-5],[6,-35],[12,-29],[4,-15],[1,-21],[7,4],[5,-11],[4,-14],[6,-8],[4,-8],[3,-20],[1,-69],[0,-8],[-2,-8],[-2,-7],[-1,-8],[-1,-11],[-1,-5],[-2,-9],[0,-4],[1,-5],[2,-2],[2,-2],[1,-2],[2,-6],[0,-2],[-1,-2],[0,-4],[5,-20],[-1,-7],[1,-4],[1,0],[2,3],[1,6],[-1,4],[-1,4],[-1,4],[0,20],[0,4],[-7,11],[-2,4],[3,9],[7,8],[8,-3],[5,-22],[0,-9],[-1,-16],[1,-8],[2,-19],[1,-7],[1,-12],[3,-14],[3,-10],[3,5],[0,8],[-4,22],[-1,9],[0,24],[1,11],[2,11],[3,8],[4,5],[4,3],[5,1],[2,-3],[0,-5],[0,-6],[1,-5],[2,-3],[4,-4],[1,-3],[1,-4],[0,-16],[1,-5],[2,-10],[0,-3],[1,-4],[6,-11],[2,-1],[1,-4],[0,-5]],[[1902,6299],[-1,-1],[-9,1],[-3,-2],[-6,-8],[-2,-2],[-2,-2],[-5,-8],[-3,-2],[-2,2],[-3,5],[-2,2],[-3,-3],[-5,-3],[-12,12],[-6,-3],[0,20],[5,28],[8,25],[8,12],[4,-1],[11,-5],[3,-4],[2,-8],[4,-5],[10,-4],[4,-7],[5,-12],[2,-14],[-2,-13]],[[1710,6672],[-6,-3],[-1,7],[3,7],[6,8],[7,3],[3,-6],[-5,-7],[-7,-9]],[[1755,6847],[-1,-3],[-1,2],[-1,4],[-2,7],[-3,18],[0,8],[-1,4],[0,3],[-1,3],[2,2],[3,-1],[2,-6],[2,-7],[1,-8],[1,-9],[0,-5],[0,-5],[-1,-7]],[[1777,6809],[-2,-1],[-4,6],[-3,9],[-1,10],[0,11],[5,53],[5,18],[7,8],[4,-2],[3,-6],[3,-9],[3,-8],[3,-12],[1,-12],[1,-12],[1,-18],[-1,-15],[-3,-7],[-19,-10],[-3,-3]],[[1760,6939],[-2,-8],[-2,2],[-1,5],[-1,7],[0,4],[0,5],[1,5],[1,4],[2,6],[1,2],[2,2],[1,0],[2,-8],[-1,-13],[-3,-13]],[[1660,7094],[4,-1],[3,2],[6,9],[3,2],[6,-1],[4,-3],[4,-5],[11,-23],[17,-21],[24,-49],[3,-10],[1,-4],[2,-15],[1,-7],[0,-4],[1,0],[-2,-12],[-1,-22],[-2,-9],[-1,-2],[-3,-3],[-2,-2],[-1,3],[-1,2],[-3,12],[-12,29],[-7,11],[-10,5],[-18,-4],[-5,2],[-9,6],[-5,0],[-18,-12],[-9,-2],[-9,6],[-10,21],[-2,3],[-12,25],[1,12],[3,12],[5,9],[9,6],[3,8],[0,11],[-7,56],[0,23],[4,16],[9,4],[6,-8],[11,-34],[2,-6],[0,-8],[-2,-10],[0,-10],[3,-6],[5,-2]],[[1746,7122],[8,-24],[11,-45],[8,-17],[3,-10],[-2,-14],[-9,-14],[-9,4],[-29,49],[0,2],[-10,24],[-3,4],[-7,7],[-4,2],[-4,3],[-2,7],[-3,9],[-2,5],[-4,2],[-13,-2],[-4,-3],[-5,-7],[-5,-5],[-5,2],[0,8],[3,11],[7,20],[3,12],[4,25],[3,10],[8,8],[10,-3],[19,-18],[17,-24],[16,-28]],[[1621,7074],[-2,-1],[-2,1],[-2,-3],[-6,-15],[-2,-3],[-7,4],[-7,17],[-15,43],[-3,18],[-3,9],[-1,10],[0,15],[2,26],[0,21],[0,11],[-5,9],[-2,12],[-2,14],[0,10],[0,5],[2,11],[1,6],[-2,25],[1,12],[1,6],[3,3],[5,0],[8,-5],[7,-14],[12,-35],[16,-32],[4,-10],[1,-5],[1,-14],[0,-14],[-7,-56],[0,-14],[0,-15],[4,-34],[1,-13],[-1,-5]],[[1572,7433],[13,-7],[6,0],[3,0],[2,-3],[4,-7],[2,-2],[19,-14],[6,-15],[1,-28],[0,-46],[3,-41],[0,-11],[-7,-3],[-9,16],[-14,36],[-9,32],[-4,5],[-2,1],[-4,6],[-33,13],[-8,12],[-9,21],[-6,21],[-5,23],[1,17],[10,7],[4,-2],[10,-13],[4,-7],[3,-5],[5,-3],[14,-3]],[[1459,7721],[8,-27],[3,-16],[1,-22],[-2,-13],[-6,-23],[-2,-14],[1,-27],[-1,-11],[-3,-12],[-11,-20],[-1,-7],[-2,-6],[-6,-5],[-6,-3],[-4,0],[-10,5],[-9,11],[-6,17],[-5,23],[-2,27],[-2,14],[-5,21],[-1,13],[3,49],[2,18],[5,12],[8,5],[4,-2],[8,-8],[4,1],[4,6],[10,29],[8,7],[7,-12],[5,-18],[3,-12]],[[1470,5890],[-2,12],[-1,4],[-1,3],[-2,6],[-2,3],[-2,3],[-11,11],[-21,11],[-11,10],[-8,13],[-12,37],[-23,36],[-20,50],[-43,135],[-9,43],[-5,3],[-8,9],[-18,35],[-7,34],[-5,18],[-1,8],[-1,9],[-2,20],[-1,9],[-6,31],[-1,12],[0,7],[1,4],[1,3],[1,2],[2,1],[11,2],[2,1],[2,3],[2,4],[0,4],[-2,37],[1,15],[3,52],[0,8],[-1,8],[-1,8],[-2,9],[-2,7],[-6,17],[-1,2],[-1,4],[0,3],[-2,2],[-2,1],[-1,-2],[-1,-2],[-1,0],[-2,1],[-9,26],[-5,11],[-8,15],[-16,19],[-10,30],[-4,10],[-4,3],[-4,1],[-6,-2],[-4,-2],[-2,-3],[-1,-3],[-1,-8],[-2,-5],[-7,-1],[-22,24],[-9,43],[-1,6],[-5,13],[-2,8],[-6,47],[0,5],[1,7],[2,4],[5,11],[1,5],[1,4],[0,5],[0,4],[-2,8],[-5,11]],[[1153,8015],[15,-118],[5,-25],[6,-24],[16,-43],[12,-25],[12,-17],[11,3],[27,-50],[5,-6],[4,-14],[2,-3],[3,-7],[4,-16],[3,-18],[1,-14],[1,-18],[2,-18],[4,-13],[5,-5],[-1,9],[1,12],[0,13],[-2,12],[-3,11],[-2,13],[-2,27],[-4,27],[-14,47],[-4,28],[-1,27],[3,25],[6,18],[10,10],[4,1],[31,-5],[2,-6],[0,-24],[2,-12],[25,-44],[26,-59],[3,-13],[2,-13],[1,-12],[-1,-25],[1,-14],[5,-33],[6,-51],[4,-22],[6,-16],[15,-18],[8,-5],[8,-9],[5,0],[18,8],[8,1],[8,-5],[7,-11],[53,-122],[21,-30],[5,-17],[2,-27],[-1,-23],[0,-15],[2,-7],[4,-3],[3,-8],[2,-10],[1,-11],[-2,-46],[0,-23],[3,-24],[7,-25],[18,-38],[22,-67],[9,-18],[10,-14],[5,-5],[4,-2],[9,-2],[5,2],[7,6],[4,1],[25,-12],[21,-2],[9,-11],[7,-19],[23,-70],[6,-25],[2,-27],[-4,-16],[-8,-13],[-17,-20],[-9,-17],[-4,-8],[-9,-5],[-25,-35],[-3,-6],[-3,-5],[-15,-9],[-4,-5],[-2,-3],[-2,-4],[-4,-22],[-2,-3],[-6,3],[-4,8],[-8,22],[-3,4],[-6,3],[-5,1],[-1,-2],[2,-4],[2,-2],[5,0],[2,-1],[1,-3],[2,-8],[5,-14],[6,-14],[7,-6],[7,9],[2,5],[2,8],[1,3],[2,5],[5,6],[2,4],[4,3],[10,-3],[5,2],[12,14],[15,5],[3,4],[16,26],[4,3],[3,4],[11,29],[4,6],[5,5],[5,4],[5,1],[5,4],[3,11],[4,26],[5,11],[12,6],[7,9],[6,11],[5,2],[6,-3],[7,-9],[13,-20],[13,-28],[10,-34],[4,-39],[3,11],[1,6],[3,4],[2,-1],[2,-3],[2,-3],[6,-5],[4,-9],[4,-10],[3,-10],[4,-22],[9,-121],[1,-7],[2,-3],[-1,-6],[-2,-9],[-2,-3],[-3,-1],[-5,2],[-18,-4],[-2,-3],[0,-11],[-1,-2],[-3,-1],[-2,-1],[-2,0],[-2,2],[-1,4],[-3,12],[-2,4],[-1,0],[-2,-2],[-2,-3],[-1,-3],[1,-7],[1,-1],[2,0],[1,-4],[0,-5],[-1,-6],[-1,-7],[2,-12],[-2,-6],[-4,-3],[-3,-2],[-8,0],[-3,-3],[-1,-7],[-1,-17],[-4,-14],[-5,-11],[-6,-9],[-25,-12],[-7,-12],[4,0],[6,-3],[4,-1],[4,2],[6,8],[4,2],[6,5],[7,10],[7,4],[3,-11],[-2,-14],[-8,-21],[-2,-15],[-2,-14],[-6,-7],[-14,-6],[0,-4],[7,-8],[5,-2],[3,4],[3,1],[11,1],[3,-1],[2,-2],[2,-3],[2,-4],[2,-4],[5,-1],[8,-15],[2,-7],[-2,-12],[-4,-11],[-5,-8],[-7,-6],[-22,-11],[-3,5],[-3,11],[-3,24],[1,-38],[1,-5],[5,-11],[2,-6],[0,-14],[-2,-18],[-3,-16],[-4,-9],[0,-4],[3,-7],[-1,-8],[-3,-8],[-5,-1],[2,-9],[4,-10],[6,-7],[7,-4],[1,0]],[[6570,7328],[-6,-1],[-3,8],[0,6],[2,4],[5,4],[10,12],[9,61],[2,0],[0,-12],[-1,-17],[-1,-18],[0,-4],[-3,-8],[-1,-4],[-2,-19],[-4,-6],[-7,-6]],[[6109,7054],[4,1],[4,4],[9,-9],[4,3],[-1,6],[-1,13],[1,8],[4,-9],[4,-5],[7,6],[4,-7],[1,-6],[0,-5],[1,-5],[2,-4],[2,-1],[6,0],[3,1],[2,2],[1,3],[2,3],[4,0],[1,-3],[2,-3],[1,-2],[3,4],[6,-11],[16,-10],[7,-9],[3,-2],[7,9],[3,2],[5,-2],[8,-13],[5,-5],[30,-12],[15,5],[2,-1],[4,-4],[2,0],[2,4],[1,5],[-1,4],[-2,3],[3,5],[9,8],[4,10],[24,25],[7,4],[3,6],[5,16],[7,9],[15,11],[5,12],[4,19],[3,41],[4,17],[2,5],[3,6],[4,4],[5,1],[14,-2],[5,2],[2,4],[1,4],[2,3],[2,1],[2,-3],[1,-6],[1,-5],[3,-2],[3,4],[3,12],[2,13],[0,11],[-2,10],[-4,3],[-8,-1],[-4,7],[0,16],[1,16],[2,10],[12,24],[1,6],[3,4],[15,-9],[6,3],[3,5],[5,18],[4,6],[9,3],[5,5],[3,12],[-2,11],[-3,11],[-1,13],[0,14],[3,10],[21,45],[2,8],[1,2],[4,-5],[1,3],[0,20],[0,6],[3,5],[4,6],[5,2],[2,-7],[0,-24],[2,-7],[4,-4],[4,0],[14,5],[6,-2],[1,-7],[-3,-24],[1,-25],[4,-14],[6,-10],[5,-12],[3,-23],[-7,-15],[-9,-11],[-7,-11],[-7,-22],[-4,-21],[-13,-103],[-11,-49],[-7,-23],[-7,-19],[-1,-5],[-2,-15],[-1,-4],[-1,-4],[-7,-11],[-7,-5],[-2,-3],[-2,-6],[-3,-15],[-2,-3],[-6,-4],[-4,-8],[-7,-21],[-8,-15],[-3,-8],[-2,-17],[-3,-11],[-1,-7],[0,-9],[0,-4],[-2,-10],[-8,-18],[-2,-12],[-2,-5],[0,-6],[0,-6],[2,-5],[0,-4],[0,-11],[-1,-2],[-4,1],[-2,-1],[-1,-2],[-9,-32],[-1,-9],[4,-5],[0,-4],[-5,-4],[-2,-8],[-4,-20],[-6,4],[-5,-5],[-5,-8],[-4,-4],[-5,-3],[-6,-14],[-27,-15],[-10,-2],[-9,10],[-3,-4],[-6,-17],[-6,5],[-2,0],[-2,-3],[-4,-8],[-2,-1],[-14,-2],[-5,-2],[-9,-9],[-2,0],[-7,0],[-4,-4],[-4,-6],[-2,-1],[-2,2],[-3,3],[-3,2],[-4,-1],[-8,-9],[-7,-3],[-2,-4],[-3,-9],[-2,0],[-2,3],[-7,15],[-3,4],[-22,5],[-2,0]],[[6556,7534],[-1,0],[-2,4],[-1,6],[0,8],[-2,10],[0,11],[1,5],[0,7],[2,2],[2,-5],[2,-7],[2,-5],[2,-2],[1,-4],[0,-8],[-5,-13],[-1,-5],[0,-4]],[[6612,7759],[0,-9],[-1,-2],[-1,0],[-1,1],[-1,-2],[-3,-6],[-1,0],[-2,-3],[-1,-5],[-2,-4],[-2,1],[-1,5],[0,7],[1,4],[1,1],[2,4],[1,1],[0,2],[-1,2],[0,3],[0,5],[2,-2],[1,-2],[0,1],[1,-1],[2,-2],[1,-1],[2,0],[2,7],[1,-5]],[[6622,7884],[-7,-10],[-6,5],[-5,14],[0,15],[2,7],[4,3],[4,1],[3,-3],[4,-6],[2,-6],[-1,-20]],[[6615,8062],[-2,-4],[-4,1],[-2,7],[-1,11],[-1,11],[0,9],[-3,17],[-1,11],[1,7],[4,23],[2,6],[3,5],[3,0],[3,-4],[3,-6],[1,-9],[0,-8],[-1,-7],[-6,-13],[-2,-4],[-1,-4],[0,-10],[1,-8],[2,-11],[1,-7],[0,-7],[0,-6]],[[6660,8585],[2,-3],[1,1],[1,-14],[1,-13],[1,-5],[2,-9],[0,-4],[0,-5],[-1,-4],[-8,-16],[-1,-1],[-4,2],[0,4],[-1,6],[-1,6],[-4,7],[-11,8],[-3,7],[-1,10],[2,29],[1,6],[1,3],[0,19],[-1,4],[-5,7],[-12,25],[-2,8],[-2,10],[-1,12],[0,13],[5,16],[8,-4],[8,-13],[5,-15],[7,-32],[1,-11],[0,-3],[0,-4],[0,-4],[0,-6],[1,-3],[4,-9],[2,-5],[2,-16],[0,-2],[3,-2]],[[6923,8718],[-6,-7],[-10,24],[-5,30],[1,18],[8,-6],[6,-12],[5,-16],[2,-10],[3,-12],[-4,-9]],[[6892,8758],[-4,0],[-1,26],[-2,25],[1,19],[-4,13],[-5,8],[-1,15],[-2,21],[1,10],[6,-9],[3,-27],[9,-29],[3,-7],[0,-12],[-3,-13],[-3,-15],[2,-25]],[[6931,9162],[1,-10],[1,-12],[-1,-13],[-2,-12],[-1,-14],[-1,-14],[2,-22],[7,-14],[4,-15],[-12,-42],[-12,-32],[0,-41],[0,-29],[-2,-12],[-9,-15],[-10,11],[-8,-4],[-3,18],[3,15],[3,11],[7,11],[8,52],[10,22],[-3,11],[-3,3],[-4,3],[-11,8],[0,13],[2,13],[-2,15],[-1,5],[-1,8],[0,7],[0,18],[1,15],[8,29],[0,4],[0,7],[0,6],[-1,13],[-1,7],[3,6],[5,3],[6,0],[4,-2],[3,-6],[1,-5],[1,-6],[1,-8],[3,-4],[2,0],[2,-2]],[[6990,9314],[-2,-7],[-3,7],[0,10],[0,2],[2,1],[2,-4],[1,-9]],[[6871,9788],[-1,-3],[-1,5],[2,5],[1,-1],[-1,-6]],[[6757,5048],[-6,-7],[-7,9],[-7,16],[-4,18],[-1,19],[-1,40],[-2,18],[-2,6],[-5,13],[-2,5],[-1,8],[0,28],[-3,16],[-3,16],[-2,17],[0,20],[2,10],[2,11],[5,18],[3,8],[1,3],[2,3],[3,-1],[2,-3],[7,-14],[1,-6],[2,-6],[0,-8],[-1,-16],[-4,-31],[-1,-16],[1,-27],[19,-109],[1,-12],[1,-13],[2,-10],[1,-10],[-3,-13]],[[6387,5326],[-1,-28],[-2,4],[-5,17],[-2,2],[-3,1],[-2,2],[-1,5],[1,8],[3,6],[3,3],[4,-1],[3,-6],[2,-13]],[[6615,5443],[2,-2],[2,0],[4,3],[3,7],[2,2],[1,-3],[0,-4],[1,-5],[0,-3],[1,-2],[14,5],[7,-1],[4,-8],[3,2],[17,-6],[2,1],[3,2],[2,4],[5,8],[2,1],[5,-4],[9,-1],[25,9],[10,0],[27,-12],[38,-4],[8,-4],[3,0],[1,1],[0,-7],[-2,-5],[-14,-17],[-3,-1],[-8,1],[-4,-2],[-3,-2],[-1,-2],[-1,-4],[-3,0],[-5,2],[-18,-4],[-2,-2],[-6,-6],[-7,0],[-2,0],[-7,-13],[-5,-5],[-4,3],[-5,10],[-3,4],[-3,0],[-15,-9],[-37,1],[-4,-1],[-10,-9],[-5,-2],[-11,0],[-3,-1],[-8,-7],[2,10],[0,12],[0,11],[-2,8],[-2,3],[-9,13],[-2,-3],[-1,-11],[-2,-2],[-2,2],[-1,5],[-1,6],[-1,5],[1,13],[2,10],[3,5],[4,2],[0,6],[1,5],[1,3],[3,1],[1,-3],[3,-9]],[[6421,5537],[0,-12],[6,9],[8,4],[8,2],[12,-5],[9,-7],[3,-5],[3,-3],[13,-3],[12,-14],[15,-6],[1,0],[2,3],[1,1],[1,-1],[1,-5],[1,-2],[6,-4],[3,0],[2,-4],[3,-17],[3,-8],[0,3],[1,3],[0,2],[3,-5],[3,-2],[3,0],[3,3],[-2,4],[-1,0],[2,9],[2,27],[1,5],[3,-1],[1,-3],[1,-3],[2,-2],[8,-3],[2,-11],[0,-13],[-1,-23],[1,-4],[3,-1],[2,1],[1,4],[1,6],[1,7],[1,9],[3,8],[4,2],[3,-1],[3,-7],[1,-5],[-2,-6],[-2,-6],[-1,-7],[1,-2],[5,5],[2,-1],[1,-8],[0,-42],[0,-11],[-3,-1],[-7,6],[-5,0],[-14,-4],[-2,0],[-4,3],[-3,1],[-2,-2],[-3,-8],[-3,-2],[-4,0],[-4,3],[-5,1],[-4,-6],[-2,-11],[0,-10],[-2,-7],[-6,1],[-6,12],[-2,2],[-7,-2],[-5,3],[-9,12],[-5,2],[-9,-8],[-16,-26],[-9,-11],[-20,-14],[-3,-4],[-3,-2],[-2,-1],[-6,1],[-14,-5],[-4,1],[-6,4],[-2,8],[-1,10],[-12,51],[-2,10],[1,26],[1,11],[3,11],[4,23],[1,27],[3,22],[8,7],[4,1],[10,5],[3,4],[3,8],[2,0],[1,-6]],[[7032,5704],[2,-7],[1,0],[2,1],[2,-2],[2,-18],[0,-5],[-4,-2],[-3,-2],[-5,-11],[-2,-3],[-7,6],[1,15],[4,14],[4,2],[0,3],[1,2],[0,2],[0,5],[2,0]],[[7139,5658],[5,-3],[1,1],[4,6],[2,1],[3,-2],[4,-12],[3,-2],[17,-33],[4,-14],[2,-6],[2,-4],[5,-6],[2,-4],[2,-3],[2,1],[2,3],[2,1],[2,-2],[2,-6],[2,-12],[4,-26],[-2,-19],[-6,-14],[-7,-10],[-9,-3],[-26,19],[-4,0],[-8,-6],[-5,-2],[-33,4],[-4,-3],[-3,-7],[-2,-7],[-3,-3],[-17,-5],[-8,0],[-8,9],[-14,18],[-11,32],[1,13],[3,22],[0,11],[0,8],[0,8],[3,9],[-2,12],[1,11],[3,10],[1,10],[1,14],[1,2],[5,-10],[5,-11],[1,-1],[2,3],[4,14],[0,5],[2,7],[22,42],[2,0],[18,-9],[6,-6],[5,-8],[2,-9],[2,-11],[5,-10],[5,-7]],[[7110,5776],[-1,-11],[-3,-8],[-3,-5],[-4,1],[-12,16],[-8,4],[-5,-1],[-2,-6],[-2,-8],[-3,2],[-4,5],[-4,4],[0,4],[2,11],[6,17],[4,6],[3,4],[3,1],[14,-13],[4,-9],[10,-1],[3,-3],[2,-10]],[[7261,5892],[-4,-1],[-2,0],[1,2],[-1,0],[-4,2],[-3,6],[-1,8],[1,9],[0,7],[-6,10],[-1,4],[1,3],[1,4],[1,3],[2,-1],[2,-5],[1,-7],[1,-5],[4,-6],[2,-5],[8,-4],[1,-9],[-1,-9],[-3,-6]],[[7028,6043],[0,-8],[-9,-7],[-2,0],[-1,2],[-3,8],[-1,2],[-7,2],[-7,-1],[-6,6],[1,25],[2,12],[3,10],[2,11],[1,24],[1,7],[3,4],[6,1],[2,0],[1,-2],[1,-2],[-3,-10],[2,-7],[3,-7],[1,-6],[1,-2],[3,-11],[1,-5],[0,-6],[0,-13],[0,-6],[5,-21]],[[7096,6259],[1,-1],[2,1],[1,0],[2,-8],[1,-4],[4,-15],[1,-12],[-2,-14],[-13,-41],[-2,-12],[-1,-14],[0,-7],[2,-4],[2,-2],[3,-1],[2,-2],[1,-5],[0,-19],[0,-7],[0,-6],[3,-5],[3,-1],[3,2],[2,4],[2,5],[3,3],[14,2],[3,-2],[10,-11],[2,-4],[1,-4],[3,-11],[0,-6],[0,-3],[1,-2],[0,-1],[2,0],[2,-2],[0,-3],[-2,-7],[0,-10],[-3,-9],[-10,-25],[-2,-3],[-2,-1],[-3,-1],[-3,-1],[-4,-9],[-2,-2],[-2,2],[-4,10],[-2,3],[-6,5],[-2,0],[-1,2],[0,4],[-1,5],[-3,2],[-1,3],[0,7],[1,14],[-1,6],[-1,6],[-1,5],[-2,3],[-3,3],[-1,-2],[-1,-3],[-1,-2],[-4,-2],[-12,-18],[-14,-12],[-3,2],[-1,8],[-1,5],[-2,12],[-1,26],[1,8],[7,37],[0,7],[-1,1],[-7,5],[-2,3],[-4,1],[-2,2],[0,2],[-1,8],[0,3],[-1,1],[-3,2],[-1,1],[-4,17],[0,5],[-2,6],[-6,13],[-3,7],[-1,10],[-1,10],[0,10],[2,9],[2,8],[3,9],[1,11],[0,14],[0,5],[-3,15],[3,0],[5,7],[2,2],[2,-2],[3,-5],[3,-10],[1,-3],[2,-2],[1,-3],[1,-13],[1,-7],[2,-6],[2,-2],[4,5],[1,12],[2,13],[1,10],[1,3],[2,2],[2,2],[1,4],[0,5],[1,6],[1,5],[1,2],[1,0],[1,-2],[0,-1],[0,-1],[8,-7],[2,-5],[1,-11],[1,-5],[6,-8],[1,-7],[0,-7],[1,-6],[1,-6],[1,-3]],[[7005,6356],[1,-4],[2,3],[1,0],[2,-2],[1,-5],[2,-7],[2,-2],[6,1],[1,-3],[0,-4],[-1,-6],[-1,-3],[-1,-2],[-4,1],[-2,-1],[-1,-9],[1,-9],[2,-9],[2,-6],[1,-6],[0,-9],[0,-8],[-4,-7],[0,-8],[2,-17],[-1,-4],[-2,-8],[-1,-12],[-1,1],[-2,2],[-1,1],[-5,-13],[-2,-5],[-5,-2],[-13,0],[0,4],[1,2],[1,2],[-4,6],[1,5],[2,4],[2,2],[0,7],[-1,8],[-2,6],[-1,3],[-2,2],[0,6],[1,14],[0,16],[1,5],[1,2],[1,1],[1,2],[-1,14],[-2,16],[-1,13],[3,6],[1,1],[6,6],[2,3],[2,3],[7,-1],[2,4]],[[7513,6378],[-2,-2],[-3,1],[-2,4],[-3,12],[-10,44],[-18,20],[-1,8],[0,9],[0,8],[-2,4],[-5,22],[-1,3],[-5,8],[-2,5],[-2,2],[0,2],[0,4],[2,2],[2,-1],[32,-76],[12,-20],[5,-12],[5,-15],[2,-10],[1,-9],[-1,-5],[-2,-5],[-2,-3]],[[7047,6591],[7,-4],[3,0],[-1,-3],[-2,-9],[4,-73],[1,-13],[0,-8],[-2,-1],[-4,8],[-1,4],[0,5],[0,11],[0,1],[-4,9],[0,-4],[-1,-4],[0,-2],[-2,-2],[-1,14],[0,16],[1,31],[2,24]],[[7049,6689],[-4,-19],[-9,2],[-2,7],[-1,11],[-1,12],[0,8],[1,8],[3,6],[5,4],[4,1],[4,-15],[0,-25]],[[7052,6948],[1,-2],[1,-3],[1,-9],[1,-12],[0,-13],[-1,-10],[-2,-9],[-5,-12],[-5,-8],[-2,3],[-1,6],[-3,9],[-1,10],[4,19],[2,35],[2,-3],[2,-1],[2,1],[1,3],[2,-2],[1,-2]],[[7034,6952],[-4,-1],[-4,1],[-2,4],[-2,11],[-1,12],[-1,7],[1,13],[4,11],[4,4],[8,-13],[3,-8],[0,-11],[-1,-14],[-2,-11],[-3,-5]],[[6825,7265],[-1,-2],[-5,19],[-2,2],[-1,3],[1,7],[3,5],[1,3],[2,-1],[2,-3],[2,-2],[1,-4],[-2,-13],[0,-4],[-1,-10]],[[7188,7801],[0,-14],[-1,-13],[-5,-22],[-3,-10],[-2,-4],[-1,-3],[-1,-6],[-2,-5],[-5,-5],[-1,-7],[-1,-15],[-2,-22],[-2,-10],[-3,-4],[-4,-2],[-3,-3],[-3,-5],[-3,-6],[-1,-10],[-2,-17],[0,-19],[1,-15],[5,-11],[14,-4],[3,-7],[2,-9],[9,-20],[2,-12],[-2,-44],[-1,-7],[-1,-4],[1,-7],[2,-5],[1,-3],[2,-5],[1,-7],[2,-25],[-1,-13],[-4,-31],[0,-17],[0,-19],[0,-5],[-1,-3],[-1,-3],[-1,-3],[-1,-5],[1,-11],[3,-21],[0,-7],[-2,-3],[-5,0],[-2,-1],[-1,-5],[-2,-15],[-2,-6],[-4,-12],[-3,-11],[-4,-24],[-1,-7],[0,-4],[-1,-2],[-3,-4],[-2,0],[-5,1],[-2,-2],[-17,-39],[-19,-28],[-7,-18],[-3,-27],[1,-10],[2,-11],[2,-10],[2,-7],[3,-7],[8,-9],[3,-7],[1,-4],[2,-11],[2,-5],[2,-2],[2,1],[2,-1],[5,-9],[5,0],[4,3],[4,4],[4,7],[8,17],[3,11],[1,9],[1,52],[0,10],[1,10],[13,45],[4,10],[5,7],[4,5],[4,2],[15,0],[4,5],[4,13],[3,13],[1,12],[-2,10],[-3,11],[-4,5],[-9,-5],[-4,2],[-1,13],[3,11],[8,15],[3,10],[4,22],[3,11],[3,9],[10,16],[4,9],[3,6],[10,9],[4,7],[1,5],[2,10],[1,5],[2,3],[5,4],[5,9],[4,5],[5,4],[5,0],[1,-2],[1,-3],[1,-3],[3,0],[2,2],[2,5],[2,11],[3,4],[11,5],[10,1],[15,-5],[2,-3],[0,-4],[0,-6],[0,-4],[-6,-11],[-3,-12],[0,-12],[0,-22],[1,-5],[1,-4],[4,-9],[3,-4],[3,-2],[1,-4],[-1,-7],[1,-10],[1,-15],[-1,-13],[-1,-6],[-4,-5],[-1,-10],[-1,-26],[-2,-29],[-1,-13],[2,-40],[0,-11],[-1,-6],[-1,-3],[-3,-3],[-2,-1],[-3,0],[-3,-1],[-1,-4],[-18,-28],[-3,-7],[-1,-5],[-2,-5],[-13,-10],[-5,-12],[-2,-6],[-4,-2],[-4,-2],[-19,-14],[-4,-4],[-2,-9],[0,-14],[1,-12],[1,-7],[-1,-3],[-3,1],[-5,6],[-2,1],[-4,-3],[-2,-8],[-1,-11],[-1,-12],[2,-9],[3,-10],[7,-16],[6,-18],[4,-10],[7,-6],[4,-8],[3,-2],[7,1],[6,-2],[1,-1],[2,-5],[3,-10],[3,-5],[1,-3],[8,-2],[4,-3],[7,-12],[3,-1],[4,2],[3,0],[3,-2],[2,-4],[3,-2],[3,4],[3,-6],[1,-7],[-1,-19],[-1,-3],[-1,-3],[0,-4],[2,-8],[1,-5],[0,-6],[0,-47],[1,-21],[3,-8],[13,-7],[2,-3],[11,-3],[6,-12],[6,-21],[5,-20],[0,-8],[-9,21],[-3,4],[-3,1],[-29,23],[-4,-4],[-5,8],[-6,6],[-7,5],[-7,1],[-6,5],[-5,12],[-9,24],[-3,5],[-2,1],[-7,-2],[-3,0],[-6,3],[-3,1],[-15,-7],[-7,2],[-6,13],[-5,-4],[-5,8],[-4,12],[-4,9],[-18,4],[-3,-1],[-5,6],[-12,1],[-4,6],[-4,-10],[-4,-8],[-3,-9],[-3,-48],[-3,-12],[-1,-7],[1,-13],[5,-16],[2,-13],[2,-64],[-1,-8],[-1,-8],[-4,-9],[-1,-9],[-1,-12],[0,-26],[2,-24],[2,-19],[6,-34],[5,-33],[4,-20],[1,-28],[1,-12],[2,-10],[6,-19],[1,-9],[0,-13],[3,-27],[1,-11],[9,-39],[3,-22],[6,-15],[3,-9],[19,-89],[12,-34],[12,-27],[2,-7],[5,-17],[4,-9],[7,-9],[4,-6],[1,-9],[-2,0],[-6,10],[-7,4],[-19,4],[-4,3],[-3,4],[-3,5],[-2,11],[1,6],[3,2],[3,-4],[1,0],[-4,21],[-10,16],[-33,34],[-4,8],[-3,10],[-11,72],[-12,49],[-6,42],[-4,10],[-3,14],[-3,3],[-2,2],[-11,17],[-8,15],[-4,3],[-4,6],[-4,16],[-3,18],[-2,12],[1,14],[3,24],[1,13],[-1,68],[1,7],[0,7],[2,14],[1,5],[-1,14],[-3,17],[-1,12],[0,25],[8,68],[0,11],[0,10],[-1,9],[-3,9],[-2,2],[-5,-4],[-2,2],[-10,22],[0,2],[-1,4],[0,2],[-5,8],[-1,5],[-1,4],[-1,5],[0,19],[-2,27],[-1,9],[-1,3],[-2,3],[-1,4],[-2,6],[0,6],[1,26],[2,37],[1,28],[2,15],[7,12],[4,15],[3,16],[1,11],[-3,15],[-7,7],[-9,4],[-6,6],[-3,11],[1,11],[2,10],[1,11],[0,6],[-2,11],[-1,3],[0,2],[-2,0],[-1,2],[1,11],[-1,4],[1,6],[1,6],[-1,6],[-2,6],[-2,0],[-2,-3],[-2,-3],[-1,-2],[-4,-3],[-3,-4],[-3,2],[-1,13],[0,8],[1,5],[2,5],[1,6],[2,9],[0,4],[0,14],[-1,7],[-2,7],[-3,9],[0,11],[2,12],[6,29],[6,21],[5,39],[9,35],[3,22],[-2,18],[-3,15],[2,15],[6,25],[-2,9],[0,5],[-1,4],[1,8],[2,3],[2,1],[1,3],[1,5],[0,7],[0,5],[-3,3],[-1,2],[1,5],[2,9],[3,21],[10,50],[6,17],[5,25],[2,11],[13,28],[5,21],[20,57],[7,14],[1,5],[1,10],[3,11],[4,9],[4,5],[4,-2],[3,-5],[4,-2],[9,13],[2,-6]],[[7124,7846],[5,-3],[4,1],[2,-1],[1,-5],[0,-13],[-2,-13],[-6,-2],[-5,8],[-2,15],[1,11],[2,2]],[[7213,7863],[-3,-7],[-3,6],[-3,12],[-1,11],[0,7],[1,7],[1,6],[2,5],[1,8],[1,6],[2,2],[3,-2],[4,-20],[0,-7],[-5,-34]],[[7306,8047],[5,-29],[2,-9],[3,-4],[9,-32],[2,-27],[-3,-23],[-4,-22],[-4,-21],[0,-39],[-13,-63],[-2,-20],[-2,-6],[-12,-28],[-4,-5],[-32,-9],[-3,-3],[-3,-8],[-6,-11],[-5,-4],[2,13],[3,13],[-1,11],[-7,19],[-2,10],[1,41],[-2,27],[-2,15],[-3,6],[-4,5],[2,12],[9,24],[6,25],[10,53],[8,23],[9,12],[4,9],[2,20],[2,5],[4,9],[2,2],[2,-2],[3,-6],[6,-4],[2,5],[2,11],[3,14],[4,6],[4,-5],[3,-10]],[[1202,4626],[-2,-4],[-5,3],[-3,10],[0,13],[4,10],[-1,-11],[2,-8],[5,-13]],[[1187,4691],[1,-12],[0,-16],[-2,-11],[-4,2],[-2,-3],[-2,-1],[-3,1],[-2,3],[-4,-9],[-1,-5],[1,-2],[3,-2],[1,-4],[-1,-5],[0,-5],[2,-18],[4,-15],[9,-29],[2,-16],[-4,-12],[-3,6],[-4,13],[-2,6],[-2,4],[-5,5],[-2,3],[0,3],[0,11],[0,5],[-2,1],[-1,-1],[-1,1],[-5,10],[-1,5],[0,10],[1,0],[1,-4],[0,-3],[1,-1],[2,-1],[1,3],[-1,5],[-2,9],[-2,13],[0,5],[2,10],[0,5],[-11,30],[-4,2],[-4,0],[-2,2],[1,10],[-2,5],[-7,22],[-1,7],[-1,7],[-3,10],[-1,7],[1,8],[2,7],[0,6],[0,14],[-4,40],[0,15],[2,7],[8,11],[3,-4],[2,-3],[1,-4],[5,-18],[1,-3],[1,-2],[1,-1],[1,-2],[13,-35],[7,-12],[6,-31],[12,-29],[0,-13],[1,-8],[-1,-9]],[[1129,4872],[-7,-3],[-3,-4],[-1,-8],[-1,-15],[-2,-6],[-5,-4],[-6,2],[-5,5],[-3,5],[-1,-8],[-2,-7],[-2,-4],[-3,3],[-1,9],[-1,22],[-1,10],[-3,-1],[0,13],[3,34],[0,17],[-1,12],[-2,8],[-4,6],[2,7],[0,5],[-2,8],[-1,13],[-1,4],[2,22],[1,12],[2,6],[5,-4],[2,-8],[2,-8],[2,-4],[12,-30],[4,-14],[2,-5],[8,-6],[3,-6],[1,-10],[2,-6],[5,-13],[1,-10],[1,-8],[1,-9],[0,-10],[0,-8],[-3,-4]],[[1021,5246],[3,-19],[12,-46],[0,-3],[0,-7],[0,-2],[1,-2],[1,-1],[7,-13],[1,-5],[6,-24],[2,-13],[0,-11],[0,4],[-1,-6],[-2,-1],[-1,3],[-1,13],[-2,3],[-6,0],[-2,2],[-2,4],[-2,5],[-2,5],[-3,1],[-5,1],[-2,2],[-4,8],[-2,9],[-3,8],[-6,4],[-8,-1],[-1,1],[-1,7],[2,6],[1,5],[-2,6],[-2,-3],[0,1],[-1,4],[0,6],[-2,0],[-1,-8],[-2,5],[-3,19],[-5,16],[-1,7],[1,6],[2,2],[3,-2],[2,2],[0,6],[-3,12],[0,23],[3,18],[7,10],[8,-2],[2,-6],[2,-8],[3,-8],[4,-3],[2,-5],[2,-11],[1,-24]],[[850,5948],[4,-12],[2,-14],[-2,-11],[-1,4],[-2,2],[-2,1],[-2,0],[1,-9],[2,-6],[2,-8],[1,-11],[1,-10],[3,-6],[3,-5],[3,-6],[2,-10],[3,-20],[2,-8],[3,-9],[1,-5],[1,-6],[0,-8],[1,-2],[2,-3],[3,-12],[1,-4],[1,-6],[-1,0],[-2,-6],[-1,-6],[1,-4],[4,-3],[2,-8],[2,-21],[5,-20],[6,-13],[4,-15],[0,-25],[-2,3],[-5,13],[-2,0],[2,-11],[3,-13],[7,-21],[2,-3],[2,-1],[2,-3],[0,-7],[0,-16],[1,-10],[2,-4],[3,-1],[4,1],[2,-4],[3,-9],[1,-11],[-1,-9],[3,-11],[1,-19],[0,-19],[-4,-12],[-3,41],[-1,9],[-6,24],[-3,-6],[-1,-1],[-2,-2],[2,-6],[8,-45],[2,-24],[0,-10],[-3,-4],[-2,1],[-5,4],[-6,-2],[-4,-2],[-3,-5],[-3,-6],[-4,-4],[-4,2],[-25,35],[-5,16],[-14,15],[-3,5],[-9,34],[-1,3],[-2,3],[-1,3],[1,22],[-4,24],[-34,136],[-4,6],[-1,2],[0,3],[0,7],[0,3],[-4,20],[-1,6],[-3,13],[1,12],[6,25],[4,24],[1,13],[1,14],[-1,26],[1,13],[1,11],[2,6],[4,4],[4,2],[4,1],[3,-2],[7,-6],[4,0],[4,4],[5,13],[3,3],[9,5],[3,-1],[-1,-12],[6,-3]],[[1308,5038],[-2,7],[-20,79],[-18,99],[-2,4],[0,11],[3,13],[7,23],[2,26],[-1,25],[-3,24],[-1,24],[-2,12],[-3,13],[-13,33],[-1,5],[-1,6],[-2,14],[-10,44],[-11,35],[-3,13],[-2,14],[-2,25],[0,25],[-2,7],[-9,22],[-3,10],[1,3],[1,3],[1,10],[-1,-1],[-1,6],[-1,-1],[1,3],[1,3],[0,3],[1,-1],[-2,24],[-1,14],[-2,7],[-5,3],[-9,14],[-4,5],[-1,2],[-2,6],[-1,3],[-1,-1],[0,-3],[-1,-1],[-5,-2],[-3,1],[-2,6],[1,3],[4,9],[1,5],[0,4],[0,13],[-1,8],[-9,22],[-4,-3],[0,6],[0,10],[1,7],[0,2],[1,2],[1,2],[1,4],[-1,5],[-2,13],[2,3],[2,1],[3,-1],[2,-3],[0,6],[1,5],[-1,5],[0,5],[-5,-2],[-2,7],[-6,31],[-2,41],[-4,29],[-6,25],[-30,88],[-6,20],[-9,46],[-12,41],[-8,18],[-15,28],[-3,7],[-2,13],[-4,11],[-10,15],[-4,11],[-3,11],[0,13],[-1,15],[0,11],[-2,8],[-3,5],[-2,7],[-2,8],[-1,8],[-1,8],[0,10],[0,13],[2,11],[0,13],[-1,13],[-3,14],[-13,29],[-12,36],[-5,10],[-16,25],[-10,9],[-9,4],[-5,0],[-4,1],[-3,5],[-3,9],[-5,23],[-3,7],[-6,3],[-4,-3],[-8,-11],[-4,-2],[-2,1],[-2,2],[-3,3],[-1,4],[-2,6],[-2,1],[-1,0],[-3,-1],[-1,1],[-3,4]],[[3444,1655],[-28,4],[-2,2],[-3,9],[-2,1],[-5,2],[-5,4],[-8,11],[0,-4],[-11,14],[-6,4],[-6,2],[-4,3],[-14,22],[-3,0],[-2,0],[-2,1],[-1,4],[-5,15],[-1,2],[-4,10],[-2,1],[-7,3],[-53,74]],[[7224,1650],[1,-18],[1,-7],[2,-8],[-2,-5],[-2,-3],[-3,-2],[-6,-2],[-6,0],[-6,2],[-5,4],[-1,2],[-2,5],[-1,5],[1,6],[1,7],[1,7],[1,5],[4,3],[4,-5],[6,3],[6,6],[4,1],[2,-6]],[[7401,1643],[0,-9],[-2,-9],[-2,-6],[-2,-1],[-3,1],[-3,4],[-3,6],[-4,5],[-2,-3],[-2,-5],[-3,-3],[-6,6],[-8,13],[-4,13],[6,9],[6,4],[21,-4],[1,-2],[9,-11],[1,-8]],[[7108,1633],[-4,-2],[-5,3],[-6,14],[-3,3],[17,31],[4,2],[5,-1],[4,-3],[4,-9],[2,-12],[0,-11],[-6,-5],[-4,-2],[-8,-8]],[[7139,1715],[8,-4],[16,-15],[17,-7],[8,1],[8,6],[7,-11],[1,-7],[-2,-10],[-12,-25],[-2,-4],[-3,-16],[-4,-4],[-3,2],[-3,4],[-10,16],[-2,4],[-3,1],[-14,3],[-4,3],[-4,5],[-5,12],[-2,9],[-1,12],[-1,6],[-2,4],[-3,4],[1,6],[2,2],[2,1],[3,-1],[7,3]],[[7845,1690],[1,-4],[2,-2],[1,2],[2,8],[1,2],[4,2],[3,4],[4,1],[5,-3],[-4,-16],[-7,-10],[-7,-7],[-8,-15],[-15,-17],[-3,-1],[-6,1],[-11,-9],[-2,-1],[1,-20],[-1,-7],[-3,-7],[-9,-16],[-3,-7],[-3,-2],[-10,0],[2,10],[9,29],[5,10],[2,8],[2,9],[3,3],[2,2],[6,7],[2,3],[2,9],[-1,7],[-1,6],[0,11],[1,10],[2,5],[2,0],[3,-5],[5,-2],[9,29],[5,7],[3,-4],[7,-20],[-1,-5],[-1,-5]],[[7007,1709],[-5,-1],[-11,8],[0,5],[2,6],[-1,18],[1,8],[3,6],[3,3],[3,0],[3,-4],[3,-8],[1,-9],[0,-9],[0,-10],[-2,-13]],[[7560,1884],[2,-2],[8,0],[2,-2],[2,-2],[2,-4],[1,-4],[0,-6],[-1,-15],[0,-3],[3,-4],[2,-9],[0,-10],[-1,-10],[-2,-8],[-8,-21],[-6,-38],[-2,-5],[-3,0],[-15,10],[-1,6],[-20,62],[-2,12],[0,40],[3,17],[7,6],[20,0],[2,-1],[6,-6],[1,-3]],[[7625,1914],[3,-2],[1,-4],[-1,-9],[-3,0],[-3,6],[-1,2],[-3,0],[-1,1],[0,3],[1,3],[1,1],[2,-2],[2,2],[2,-1]],[[7614,1925],[-1,-4],[-3,1],[0,3],[-1,3],[-2,4],[0,6],[-1,5],[1,5],[2,2],[2,-3],[1,-4],[1,-7],[1,-11]],[[7857,1996],[-3,-23],[-2,-11],[-3,-6],[-10,5],[-3,-3],[2,-15],[-12,1],[-4,6],[3,18],[1,4],[2,4],[3,2],[6,2],[3,3],[3,4],[2,5],[1,-2],[0,-1],[2,0],[1,0],[2,4],[3,6],[2,1],[1,-4]],[[6898,1970],[3,-2],[14,4],[3,-2],[2,-7],[1,-9],[1,-10],[1,-9],[1,-7],[-1,-6],[-1,-5],[-2,-3],[-2,3],[-2,4],[-3,2],[-9,-4],[-5,0],[-3,4],[-18,-17],[-2,-3],[-5,-12],[-2,-3],[-5,-5],[-1,-3],[-12,-40],[-1,-4],[1,-5],[0,-6],[-2,-6],[-2,-6],[-3,-13],[-2,-7],[-2,5],[-5,13],[-2,2],[-11,0],[-5,2],[-11,9],[-5,2],[-19,-7],[-4,4],[-3,9],[-4,7],[-5,4],[-6,-5],[-3,4],[-4,0],[-12,-6],[-4,-5],[-3,-2],[-5,0],[-2,-1],[-2,-2],[-1,-2],[0,-8],[-1,-3],[-1,-1],[-2,-1],[-1,-1],[-19,-41],[-5,-5],[-3,5],[0,9],[2,13],[3,10],[1,5],[1,6],[0,42],[1,8],[3,8],[3,6],[3,2],[4,5],[1,12],[1,13],[1,11],[0,1],[4,3],[1,2],[1,4],[2,9],[6,26],[2,6],[2,5],[3,0],[2,-1],[7,-9],[2,-4],[0,-4],[3,-2],[34,-12],[3,2],[6,11],[4,3],[4,-1],[5,-3],[5,-2],[4,4],[11,27],[12,15],[7,13],[4,4],[22,12],[3,5],[2,1],[1,-3],[0,-13],[0,-7],[1,-5],[3,-6],[10,-12],[2,-6],[2,-7],[2,-5]],[[7542,2037],[2,-3],[2,1],[1,2],[2,-2],[-1,-7],[-3,-5],[-3,1],[-2,3],[-4,6],[0,8],[1,7],[1,0],[4,-11]],[[7043,1981],[-3,-4],[-4,0],[-1,9],[-1,11],[0,4],[1,5],[2,2],[2,2],[1,3],[1,5],[-1,10],[-2,19],[0,9],[1,10],[3,2],[7,-3],[5,-8],[3,-3],[4,-1],[3,-3],[1,-7],[-1,-21],[-1,-6],[-3,-5],[-8,-9],[-3,-1],[-1,-1],[-1,-4],[-2,-12],[-2,-3]],[[7799,2076],[6,-15],[3,4],[3,-2],[3,-4],[3,-3],[7,4],[1,-2],[-3,-9],[1,-1],[2,-2],[1,-3],[-1,-4],[-1,-2],[-1,2],[-2,4],[-2,1],[-1,-1],[-2,-5],[-1,-2],[-9,1],[-9,4],[-2,3],[-1,8],[1,9],[3,16],[1,-1]],[[7868,2119],[-3,-5],[-9,-25],[-2,-3],[-3,-3],[-2,-3],[-1,-9],[-2,-4],[-2,-2],[-3,0],[0,4],[1,2],[1,2],[1,8],[-5,0],[-5,-3],[-4,0],[-4,7],[-1,10],[2,10],[2,9],[3,5],[2,2],[2,-1],[4,-2],[3,0],[13,4],[3,3],[3,1],[1,1],[1,1],[1,0],[2,-2],[0,-2],[1,-2],[0,-3]],[[7890,2174],[0,-4],[2,7],[1,-1],[1,-5],[-1,-5],[-1,-3],[-5,-9],[2,-8],[-11,5],[-3,3],[2,3],[2,4],[2,9],[4,15],[1,4],[1,-3],[3,-12]],[[7971,2267],[0,-4],[3,3],[2,4],[3,11],[3,6],[1,-3],[1,-8],[5,-27],[1,0],[-1,-6],[-3,-6],[-3,-4],[-3,-2],[-3,1],[-2,1],[-1,0],[-3,-6],[-2,-7],[-1,-6],[1,-16],[0,-12],[0,-4],[1,-1],[4,-20],[1,-8],[0,-8],[-3,-7],[2,-6],[2,-4],[2,-3],[2,-4],[1,-1],[0,1],[1,0],[1,-3],[0,-4],[-1,-1],[-2,1],[0,-3],[-3,-13],[-1,-13],[-1,-4],[-1,-3],[-2,-1],[2,-13],[-1,-14],[-3,-13],[-2,-26],[-2,-13],[-3,-10],[-3,-4],[-1,-3],[-4,-23],[-2,-4],[-3,-7],[-4,-3],[-6,-3],[-3,-6],[1,-12],[-1,-5],[-2,-4],[-2,-2],[-2,2],[1,-12],[-3,-7],[-3,-3],[-2,-4],[-1,-4],[-10,-20],[-1,-7],[-1,-8],[0,-11],[-2,-8],[-3,-5],[-2,-5],[-2,-10],[2,0],[2,-2],[1,-3],[-1,-6],[-1,-4],[-1,-4],[0,-4],[0,-6],[-3,-8],[-4,-10],[-3,-5],[-2,9],[3,22],[1,12],[-2,5],[-2,2],[-1,3],[-1,0],[-3,-5],[-1,-5],[-1,-14],[-1,-6],[-6,-10],[-8,-1],[-16,3],[-2,6],[1,13],[3,23],[-1,10],[-1,8],[-3,6],[-2,-1],[-2,11],[1,14],[3,12],[4,7],[2,0],[3,-3],[2,0],[2,7],[0,6],[-2,5],[-1,3],[-2,3],[0,3],[4,1],[0,5],[-2,7],[1,8],[-2,-2],[-2,0],[0,4],[-1,6],[-1,0],[0,-4],[-1,0],[-2,16],[2,9],[4,3],[5,-3],[9,-13],[4,-1],[6,5],[-4,2],[-4,5],[-4,7],[-3,20],[0,5],[2,2],[0,3],[1,21],[2,10],[4,20],[1,9],[1,14],[2,11],[3,10],[13,29],[3,3],[2,-3],[1,-5],[1,-4],[2,1],[1,5],[3,18],[1,5],[1,2],[1,2],[1,7],[0,1],[-1,6],[1,6],[1,3],[12,5],[0,4],[-1,5],[0,6],[2,11],[1,7],[5,14],[0,6],[1,5],[1,4],[3,2],[4,1],[2,1],[2,2],[-3,17],[0,12],[1,10],[7,13],[5,7],[6,5],[4,1],[4,-2],[1,-9],[-1,-22]],[[8028,2304],[4,-5],[2,-9],[1,-9],[1,-7],[5,-12],[1,-9],[1,-21],[-1,-12],[-3,-6],[-3,4],[-7,15],[-2,4],[-2,21],[-5,10],[-8,1],[-15,-2],[-7,4],[-2,10],[5,19],[27,2],[4,-2],[4,4]],[[7323,2259],[-8,-24],[-4,6],[-8,18],[-8,10],[-3,7],[-1,12],[2,11],[5,12],[7,11],[6,6],[2,-4],[3,-8],[2,-4],[2,-2],[4,-1],[1,-1],[3,-8],[0,-8],[-2,-6],[-4,-2],[-3,-4],[2,-9],[3,-8],[-1,-4]],[[7424,2366],[-1,0],[-2,3],[-2,6],[0,6],[2,4],[2,3],[2,-1],[2,-8],[-1,-9],[-2,-4]],[[7509,2529],[0,-5],[0,-5],[-3,-14],[-1,-4],[-3,0],[-1,2],[-1,3],[-1,4],[-1,-3],[-1,2],[1,7],[1,9],[3,4],[2,-1],[3,2],[2,-1]],[[7964,2537],[-4,-11],[-4,5],[-4,-8],[0,-11],[5,-10],[-2,-8],[-4,-8],[-3,-4],[-5,12],[2,26],[7,24],[6,11],[5,-2],[2,-7],[-1,-9]],[[8628,2508],[-1,-9],[-4,3],[-7,12],[2,7],[1,5],[-1,11],[1,5],[7,30],[2,23],[1,7],[2,4],[2,3],[2,-1],[3,-4],[2,-5],[1,-8],[1,-8],[-2,-20],[-2,-11],[-2,-7],[-2,-7],[-5,-21],[-1,-9]],[[8640,2633],[-3,-4],[-3,1],[-2,-1],[-1,-3],[-3,-3],[-4,3],[-2,10],[-1,12],[-2,9],[-2,5],[0,7],[1,6],[3,7],[4,5],[5,-1],[4,-8],[4,-9],[1,-11],[1,-6],[1,-7],[-1,-12]],[[7616,2764],[-2,-2],[-2,2],[-1,5],[0,4],[1,2],[3,-4],[2,-3],[-1,-4]],[[8613,2707],[-1,-12],[-3,-8],[-7,-11],[2,-10],[-1,-15],[-4,-8],[-7,10],[-2,7],[-1,9],[-1,8],[0,6],[-1,5],[-5,17],[-3,0],[-3,-2],[-2,1],[-1,7],[-1,5],[-13,16],[-2,4],[0,8],[0,5],[2,5],[1,5],[2,3],[3,5],[1,2],[4,10],[1,3],[2,3],[2,2],[1,1],[2,-1],[1,-1],[3,-5],[7,-10],[2,-5],[5,-17],[4,-8],[4,-3],[2,-3],[3,-8],[3,-10],[1,-10]],[[8663,2684],[-2,-8],[-3,6],[-3,7],[-1,7],[3,5],[0,4],[-3,14],[1,18],[3,15],[4,2],[0,18],[1,9],[1,5],[3,2],[4,-2],[2,-7],[1,-8],[0,-14],[-2,-11],[-4,-20],[-5,-42]],[[8576,2693],[1,-1],[1,2],[1,1],[2,-2],[0,-3],[1,-3],[0,-3],[0,-3],[4,-19],[1,-6],[0,-1],[1,-1],[0,-4],[0,-2],[-2,-1],[-1,-2],[0,-3],[1,-26],[6,-3],[3,-4],[-2,-7],[-1,-6],[-1,-11],[-1,-6],[-6,-14],[-5,1],[-5,4],[-5,-3],[0,-4],[4,0],[2,-7],[1,-3],[-1,-6],[-2,-7],[-3,-7],[-2,-2],[-11,-49],[3,-3],[-1,-8],[-10,-23],[-15,-14],[-8,-17],[-5,-4],[-5,27],[-3,8],[-1,3],[-3,3],[-8,7],[-4,6],[-2,19],[-2,12],[0,6],[0,8],[3,19],[4,46],[4,98],[1,10],[2,4],[0,-6],[3,-10],[12,-6],[5,-11],[-1,11],[-3,16],[-1,10],[-11,-3],[-4,18],[2,56],[-1,20],[-5,39],[-1,20],[1,7],[2,4],[3,1],[3,-3],[2,-7],[2,-9],[2,-7],[7,-5],[4,-7],[7,-19],[6,-13],[3,-3],[1,-2],[1,-5],[0,-6],[-1,-5],[-1,-6],[0,-4],[5,-19],[4,-9],[4,-6],[9,-5],[4,-7],[3,-8],[3,-7]],[[8515,2952],[0,-24],[1,2],[10,11],[2,1],[2,-3],[2,-20],[1,-6],[1,-2],[2,3],[4,6],[-1,-10],[-4,-11],[-2,-8],[-1,-12],[2,-8],[3,-8],[3,-12],[3,2],[3,-6],[8,-29],[2,-3],[4,0],[-2,-7],[1,-2],[4,0],[2,-2],[2,-4],[3,-5],[3,-1],[0,-4],[-5,-2],[-4,-8],[-3,-10],[-4,-8],[-2,-2],[-1,2],[0,5],[-2,7],[-5,12],[-3,5],[-1,-3],[-1,6],[-10,21],[-3,18],[-4,8],[-4,-6],[-5,5],[1,8],[3,9],[2,10],[0,10],[-4,-1],[-6,-13],[-5,21],[-1,27],[3,25],[6,16]],[[8526,3058],[-3,-1],[-3,1],[-2,10],[0,13],[0,12],[2,8],[3,1],[2,-1],[1,-1],[1,-1],[3,-7],[1,-2],[0,-9],[-2,-16],[-3,-7]],[[8199,3183],[-1,-9],[-1,-6],[-1,-5],[3,-4],[2,-1],[3,2],[2,0],[1,-3],[1,-5],[0,-10],[3,-22],[0,-5],[1,5],[0,3],[2,0],[1,-12],[1,-13],[1,-12],[4,-4],[1,-6],[1,-13],[-2,-25],[-2,-14],[-2,-12],[-2,-11],[-3,-10],[-5,-5],[-2,9],[-2,14],[-1,8],[0,-6],[-1,-7],[-1,-5],[-2,-2],[-1,1],[-2,4],[-2,11],[0,-4],[-1,6],[-1,7],[0,16],[0,2],[0,2],[-1,2],[0,4],[0,4],[1,1],[1,0],[1,0],[-1,31],[1,14],[3,0],[-1,7],[-2,21],[-1,1],[-2,0],[-1,1],[0,5],[1,2],[0,4],[0,4],[0,3],[-1,1],[-1,0],[-2,1],[-1,5],[1,11],[-1,3],[-1,6],[-1,5],[-2,5],[0,8],[8,-10],[1,-2],[3,6],[3,8],[2,1],[1,-11]],[[8218,3221],[-1,-5],[1,2],[2,2],[1,1],[1,-2],[1,-6],[-3,-26],[-1,-9],[1,-10],[1,-9],[2,-8],[-1,-5],[-1,-4],[-1,3],[-2,4],[-1,4],[0,6],[0,-9],[-1,-5],[-2,-1],[-2,2],[-1,5],[-3,24],[0,15],[1,18],[4,17],[4,11],[1,-5],[0,-5],[0,-5]],[[8121,3231],[4,-3],[4,4],[-1,-6],[-1,-6],[-2,-5],[-2,-4],[-3,-3],[-1,1],[-1,3],[-3,10],[-2,9],[0,8],[2,5],[6,-13]],[[7079,3248],[1,-6],[-2,3],[1,3]],[[7079,3258],[1,-6],[-3,3],[2,3]],[[8608,3297],[10,-12],[1,-7],[3,-22],[2,-7],[7,-11],[2,-6],[-2,-2],[-4,-6],[1,-3],[1,-3],[1,-11],[-2,0],[0,4],[-5,-3],[-2,-3],[-2,-6],[2,2],[6,-2],[2,-1],[2,-3],[5,-8],[5,-17],[5,-19],[-4,-9],[-3,-15],[-2,-16],[0,-8],[2,-2],[2,-1],[1,-2],[0,-3],[0,-5],[0,-8],[-2,-9],[-4,-13],[-2,-7],[5,-1],[4,-5],[2,-8],[0,-10],[1,-1],[0,-4],[2,-3],[-3,-5],[-4,-6],[-2,-5],[-1,10],[-3,3],[-2,-4],[0,-9],[1,-5],[5,-6],[3,-5],[-3,0],[2,-15],[-3,-1],[-6,6],[-4,6],[-1,4],[-2,4],[-2,3],[-3,1],[-3,-1],[-2,-3],[-2,-4],[-1,-4],[9,2],[3,-4],[1,-13],[2,-6],[9,-20],[3,-4],[9,-29],[1,-8],[-1,-14],[-3,-13],[-4,-11],[-4,-6],[-1,2],[0,1],[-2,1],[0,-8],[-1,-6],[-2,-4],[11,10],[4,8],[0,-6],[0,-5],[-1,-4],[-1,-4],[-1,-5],[2,-12],[-1,-7],[-2,-7],[-4,-23],[-1,-10],[-3,-14],[-16,-17],[-5,-11],[-5,10],[-3,2],[-2,-4],[-1,0],[-3,10],[-1,2],[-1,2],[-4,11],[-1,1],[-2,7],[-9,13],[-2,8],[-3,0],[-13,15],[-1,1],[-1,2],[0,3],[-1,3],[-1,2],[-1,-1],[-1,-2],[-1,-1],[-2,3],[-2,7],[-1,7],[-1,5],[-5,20],[-4,22],[0,21],[4,17],[4,4],[4,-2],[4,0],[4,10],[0,6],[-7,-1],[-5,-1],[-2,7],[1,8],[2,11],[1,10],[-2,7],[-5,18],[0,4],[2,3],[3,6],[2,8],[0,12],[9,11],[-2,8],[0,5],[5,13],[0,7],[-3,8],[-2,-8],[-3,-6],[-2,0],[-1,12],[-2,7],[-4,2],[-7,1],[-4,4],[-3,6],[-6,12],[-1,10],[3,10],[5,8],[4,2],[4,-4],[8,-16],[4,-3],[5,2],[1,7],[1,8],[1,11],[2,5],[3,6],[3,7],[1,8],[1,8],[10,47],[1,-11],[2,-3],[2,3],[2,7],[1,-2],[2,-2],[0,11],[0,6],[-1,5],[-1,5],[-1,3],[0,29],[0,3],[1,4],[1,2],[2,2],[1,0],[1,-2],[1,-2],[1,-3],[3,0],[6,8],[3,2]],[[7133,3306],[-3,-1],[2,6],[1,-5]],[[7128,3345],[1,-6],[-2,2],[1,4]],[[8041,3318],[-2,0],[-2,9],[1,17],[3,12],[2,4],[2,3],[3,0],[2,-11],[-4,-25],[-2,-3],[-1,0],[-1,-1],[-1,-5]],[[8274,3164],[-3,-3],[-2,-5],[-2,-10],[-4,-12],[-5,-17],[-4,-20],[-1,-19],[0,-11],[2,-19],[-1,-10],[-1,-7],[-21,-69],[-3,-4],[0,7],[13,101],[5,16],[1,6],[1,37],[-1,10],[8,34],[3,-3],[4,-4],[1,3],[3,24],[1,24],[1,10],[3,21],[8,68],[5,19],[1,9],[2,24],[2,9],[4,5],[4,-1],[3,-5],[3,-8],[1,-9],[0,-11],[-1,-11],[-3,-4],[-1,-6],[-6,-84],[-6,-44],[-1,-6],[-6,-15],[-2,-3],[-2,-2],[-3,-5]],[[7991,3690],[-2,-4],[-2,7],[-1,13],[0,14],[2,9],[4,-10],[1,-16],[-2,-13]],[[7563,3829],[-2,-9],[-3,10],[1,2],[4,-3]],[[7600,3835],[-1,-25],[-3,-4],[-3,-1],[-4,-2],[-1,5],[-2,2],[-3,1],[-3,0],[4,5],[9,5],[2,4],[1,9],[2,4],[2,-3]],[[7977,3829],[-5,-6],[-1,5],[-8,50],[-3,6],[2,3],[1,1],[2,-2],[1,-2],[4,-13],[4,-22],[3,-20]],[[7914,4048],[-2,-1],[-7,13],[-10,11],[-2,3],[-2,6],[-1,6],[0,6],[0,3],[0,2],[0,3],[1,1],[2,1],[0,-2],[2,-5],[3,-8],[10,-20],[4,-11],[2,-8]],[[7882,4114],[-1,-3],[-3,5],[-2,12],[-2,13],[0,10],[6,-5],[1,-2],[1,-3],[1,-4],[0,-4],[0,-13],[-1,-6]],[[7927,4106],[-2,-6],[-5,2],[-4,9],[-2,9],[-5,28],[-1,10],[1,3],[2,3],[3,4],[5,-5],[2,-14],[2,-18],[2,-14],[2,-11]],[[7011,4192],[-3,-4],[-4,1],[-4,2],[-4,1],[-3,7],[-3,8],[-2,9],[0,13],[6,20],[4,3],[4,-1],[7,-6],[3,-9],[1,-8],[1,-15],[-1,-9],[-2,-6],[0,-6]],[[7349,4320],[-4,-5],[-3,1],[-3,10],[-1,14],[3,10],[4,3],[4,-3],[0,-6],[1,-5],[1,-5],[1,-4],[-3,-10]],[[7270,4359],[-9,-9],[-1,10],[1,11],[2,12],[1,10],[0,8],[1,8],[2,7],[2,5],[7,6],[4,-4],[7,-4],[4,-4],[3,-9],[3,-13],[2,-13],[-4,-5],[-4,-2],[-8,-9],[-9,-2],[-4,-3]],[[7246,4393],[1,-13],[2,-11],[0,-10],[-6,-5],[-1,1],[-5,8],[-3,3],[-1,1],[-2,0],[-1,-4],[1,-7],[5,-20],[0,-5],[0,-4],[-5,-16],[-4,-8],[-5,-4],[-6,-1],[-5,-5],[-3,-9],[-4,-9],[-7,-2],[2,6],[5,8],[1,4],[4,23],[11,21],[4,11],[-4,6],[-4,-4],[-9,-18],[-8,-9],[-6,-10],[-5,-3],[-3,-2],[-4,-11],[-4,-12],[-4,-9],[-7,-1],[-5,6],[-1,10],[-1,12],[-2,13],[1,6],[9,32],[5,11],[11,19],[3,2],[4,1],[18,-3],[2,2],[18,37],[10,11],[10,-4],[4,-11],[-1,-7],[-3,-7],[-2,-10]],[[7320,4415],[2,-4],[2,13],[3,9],[2,0],[4,-14],[1,-12],[0,-40],[-4,7],[-5,12],[-4,8],[-3,-7],[0,-7],[0,-6],[1,-6],[-3,-5],[-2,-1],[-2,3],[-1,6],[-2,8],[1,0],[-3,6],[-2,9],[-2,9],[-4,15],[-1,11],[0,9],[5,2],[3,-1],[2,-2],[3,-12],[2,-4],[7,-6]],[[7074,4580],[1,-1],[6,0],[4,-7],[7,-24],[3,-8],[3,-11],[0,-9],[-4,-4],[-4,3],[-9,11],[-10,5],[-3,6],[-3,8],[-2,8],[1,0],[5,10],[1,1],[2,7],[1,4],[0,1],[1,0]],[[7128,4586],[-3,-1],[-5,0],[-14,-4],[-4,4],[-4,13],[4,13],[6,14],[4,13],[8,0],[2,3],[1,1],[1,-1],[0,-3],[1,-3],[1,-1],[3,-4],[1,-8],[0,-10],[2,-7],[-3,-13],[-1,-6]],[[6931,4665],[4,-9],[6,6],[3,-9],[5,-4],[5,-3],[5,-4],[7,-14],[4,-4],[7,-9],[2,-4],[2,-5],[1,-5],[0,-6],[1,-21],[0,-5],[-1,0],[-3,0],[-3,3],[-2,4],[-3,1],[-3,-8],[-1,-8],[1,-11],[2,-11],[2,-7],[1,-1],[3,-7],[3,-8],[4,-4],[3,3],[2,14],[3,3],[2,-1],[7,-11],[10,-5],[5,-4],[2,-9],[-1,-11],[-4,-27],[-1,-12],[0,-80],[-3,-22],[-5,-10],[-4,0],[-5,4],[-5,2],[-4,-2],[-26,-36],[-3,-2],[-2,-4],[-5,-19],[-2,-6],[-9,-12],[-17,-14],[-11,-13],[-8,-16],[-5,3],[-5,-6],[-4,13],[-4,5],[-15,10],[-7,14],[-7,2],[-19,23],[-12,28],[-4,4],[-9,6],[-10,14],[-4,12],[-3,7],[-9,0],[-6,17],[-2,20],[-4,25],[-13,25],[-4,10],[-4,12],[-2,16],[0,4],[-8,31],[-3,66],[6,46],[4,10],[6,13],[6,12],[4,-6],[2,-15],[3,-8],[6,-7],[5,-5],[4,0],[5,4],[0,15],[7,16],[8,10],[28,21],[65,6],[26,-8],[4,-8],[3,-14]],[[7172,4760],[-3,-13],[-1,-4],[-1,-3],[-2,-16],[-1,-5],[-2,-4],[-4,-2],[-17,-2],[-3,2],[0,7],[2,9],[4,7],[3,3],[2,1],[1,2],[2,8],[1,3],[2,-1],[1,-1],[1,1],[3,5],[1,5],[1,7],[-2,10],[6,0],[3,-2],[4,-5],[2,-6],[-1,-2],[-2,-4]],[[7511,4860],[1,-5],[0,-3],[1,-2],[1,-1],[13,-5],[30,-35],[3,-1],[3,-4],[4,-18],[3,-7],[3,0],[3,3],[2,4],[3,2],[1,-3],[1,-5],[0,-7],[3,-5],[2,6],[4,-4],[3,-8],[4,-11],[4,-5],[18,-11],[36,1],[20,8],[9,-1],[10,-9],[21,-56],[3,-4],[17,-16],[2,-4],[1,-6],[1,-20],[1,-4],[4,-19],[2,-24],[1,-51],[1,-9],[4,-16],[1,-7],[1,-6],[3,-2],[9,2],[9,-2],[6,-6],[6,-11],[3,-14],[-5,-4],[0,-11],[2,-12],[3,-13],[7,-18],[2,-10],[0,-7],[1,-6],[-1,-11],[-1,-7],[-3,-12],[-1,-4],[0,-6],[-3,-11],[-1,-7],[-2,-77],[2,-8],[2,-9],[0,-7],[-5,-3],[-4,5],[-7,16],[-3,4],[-5,1],[-22,22],[-3,1],[-2,5],[-9,28],[-3,6],[-4,5],[-4,4],[-5,1],[-3,4],[-3,8],[-4,16],[-2,7],[-4,5],[-4,3],[-5,1],[-4,3],[-10,18],[-41,36],[-4,11],[-1,2],[-3,1],[-11,11],[-8,10],[-4,8],[-1,7],[-1,4],[-2,8],[0,5],[0,17],[0,5],[-6,20],[-10,9],[-75,21],[-8,-3],[-1,-19],[10,-40],[3,-22],[-7,-15],[-10,1],[-18,24],[-10,8],[-26,5],[-9,7],[-18,24],[-6,4],[-6,1],[-16,-4],[-5,-5],[-5,14],[0,7],[2,12],[8,28],[-3,11],[-4,8],[-4,4],[-5,1],[-5,4],[-2,1],[-1,-3],[-1,-3],[-4,-15],[-13,-13],[-2,-5],[-1,-6],[-18,-41],[-2,-6],[0,-3],[-1,-3],[-1,-4],[-1,-6],[1,-5],[2,-4],[1,-3],[1,-2],[-4,-13],[-9,-3],[-10,1],[-9,-1],[-9,-12],[-5,-3],[-4,4],[-3,7],[-8,10],[-3,10],[-26,112],[-2,5],[-9,2],[-4,2],[-6,7],[-1,-1],[0,2],[0,15],[1,15],[3,17],[0,12],[-3,10],[-4,5],[-7,-5],[-5,-15],[-4,-19],[-3,-18],[-3,-20],[-2,-59],[-1,-8],[-1,-9],[-3,-19],[-2,-7],[-2,-1],[-4,-2],[-2,-1],[-1,-5],[-1,-12],[-3,-13],[-2,-10],[-3,-21],[-1,-11],[0,-5],[2,-6],[-1,-3],[-2,-13],[-1,-6],[-6,17],[1,28],[6,52],[1,26],[-1,13],[-2,6],[-1,4],[-7,24],[-2,34],[-2,9],[-5,12],[0,4],[4,6],[3,1],[4,1],[2,2],[3,5],[5,16],[2,3],[4,3],[5,12],[4,6],[3,3],[5,1],[4,0],[4,-4],[4,4],[-2,19],[0,7],[1,7],[4,10],[1,5],[-3,6],[-5,1],[-3,2],[2,7],[2,2],[5,3],[2,3],[4,21],[0,-2],[0,3],[0,4],[0,3],[1,1],[2,-1],[1,1],[0,5],[1,7],[1,6],[2,4],[3,1],[5,-3],[37,0],[8,6],[9,2],[8,6],[4,1],[5,-2],[8,-8],[6,-2],[43,-1],[9,-3],[5,0],[9,4],[9,6],[15,18],[8,6],[3,-10],[1,-20],[-2,-24],[4,-6],[5,-25],[4,-6],[2,1],[5,3],[2,1],[1,-1],[1,-2],[0,-1],[1,-1],[2,2],[0,3],[-1,4],[0,4],[0,1],[-1,2],[0,3],[2,2],[1,0],[1,-3],[1,-1],[2,-7],[2,0],[1,9],[1,6],[3,5],[8,7],[11,17],[6,6],[2,9],[0,10],[2,10],[6,9],[9,4],[17,0],[3,3],[1,0]],[[4727,1542],[-2,-10],[-7,-29],[-2,-6],[-1,-8],[-1,-44],[-3,-11],[-9,-24],[-2,-12],[-4,-18],[-4,-19],[-6,-28],[-8,-20],[-4,-14],[2,-18],[0,-9],[0,-6],[3,-1],[2,10],[2,4],[2,-5],[2,-2],[3,-6],[4,-3],[-6,-19],[-9,-4],[-3,3],[-7,-13],[-6,-1],[-3,6],[4,14],[2,13],[2,15],[-3,4],[-7,-2],[-6,-11],[0,-16],[1,-20],[0,-23],[-3,3],[0,7],[0,8],[-2,7],[-2,1],[-2,-8],[-2,-1],[-1,3],[-1,5],[-1,6],[-2,2],[-4,-2],[-8,-9],[-4,-1],[-1,1],[-2,6],[-1,1],[-3,-1],[-2,-6],[-2,-1],[-2,3],[-4,16],[-2,5],[-3,2],[-11,0],[0,-8],[-3,-4],[-3,1],[-3,6],[3,2],[1,4],[1,5],[-2,4],[-2,2],[-2,-2],[-2,-3],[-2,-1],[-1,-3],[1,-8],[0,-11],[-2,-3],[-2,0],[-2,2],[-2,3],[-1,5],[-2,14],[-2,5],[-2,5],[-1,0],[-1,-3],[-4,-2],[-3,2],[-13,20],[-6,3],[-3,14],[1,13],[0,13],[4,14],[4,-3],[2,3],[1,-5],[1,-7],[1,-6],[6,1],[5,-1],[3,1],[3,4],[3,6],[2,-3],[2,-1],[2,-2],[3,-1],[1,2],[1,4],[1,2],[2,0],[1,-3],[1,-6],[2,-6],[2,10],[3,4],[0,6],[-6,7],[0,25],[2,20],[0,36],[-2,33],[-5,13],[-2,32],[4,18],[5,5],[6,-1],[1,2],[2,4],[1,10],[1,4],[4,7],[6,9],[3,6],[19,53],[4,7],[19,20],[4,1],[7,-10],[16,-12],[9,-4],[3,-4],[4,-8],[4,-3],[9,-3],[8,-8],[8,-17],[6,-21],[2,-23]],[[4903,1549],[-4,-3],[-2,2],[-7,12],[-2,6],[1,5],[2,8],[3,20],[0,8],[-2,10],[-2,4],[-2,2],[0,2],[0,25],[0,8],[1,7],[1,4],[12,16],[4,3],[22,-2],[1,-4],[3,-2],[1,-4],[1,-6],[0,-5],[-2,-3],[-4,-6],[-6,-15],[-4,-17],[-12,-66],[-3,-9]],[[5240,1625],[-5,-6],[-6,0],[-6,16],[0,26],[4,25],[10,10],[6,-9],[4,-12],[1,-14],[-2,-18],[-3,-9],[-3,-9]],[[4994,1714],[2,-5],[2,1],[2,4],[2,0],[4,-2],[10,-1],[10,-5],[7,-12],[4,-23],[1,-23],[1,-12],[2,-5],[1,-4],[7,-24],[5,-24],[2,-7],[1,-1],[1,1],[1,2],[8,-18],[1,-2],[4,2],[4,6],[4,8],[6,15],[1,6],[1,6],[1,2],[3,3],[2,5],[3,14],[4,5],[5,2],[4,-1],[2,-3],[4,-8],[2,-1],[9,0],[2,-1],[1,-3],[1,-2],[1,-2],[8,-3],[1,-1],[4,-10],[7,-39],[-2,-10],[0,-14],[-1,-27],[-6,-41],[0,-9],[3,-3],[3,8],[3,11],[1,6],[1,5],[2,15],[3,11],[-1,6],[-1,6],[-1,8],[1,23],[3,18],[5,14],[5,10],[7,8],[10,4],[11,0],[9,-4],[5,-4],[4,-4],[2,-7],[1,-13],[1,-17],[3,-29],[6,-30],[-1,-22],[-3,-23],[1,-21],[0,-15],[1,-13],[2,-9],[6,-4],[3,2],[4,4],[4,5],[3,5],[0,6],[-1,5],[-1,4],[5,3],[1,4],[0,6],[0,7],[1,4],[3,-8],[4,-13],[1,-10],[-1,-1],[-1,-2],[-1,-1],[1,-5],[-1,-3],[-2,-3],[-1,-5],[0,-9],[1,-8],[1,-8],[1,-8],[-2,-1],[0,-2],[0,-4],[1,-5],[-4,-6],[-3,-6],[-3,-2],[-4,6],[-1,-8],[-1,-3],[-2,1],[-2,4],[-3,3],[-3,-1],[-2,-2],[-14,-6],[-4,2],[-6,13],[-5,19],[-1,3],[-4,2],[-1,-2],[-1,-6],[-2,-7],[-5,-4],[-10,7],[-4,-7],[-6,6],[-4,-4],[-4,-9],[-6,-9],[2,-4],[4,-9],[2,-3],[2,0],[17,-1],[18,-7],[4,-4],[2,-6],[1,-4],[2,-8],[0,-4],[-1,-5],[-3,-3],[-5,-2],[-2,0],[-5,3],[-2,0],[-3,4],[-1,1],[0,-2],[-1,-2],[-2,-3],[-1,-1],[-3,4],[-8,19],[-5,5],[-9,2],[-10,-5],[-44,-34],[-11,7],[-6,34],[1,15],[3,12],[3,11],[3,15],[1,10],[0,9],[0,8],[-1,9],[-1,9],[-2,9],[-1,8],[0,11],[-3,-8],[-1,-13],[1,-26],[-2,-7],[-4,-4],[-4,-2],[-4,-5],[-6,-20],[-2,-19],[-1,-4],[-2,-3],[-3,-1],[-25,-57],[-4,-2],[-4,5],[-5,8],[-4,3],[-2,-1],[-7,-7],[0,1],[-1,2],[-1,1],[-1,1],[-2,-7],[-2,-4],[-2,-7],[-23,-33],[-3,5],[-1,0],[-2,-2],[-2,-1],[0,2],[-2,11],[-1,3],[-3,0],[-2,-3],[-1,-5],[-2,-4],[-2,-3],[-2,-1],[-3,0],[-1,1],[-2,3],[-2,3],[-2,7],[-3,-2],[-3,-3],[-1,-1],[-9,-11],[-24,-38],[-8,-9],[-10,-7],[-18,-15],[-12,-3],[-8,7],[-5,4],[-11,10],[-7,0],[-5,-5],[-4,-17],[-2,-9],[-3,-9],[-12,-6],[-14,-3],[-4,13],[-4,8],[-5,7],[-5,-3],[-4,1],[-13,10],[-4,2],[-5,4],[-7,14],[-3,-2],[-1,7],[-2,12],[-4,12],[1,10],[3,14],[-1,10],[-1,13],[-1,6],[6,14],[3,14],[9,5],[2,11],[-1,7],[-1,4],[-2,3],[0,2],[-1,4],[-1,6],[-2,6],[-4,-2],[-1,6],[1,20],[0,14],[-5,8],[9,49],[9,6],[2,11],[0,28],[4,-9],[2,-2],[3,-1],[2,1],[21,18],[10,17],[13,25],[7,12],[-1,13],[5,7],[7,4],[4,4],[5,-16],[3,-2],[7,-1],[3,-3],[3,-6],[6,-9],[8,-16],[17,-20],[-1,9],[1,8],[1,6],[1,8],[0,11],[1,1],[2,-3],[3,-3],[11,0],[5,3],[3,5],[3,-10],[2,-38],[3,-17],[1,13],[1,28],[2,8],[3,-4],[1,-11],[1,-40],[1,-9],[2,-7],[11,-14],[3,1],[2,3],[2,2],[3,-2],[-1,-4],[-1,-4],[3,-2],[2,-2],[1,-3],[2,-6],[-1,-1],[-1,-5],[0,-4],[2,-2],[2,0],[1,-2],[1,-2],[0,-4],[-2,1],[-2,-1],[-2,-2],[-1,-2],[2,-9],[2,-21],[2,-8],[4,-6],[4,0],[14,12],[1,-1],[2,-3],[0,-6],[0,-4],[1,-2],[2,-1],[4,-1],[4,-4],[4,-7],[4,10],[9,26],[4,5],[0,2],[1,4],[2,3],[1,1],[0,4],[2,1],[2,0],[8,5],[8,0],[2,-1],[4,-6],[1,-1],[12,1],[4,3],[4,6],[2,10],[0,11],[-2,11],[-3,8],[-3,3],[-1,3],[-2,5],[-2,4],[-1,-2],[0,-4],[-1,-3],[-3,-7],[-3,16],[-10,22],[-3,15],[-2,0],[-2,-6],[-3,5],[-6,18],[-4,4],[-5,-4],[-7,-10],[-3,3],[-4,5],[-3,6],[-4,11],[-12,20],[-13,26],[-3,9],[-5,20],[-3,10],[-6,12],[-3,9],[-2,5],[-2,2],[-1,7],[1,15],[2,16],[2,11],[2,6],[2,2],[2,-1],[1,1],[6,10],[1,2],[4,2],[18,18],[5,3],[9,1],[1,-3],[1,-7]],[[6321,2950],[-2,-10],[-4,4],[-1,5],[0,15],[-2,6],[-2,5],[-6,4],[-2,4],[-3,11],[-1,12],[1,13],[2,14],[2,-6],[11,-20],[2,-7],[2,-15],[2,-7],[2,-13],[-1,-15]],[[6264,3209],[1,-14],[-4,4],[-3,10],[-6,23],[-4,9],[-4,7],[-3,8],[-2,12],[3,0],[6,-1],[3,-9],[3,-10],[3,-4],[6,-6],[1,-13],[0,-16]],[[6226,3331],[-3,-6],[-6,1],[-4,5],[-3,9],[-8,43],[-1,16],[5,3],[5,-4],[7,-2],[6,-6],[3,-14],[0,-32],[-1,-13]],[[5853,3491],[4,0],[2,2],[3,12],[2,3],[2,-2],[1,-5],[3,-35],[3,-9],[5,2],[3,-9],[2,-6],[2,-9],[0,-15],[0,-5],[-2,-1],[-1,-3],[-1,-7],[1,-16],[0,-96],[-1,-11],[-3,-9],[-4,0],[-4,2],[-3,-4],[-3,1],[-7,28],[-3,10],[-3,2],[-2,1],[-2,0],[-2,5],[-1,5],[-2,13],[-9,35],[-4,24],[1,6],[0,17],[1,7],[2,7],[2,7],[1,8],[0,7],[1,4],[6,3],[2,3],[0,5],[-2,7],[-4,12],[2,9],[4,9],[4,6],[3,4],[-1,-9],[0,-9],[2,-6]],[[6040,3577],[-1,-5],[-2,0],[-2,3],[-3,0],[-1,-5],[0,-7],[-3,-9],[-13,-39],[-4,-14],[-9,-48],[-1,-12],[2,-6],[2,0],[3,0],[1,-2],[0,-8],[-1,-6],[-2,-3],[-5,-4],[2,-4],[5,-6],[4,-6],[1,-3],[0,-7],[1,-14],[-1,-15],[-1,-13],[-3,-7],[-2,8],[-2,-8],[-1,-14],[-1,-12],[-1,-8],[-1,-4],[-2,0],[0,4],[-1,3],[-2,-3],[-3,-8],[-4,-1],[-1,24],[1,29],[-2,14],[-1,5],[-2,9],[-2,3],[-3,-12],[0,-7],[0,-12],[0,-6],[-3,-20],[-3,-8],[-4,-2],[-4,4],[-4,10],[-2,14],[2,8],[8,11],[0,3],[-4,0],[-3,2],[-2,0],[-3,-5],[-2,-6],[-1,-6],[0,-19],[-1,-7],[-3,-3],[-11,0],[-3,2],[-2,3],[-2,7],[1,4],[-2,10],[0,11],[1,12],[6,25],[1,13],[1,14],[2,44],[1,12],[2,9],[2,2],[6,4],[1,4],[0,3],[4,15],[-1,8],[-1,11],[-1,30],[-3,14],[-2,24],[-2,18],[-3,16],[-3,9],[0,4],[4,12],[4,29],[4,12],[5,5],[14,3],[6,4],[7,9],[15,32],[13,19],[7,7],[4,-2],[4,-8],[2,-9],[3,-76],[0,-42],[1,-7],[3,-11],[1,-3],[0,-5],[1,-10],[0,-7],[1,-13],[-1,-7]],[[6134,3738],[1,-20],[1,-62],[-2,-15],[-3,3],[-2,12],[-1,24],[0,2],[-3,10],[0,2],[-2,2],[-1,6],[0,7],[-1,5],[-6,5],[-4,-34],[-5,17],[-1,-3],[-1,-3],[-1,-2],[-3,7],[-2,-7],[0,-26],[0,-4],[-5,-7],[-1,-6],[-1,-19],[0,-7],[1,-24],[0,-12],[-6,-9],[-3,-10],[-2,-11],[-1,-7],[1,-7],[1,-5],[1,-4],[0,-4],[2,-15],[0,-8],[0,-13],[-1,-10],[-6,-27],[-1,-13],[0,-11],[4,-4],[5,6],[3,14],[4,12],[5,3],[3,-4],[1,-5],[0,-5],[1,-5],[7,-6],[1,-10],[3,-7],[7,-10],[8,-13],[5,-10],[2,-11],[-1,-11],[-3,-9],[-5,-15],[-4,-18],[-3,-7],[-9,-6],[-8,-14],[-5,-3],[-3,2],[-5,15],[-3,3],[-4,-3],[-18,-29],[-4,-9],[-3,-22],[0,-7],[1,-3],[2,1],[6,7],[2,0],[1,-16],[-4,-26],[-11,-39],[-4,-23],[-3,-7],[-5,-3],[-1,3],[0,15],[-1,5],[-3,7],[-1,-4],[-2,-10],[-1,-6],[-1,-2],[-2,5],[0,6],[1,14],[-1,6],[-3,-1],[-7,-22],[-3,-8],[-5,0],[-3,10],[-16,92],[17,40],[2,8],[0,8],[-5,5],[1,7],[6,21],[2,19],[1,1],[2,0],[1,1],[3,10],[4,22],[2,8],[4,4],[6,3],[5,5],[3,13],[0,10],[-1,3],[-10,-11],[-2,0],[2,10],[-2,7],[0,8],[4,13],[1,8],[0,15],[0,9],[4,17],[2,10],[-1,10],[-2,3],[-3,-2],[-3,-4],[-3,-1],[2,10],[13,28],[2,10],[1,13],[1,15],[-1,13],[-1,6],[-1,6],[-1,6],[0,6],[2,4],[2,0],[3,2],[1,8],[-2,100],[2,23],[3,25],[6,34],[1,13],[1,8],[3,8],[21,42],[5,4],[6,0],[4,-3],[-5,-19],[1,-11],[4,-10],[13,-31],[4,-11],[6,-23],[2,-13],[1,-14],[-1,-6],[-2,-11],[0,-7],[0,-6],[2,-3],[1,-2],[1,-4]],[[6106,4138],[4,-6],[4,1],[4,6],[5,4],[5,2],[5,-2],[6,-13],[4,-21],[0,-23],[-3,-19],[-9,-39],[-6,-20],[-7,-10],[-11,2],[-9,15],[-8,22],[-7,26],[-2,12],[-2,25],[-1,11],[2,7],[5,10],[3,7],[4,15],[2,4],[4,-3],[4,-4],[4,-9]],[[6127,4375],[-4,-2],[-4,1],[-3,-9],[-2,-7],[-4,6],[-5,10],[-2,8],[-1,5],[0,6],[2,2],[2,2],[13,14],[3,-3],[3,-8],[2,-9],[0,-16]],[[5937,4393],[-2,-6],[-2,10],[1,13],[3,11],[4,7],[2,-3],[3,-8],[1,-8],[1,-8],[-2,0],[-4,-3],[-5,-5]],[[5968,4447],[-3,-4],[-2,5],[-2,10],[-3,18],[0,6],[0,7],[1,7],[1,5],[1,1],[1,1],[0,-1],[1,-1],[1,-4],[1,-10],[1,-5],[5,-10],[1,-2],[0,-7],[-2,-9],[-2,-7]],[[5783,4746],[16,-6],[24,-1],[8,-6],[52,-58],[5,0],[12,3],[4,-1],[4,-2],[3,-4],[5,-7],[18,-40],[10,-34],[1,0]],[[5945,4590],[-4,-12],[-6,-33],[2,-17],[3,-2],[9,-11],[3,-5],[1,-11],[1,-16],[-1,-12],[-4,1],[2,6],[-2,8],[-3,5],[-4,1],[1,6],[1,2],[-3,8],[-3,4],[-3,3],[-3,5],[-1,-6],[-1,-6],[-2,-3],[-3,3],[1,-11],[2,-9],[2,-8],[2,-6],[2,-10],[0,-13],[-2,-12],[-3,-18],[-1,-4],[-1,-2],[-3,-4],[-2,-3],[-5,-3],[-3,-4],[0,-9],[1,-13],[5,-21],[2,-8],[3,-8],[4,-5],[5,-3],[3,-3],[2,-8],[2,-9],[3,-8],[4,-6],[5,-1],[9,3],[5,-4],[2,-9],[4,-24],[13,-47],[4,-7],[4,-3],[15,0],[3,-1],[1,-3],[2,-4],[1,-7],[0,-6],[-5,-4],[-1,-3],[-2,-3],[-1,-10],[-3,-2],[-5,-1],[-5,-4],[-3,-4],[0,-3],[10,-2],[5,-3],[4,-5],[3,-8],[2,-10],[0,-11],[0,-25],[1,-11],[2,-12],[2,-9],[4,-2],[1,2],[0,4],[0,5],[0,5],[6,-9],[9,-4],[8,0],[6,5],[-12,32],[-3,15],[7,5],[9,-10],[6,-21],[4,-26],[3,-35],[0,-12],[0,-11],[-3,-18],[0,-12],[2,-25],[1,-25],[-1,-11],[-3,-5],[-5,-2],[-1,-6],[-2,-8],[-2,-8],[-3,11],[-15,30],[-8,21],[-5,9],[-7,2],[3,-12],[9,-22],[1,-5],[2,-12],[2,-6],[1,0],[3,1],[0,-1],[1,-4],[0,-2],[-1,-2],[0,-4],[1,-7],[1,-4],[0,-11],[-1,-6],[-2,-4],[-3,-1],[-2,3],[-6,18],[-2,0],[-1,-4],[1,-5],[1,-3],[-3,-7],[-2,2],[-3,13],[0,15],[-6,14],[-9,7],[-8,-6],[-7,-12],[-7,-4],[-7,2],[-8,8],[-8,-12],[-9,-9],[-10,-5],[-14,-3],[-2,-1],[-1,-2],[-4,-8],[-2,-3],[-5,-3],[-4,-9],[-1,-2],[-8,-2],[-2,-2],[-4,-13],[-5,-23],[-4,-26],[-2,-22],[1,-27],[4,-20],[5,-17],[5,-13],[1,-2],[4,-2],[0,-5],[-4,-3],[-5,-14],[-2,-3],[-5,-1],[-10,-6],[-4,-1],[-23,5],[-4,4],[-6,11],[-4,5],[-3,0],[-3,-3],[-5,-2],[-5,3],[-1,0],[-1,-5],[-1,-2],[-2,-2],[-3,-2],[-2,0],[-4,8],[-6,20],[-4,5],[-3,2],[-13,14],[-2,5],[-11,41],[-1,7],[-1,1],[-1,0],[-1,0],[0,3],[-2,19],[1,25],[4,48],[4,36],[2,25],[1,24],[-1,47],[1,17],[0,6],[1,5],[2,3],[3,0],[1,-5],[-1,-6],[-2,-5],[7,9],[7,41],[3,47],[-8,28],[-8,11],[-27,13],[-17,19],[0,6],[-4,8],[0,6],[-1,6],[-1,7],[-3,9],[-3,6],[-3,-2],[-3,-5],[-3,-3],[-2,5],[1,12],[2,14],[1,10],[-2,11],[-4,4],[-8,1],[-6,2],[-3,4],[-12,39],[-46,113],[-4,24],[-2,18],[0,6],[1,8],[2,13],[0,6],[2,14],[4,13],[5,11],[4,13],[4,24],[3,11],[3,5],[2,1],[2,3],[2,5],[1,5],[1,5],[2,4],[2,2],[2,3],[2,11],[1,32],[0,14],[-1,15],[-1,7],[-2,3],[-1,4],[1,10],[3,16],[0,8],[2,11],[1,7],[-1,25],[1,6],[1,9]],[[6281,5291],[1,-7],[-1,-6],[-1,2],[-3,10],[-1,-1],[-3,0],[-2,4],[1,7],[3,15],[2,3],[2,-7],[0,-9],[2,-11]],[[6233,5343],[-2,0],[-1,8],[0,9],[0,20],[1,0],[0,-5],[2,-23],[0,-9]],[[6249,5357],[-6,-10],[-1,14],[1,13],[3,7],[3,-5],[0,-5],[2,-8],[-1,-4],[-1,-2]],[[6276,5328],[1,-5],[-3,3],[-1,-2],[-2,-3],[-2,-2],[-5,3],[-3,4],[-1,7],[-4,34],[0,16],[4,13],[12,-32],[2,-6],[1,-7],[1,-23]],[[6109,5383],[-2,-3],[-3,0],[-1,6],[0,30],[1,13],[4,23],[1,7],[0,7],[1,4],[4,-2],[3,-5],[0,-3],[2,-6],[2,-13],[0,-15],[-2,-10],[-2,-4],[-3,-6],[-3,-8],[-1,-8],[-1,-7]],[[6157,5455],[-3,-8],[-5,1],[-2,10],[2,12],[11,32],[6,11],[1,1],[1,1],[2,-4],[1,-6],[1,-7],[-1,-7],[-2,-4],[-5,-6],[-1,-5],[-6,-21]],[[6212,5558],[3,-1],[2,2],[2,-3],[2,-5],[1,-7],[0,-10],[0,-7],[-1,-13],[0,-8],[-2,-9],[-3,-6],[-2,-2],[-1,-2],[-2,-1],[-2,1],[-2,-1],[-3,3],[-2,6],[-2,2],[0,-4],[-2,-2],[-2,2],[-2,6],[0,4],[-2,14],[0,12],[0,9],[0,9],[1,2],[0,3],[1,4],[1,5],[0,6],[-1,3],[-1,2],[-1,4],[0,4],[0,3],[1,8],[2,12],[2,9],[2,2],[3,0],[0,4],[0,9],[1,2],[2,-3],[2,-7],[3,-29],[0,-6],[-1,-4],[0,-11],[3,-11]],[[6132,5821],[10,-40],[-2,-6],[-2,-5],[-1,-4],[-4,-2],[-1,-3],[-1,-7],[0,-16],[1,-7],[2,-5],[2,-5],[1,-5],[1,-9],[0,-19],[1,-9],[5,11],[3,13],[7,29],[1,2],[2,4],[1,2],[3,12],[2,17],[2,8],[3,4],[4,-1],[2,1],[1,2],[2,0],[0,-5],[1,-7],[0,-5],[3,-6],[2,5],[1,7],[3,4],[2,-3],[5,-13],[4,-3],[4,-2],[4,-3],[2,-8],[1,-11],[-1,-12],[-3,-21],[-1,-13],[1,-18],[-1,-6],[-1,-6],[-5,-16],[-9,-20],[-2,-3],[-4,-3],[-2,-3],[-4,-5],[-6,11],[-4,-8],[-1,23],[-2,10],[-4,4],[0,3],[0,7],[-1,7],[-2,3],[-2,0],[-2,-1],[-2,-2],[-2,-5],[-4,-22],[-2,-26],[0,-53],[0,-13],[-2,-6],[-2,3],[0,14],[-1,6],[-3,-1],[-8,-16],[-2,2],[-1,5],[-2,6],[-7,5],[-2,3],[-1,6],[0,6],[1,6],[1,2],[3,3],[10,17],[1,20],[-4,78],[0,18],[0,6],[-1,4],[-2,3],[-1,0],[-2,-14],[-3,-5],[-3,-3],[-3,-5],[-5,-28],[-2,-5],[-2,-4],[-2,-9],[-3,-19],[-4,-17],[-4,-14],[-16,-39],[-5,-9],[-5,3],[-14,84],[-1,24],[1,26],[2,26],[4,24],[13,53],[3,5],[5,-2],[8,-9],[3,-1],[3,3],[4,11],[3,2],[9,4],[9,0],[1,-2],[1,-4],[2,-4],[3,-2],[3,2],[1,5],[0,7],[1,6],[3,4],[1,-2],[1,-4],[2,-2]],[[5839,6267],[9,-16],[1,-5],[2,-14],[1,-6],[0,-9],[-2,-8],[-2,-5],[-4,-2],[-1,3],[-5,13],[-3,4],[2,-14],[0,-4],[-3,-2],[-3,2],[-4,8],[-2,2],[-9,4],[-3,2],[-2,-1],[-5,-31],[-3,-5],[-4,-4],[-3,-1],[-3,4],[0,8],[2,11],[6,26],[2,6],[3,5],[7,9],[1,3],[3,17],[6,-14],[4,3],[5,8],[7,3]],[[5880,6306],[2,-4],[0,-8],[0,-11],[-2,-11],[-4,-8],[-4,-3],[-5,6],[-4,-7],[-7,-1],[-7,4],[-5,8],[-4,10],[0,6],[1,6],[1,8],[1,7],[2,1],[4,-1],[1,-1],[1,-2],[1,-2],[2,0],[0,3],[0,11],[1,3],[8,-2],[3,-2],[6,-7],[2,-1],[3,0],[3,-2]],[[5902,6283],[-1,-6],[-3,-5],[-2,2],[-2,4],[-3,1],[-1,-5],[0,-7],[-1,-4],[-3,6],[-2,26],[0,14],[1,20],[2,16],[4,3],[2,-30],[1,-4],[5,-10],[2,-5],[1,-8],[0,-8]],[[5912,6383],[-3,-15],[3,0],[3,-1],[2,-3],[1,-6],[1,-2],[3,-5],[1,-3],[-1,-5],[-1,-1],[-2,2],[-1,4],[-1,0],[-3,-2],[-8,11],[-3,3],[-1,6],[3,13],[4,9],[3,-5]],[[5942,6368],[4,-5],[3,-6],[2,-9],[-1,-11],[1,-13],[1,-12],[2,-9],[-2,-4],[-4,15],[-7,38],[-6,12],[-2,-1],[-3,-3],[-1,0],[-2,2],[-3,10],[-4,9],[0,5],[1,7],[2,-4],[6,-6],[1,-1],[1,-4],[2,-3],[9,-7]],[[5789,6387],[-5,-3],[-6,12],[-1,23],[6,11],[8,0],[3,-13],[-1,-17],[-4,-13]],[[5584,7122],[-3,-1],[-8,15],[-5,2],[2,3],[2,1],[3,-1],[2,-3],[2,-2],[2,-4],[3,-10]],[[5520,7111],[-2,-1],[-2,4],[0,11],[0,11],[2,7],[3,3],[2,-5],[1,-9],[0,-10],[-1,-4],[-2,-4],[-1,-3]],[[5726,6778],[-1,-1],[-2,2],[-5,8],[-3,3],[-5,0],[-9,-10],[-4,-3],[-5,0],[-3,-2],[-3,-5],[-3,-9],[-3,-10],[-1,-4],[-2,-2],[-2,0],[-8,4],[-4,3],[-6,14],[-3,4],[-4,-1],[-7,-9],[-13,-5],[-4,0],[-3,6],[-1,4],[-1,9],[-1,3],[-2,2],[-6,3],[-1,2],[-1,4],[-1,4],[-2,2],[-2,-1],[-4,-3],[-2,0],[-5,6],[-6,18],[-5,4],[-38,-1],[-4,-3],[-16,-23],[-4,-1],[-4,-3],[-3,-7],[-2,-9],[-2,-6],[-6,-11],[-9,-26],[-13,-51],[-12,-38],[-5,-22],[-1,-6],[-2,-21],[-1,-5],[-3,-11],[-1,-12],[-1,-27],[-2,-27],[-2,-14],[-3,-10],[-7,-16],[-1,-6],[-1,-6],[1,-15],[-1,-27],[-2,-13],[-2,-10],[-1,-11],[0,-14],[5,-77],[1,-12],[6,-21],[2,-13],[-1,-6],[-2,-12],[0,-6],[0,-7],[2,-14],[4,-57],[3,-25],[34,-137],[2,-7],[10,-19],[5,-4],[5,7],[5,9],[4,6],[5,-2],[3,-9],[2,-12],[3,-12],[2,-3],[2,-2],[5,-1],[2,-3],[2,-6],[2,-15],[14,-55],[1,-7],[1,-7],[-1,-6],[-2,-5],[0,-4],[0,-6],[-1,-7],[-1,-15],[0,-9],[1,-7],[10,-31],[3,-12],[2,-24],[2,-14],[3,-12],[3,-6],[13,17],[0,4],[15,10],[5,2],[1,-3],[-2,-19],[2,-4],[2,-4],[5,-3],[5,0],[15,5],[4,3],[3,0],[2,-2],[5,-14],[2,-4],[9,-3],[7,9],[6,15],[7,34],[2,10],[1,22],[2,28],[2,11],[2,7],[4,9],[4,9],[3,3],[2,4],[2,9],[4,19],[5,20],[13,28],[12,51],[5,17],[10,27],[3,5],[5,2],[9,0],[1,3],[1,6],[-1,6],[1,6],[2,2],[5,5],[2,1],[3,-1],[1,-3],[2,-3],[1,-1],[0,-36],[0,-9],[6,-12],[2,-9],[2,-5],[2,-2],[18,0],[10,-3],[9,-6],[9,-3],[8,8],[8,12],[4,3],[5,1],[5,-3],[4,-4],[5,1],[5,10],[2,13],[3,20],[1,19],[0,13],[8,17],[3,3],[44,4],[9,4],[8,1],[15,-11],[8,2],[1,2],[1,3],[2,2],[2,1],[3,-2],[4,-8],[6,-4],[4,-6],[4,-4],[4,0],[11,11],[27,6],[4,2],[3,5],[3,8],[1,4],[-14,9],[-1,2],[-2,8],[0,2],[-4,2],[-19,3],[-3,2],[-3,4],[-2,5],[-2,6],[1,6],[3,4],[3,-5],[3,2],[6,11],[2,3],[1,4],[1,2],[3,-5],[2,1],[1,2],[1,3],[19,3],[4,4],[3,-5],[4,0],[4,2],[3,3],[3,6],[2,13],[2,5],[4,1],[35,-8],[8,-8],[15,-22],[13,-13],[3,-7],[-2,-8],[-1,-2],[1,-4],[2,-5],[0,-3],[0,-6],[2,-4],[2,-1],[2,1],[-1,-13],[3,-16],[-3,-21],[1,-23],[-2,-13],[-6,-15],[-2,-9],[-2,-52],[-1,-12],[-7,-22],[-9,-7],[-9,4],[-7,12],[-6,25],[-2,3],[-1,4],[-10,21],[-1,7],[2,15],[0,6],[-1,9],[-2,6],[-5,12],[-5,4],[-8,-26],[-4,-1],[-7,-7],[-20,-4],[-9,-5],[-8,5],[-6,-14],[-9,-57],[-2,-8],[-5,-17],[-1,-5],[-1,-5],[-1,-5],[0,-6],[0,-7],[-2,-3],[-3,-1],[-2,-3],[-6,-13],[-3,-9],[-2,-28],[-3,-7],[-8,-11],[-4,-10],[-9,-37],[-4,-6],[-2,-4],[-1,-6],[0,-6],[-3,-13],[-1,-4],[-16,-38],[-5,-19],[-3,-9],[-14,-18],[-16,-30],[-7,-17],[-3,-6],[-3,2],[-3,6],[-3,4],[-4,-3],[-9,-11],[-4,-3],[-3,1],[-3,4],[-3,0],[-1,-3],[-1,-3],[-1,-3],[-1,-4],[-7,-12],[-4,-5],[-3,1],[-5,-6],[-4,-2],[-8,4],[-2,-11],[-1,-1],[-4,-7],[-2,-4],[-3,-1],[-2,-5],[-2,-11],[-2,-21],[-6,-36],[-3,-17],[-5,-15],[-5,-12],[-7,-8],[-7,-3],[-14,-2],[-3,0],[-2,4],[-2,4],[0,5],[-5,14],[-1,4],[-2,2],[-1,1],[-7,7],[-3,11],[0,10],[-1,7],[-5,4],[-10,0],[-2,2],[-2,10],[-1,4],[-8,-2],[-3,-20],[1,-18],[8,4],[1,-9],[-1,-12],[-2,-13],[-1,-13],[1,-5],[2,-6],[0,-5],[0,-26],[3,4],[2,5],[1,5],[2,6],[1,8],[0,9],[2,7],[3,4],[2,-10],[5,-32],[7,-12],[2,-11],[3,-9],[5,1],[5,-15],[4,-45],[4,-17],[10,-9],[9,1],[9,-2],[8,-18],[6,-18],[12,-27],[6,-20],[3,-22],[2,-13],[1,-11],[1,-9],[10,-29],[8,-33],[3,-21],[7,-23],[2,-13],[0,-12],[-1,-27],[0,-8],[10,-30],[5,-11],[3,-4],[9,-3],[1,-2],[1,-2],[1,-7],[2,-3],[2,-1],[1,-4],[1,-9],[1,-14],[2,-12],[3,-5],[8,0],[5,-2],[4,-6],[6,-23],[-4,-22],[-5,-22],[2,-22],[1,-3],[6,-9],[16,-43],[1,-1],[3,4],[3,5],[2,2],[1,-8],[1,-7],[2,-5],[2,-4],[2,5],[2,-2],[-1,-6],[-1,-9],[-1,-2],[-4,-3],[-1,-3],[-1,-4],[1,-9],[0,-4],[-1,-9],[0,-6],[-1,-1],[-3,0],[1,1],[-1,3],[-3,4],[-1,1],[-2,-1],[0,-2],[-1,-2],[-5,13],[-4,-12]],[[5341,6011],[2,3],[3,6],[2,14],[1,2],[7,8],[10,24],[-5,15],[0,4],[1,5],[2,5],[5,6],[2,7],[5,16],[2,3],[0,-4],[3,-22],[1,-15],[8,-44],[4,-33],[4,-15],[4,-9],[4,24],[0,12],[1,15],[-1,3],[-2,8],[0,5],[0,20],[0,7],[-2,9],[-5,15],[-1,6],[0,7],[-6,27],[-2,23],[-1,20],[0,7],[-3,19],[-1,12],[5,137],[2,18],[3,8],[1,7],[0,17],[-2,18],[-2,10],[-6,-7],[-7,-2],[-7,5],[-5,8],[-4,12],[-4,17],[-2,19],[1,17],[4,-5],[2,-2],[2,-1],[-1,6],[1,6],[0,4],[1,4],[5,-8],[4,-9],[6,-19],[5,-19],[2,-8],[5,-5],[4,-3],[2,0],[1,3],[3,14],[2,12],[5,51],[2,15],[-4,21],[-16,53],[-2,7],[0,8],[0,11],[2,6],[13,12],[3,10],[0,9],[-2,10],[-1,14],[1,13],[5,21],[3,12],[0,6],[1,12],[0,6],[2,7],[3,5],[3,3],[2,4],[4,5],[10,2],[5,6],[2,20],[-1,23],[-2,24],[-1,23],[1,13],[1,14],[3,12],[3,5],[2,1],[6,4],[3,1],[2,1],[14,18],[5,8],[4,10],[2,10],[2,60],[2,21],[5,15],[9,1],[5,-8],[1,-11],[-1,-27],[0,-27],[1,-10],[3,7],[2,0],[1,-11],[3,-9],[3,-7],[4,-6],[7,-4],[4,-5],[1,3],[2,4],[1,2],[5,0],[3,-3],[3,-6],[4,-9],[2,1],[4,9],[6,20],[-2,14],[3,26],[10,41],[4,14],[2,2],[2,-2],[2,-5],[3,-4],[2,2],[2,5],[1,13],[2,6],[2,3],[4,3],[2,4],[2,9],[0,9],[-1,37],[1,7],[0,2],[0,3],[2,7],[1,6],[1,1],[1,13],[1,10],[-1,24],[-1,22],[0,11],[3,9],[2,2],[5,-2],[2,0],[2,3],[5,14],[0,-18],[0,-7],[3,2],[4,13],[2,4],[4,1],[20,-11],[5,3],[11,-10],[6,-7],[5,-19],[18,-25],[11,15],[5,1],[9,0],[4,4],[5,8],[4,11],[2,1],[3,-3],[1,-5],[1,-8],[0,-8],[-1,-5],[-2,-3],[-5,-4],[-1,-2],[0,-4],[2,-8],[1,-6],[0,-5],[0,-4],[0,-5],[1,-6],[4,-13],[1,-5],[2,-10],[10,-22],[4,-7],[9,-6],[9,0],[65,22],[3,-5],[3,-27],[3,-9],[5,-5],[4,2],[4,6],[4,15],[4,3],[5,-2],[13,-14],[6,-1],[3,-3],[2,-2]],[[9548,1566],[1,-14],[0,-13],[-3,-5],[-42,6],[-10,11],[-6,3],[-10,-1],[-5,4],[-3,11],[1,15],[3,9],[16,30],[4,9],[2,10],[0,12],[2,9],[3,4],[9,3],[12,11],[7,-2],[3,-14],[1,-20],[0,-19],[1,-15],[4,-12],[8,-24],[2,-8]],[[9545,1749],[3,-20],[-10,0],[-5,-3],[-4,-8],[-6,-21],[-4,-8],[-5,-5],[-10,-1],[-5,-3],[-4,-6],[-3,-12],[-6,-27],[-4,-12],[-14,-28],[-4,-4],[-2,-4],[-8,-25],[-6,-13],[-7,-10],[-8,-8],[-9,-5],[-9,0],[-15,16],[-10,4],[-31,2],[-41,2],[-10,-3],[-9,-6],[-18,-19],[-8,0],[-1,21],[20,145],[5,26],[0,8],[2,8],[6,13],[3,6],[2,34],[2,6],[1,6],[15,87],[5,21],[11,25],[1,9],[1,12],[2,14],[5,25],[4,16],[14,30],[33,61],[33,30],[29,11],[6,6],[14,7],[21,3],[19,-8],[9,-28],[1,-8],[10,-42],[3,-8],[3,-8],[4,-6],[7,-6],[16,-5],[6,-9],[-4,-11],[-3,-10],[-2,-10],[-3,-25],[-6,-29],[-1,-10],[-1,-55],[-1,-6],[-3,-6],[-12,-17],[-4,-11],[-1,-21],[0,-44],[1,-20]],[[9514,2446],[-4,-3],[-3,2],[-2,3],[-3,2],[-2,5],[-2,22],[-3,5],[-2,3],[-3,6],[-3,11],[-2,12],[1,11],[2,5],[3,-6],[5,-11],[3,-5],[3,-2],[8,-1],[4,-3],[1,-6],[1,-8],[6,-13],[1,-9],[-2,-6],[-3,-6],[-4,-8]],[[8802,5564],[23,-14],[45,-9],[15,-9],[9,-2],[13,9],[16,-12],[6,6],[9,-7],[20,0],[9,-5],[1,-2],[2,-7],[1,-3],[3,0],[5,1],[2,-3],[3,-7],[5,-7],[7,-8],[5,-1],[14,5],[36,-13],[18,5],[5,-2],[8,-9],[3,-2],[8,-1],[4,-3],[4,-4],[11,-17],[0,-3],[-3,-2],[-1,-8],[-2,-2],[-17,0],[-8,-4],[-6,0],[-1,-2],[-1,-6],[-1,-4],[-2,-3],[-5,-3],[-2,-3],[-2,-4],[-2,-3],[-3,-1],[-20,5],[-4,0],[0,-4],[2,-3],[1,-6],[0,-5],[-2,-2],[-3,1],[-4,5],[-1,2],[-3,0],[-4,-4],[-3,0],[-2,1],[-7,7],[-3,2],[-9,8],[-4,2],[-2,-1],[-2,-6],[-1,-1],[-2,-1],[-1,0],[0,1],[-3,-4],[-1,-4],[-1,-5],[-1,-8],[-2,0],[-1,7],[-2,3],[-2,-1],[-2,-4],[-4,16],[-7,11],[-16,9],[-2,0],[-5,0],[-2,0],[-2,3],[-3,8],[-2,1],[-5,1],[-3,2],[-3,4],[-6,9],[-10,13],[-2,1],[-2,7],[-4,2],[-9,1],[-4,4],[-7,11],[-7,2],[-2,2],[-3,8],[-2,2],[-3,-1],[-3,-3],[-2,3],[-3,6],[-3,3],[-2,-2],[-3,-4],[-3,-3],[-3,3],[-5,9],[-6,1],[-6,-2],[-6,2],[-3,5],[-1,5],[0,6],[-2,8],[-1,1],[-4,-1],[-1,0],[0,4],[-1,5],[0,5],[-3,3],[0,2],[2,4],[3,4],[2,0],[1,4],[3,0]],[[9514,5544],[-3,0],[-5,5],[-1,8],[0,4],[3,10],[2,-6],[4,-11],[0,-10]],[[8727,5631],[4,-4],[12,3],[5,-5],[3,-2],[10,8],[2,-2],[2,-3],[2,-2],[4,3],[-5,-16],[-7,-7],[-20,-2],[-18,4],[-1,6],[0,12],[2,9],[5,-2]],[[8627,4826],[7,-71],[5,-16],[10,4],[12,38],[5,8],[2,-23],[-2,-38],[-1,-9],[-1,-2],[-1,-2],[-1,-3],[-1,-5],[-1,-7],[1,-19],[-2,-23],[0,-8],[8,-7],[1,-9],[2,-24],[0,-3],[1,-3],[0,-3],[1,-8],[-1,0],[2,-6],[1,-4],[3,-8],[3,-4],[4,4],[7,14],[0,-6],[-2,-12],[0,-6],[1,-4],[3,-9],[2,-17],[4,-4],[10,1],[5,-2],[6,-11],[3,-3],[36,-4],[4,-2],[6,-8],[4,-2],[4,2],[9,8],[15,6],[4,3],[4,5],[3,8],[9,27],[1,5],[1,6],[1,8],[-1,5],[0,5],[7,22],[8,15],[17,17],[7,12],[4,12],[-1,5],[-3,5],[-1,9],[0,4],[1,4],[1,4],[2,2],[0,2],[1,1],[1,1],[6,-4],[3,6],[6,18],[10,7],[5,9],[3,11],[2,14],[0,9],[-2,22],[0,7],[6,16],[2,8],[0,10],[0,27],[2,3],[5,11],[1,4],[3,-1],[2,23],[3,6],[2,1],[2,1],[2,4],[1,5],[1,4],[3,2],[5,4],[19,22],[9,17],[6,21],[2,12],[2,12],[1,41],[1,10],[2,8],[7,21],[2,10],[1,10],[0,6],[-1,13],[-1,18],[1,3],[1,7],[3,11],[4,11],[5,9],[6,5],[11,0],[2,2],[7,9],[2,1],[1,-5],[-1,-8],[0,-8],[2,-3],[6,-1],[6,-3],[1,-7],[1,-2],[2,1],[2,3],[2,1],[3,-1],[8,-7],[4,12],[3,-1],[5,-6],[2,-2],[2,2],[2,5],[1,4],[1,2],[7,2],[1,2],[12,21],[13,7],[2,3],[1,5],[1,6],[1,6],[7,10],[9,5],[28,4],[6,3],[3,5],[7,14],[2,7],[-2,13],[-5,12],[-3,9],[1,4],[2,3],[1,8],[0,9],[-1,8],[-2,4],[-6,5],[-2,3],[-12,25],[2,8],[1,12],[0,26],[2,7],[4,6],[45,46],[25,40],[4,6],[2,2],[1,5],[3,10],[1,2],[4,1],[57,68],[9,7],[10,1],[9,-8],[2,-5],[5,-16],[2,-2],[4,-12],[1,-2],[3,-1],[2,-3],[10,-27],[4,-7],[9,-4],[24,-19],[28,-36],[37,-29],[15,-6],[5,-5],[10,-7],[15,-32],[15,-46],[9,-17],[4,-3],[14,-1],[5,-2],[34,-31],[38,-65],[22,-20],[13,-17],[3,-3],[3,-3],[10,-21],[35,-37],[23,-36],[9,-8],[9,-2],[42,10],[6,6],[2,12],[2,2],[4,-4],[5,-8],[1,2],[1,9],[1,1],[1,-3],[1,-4],[0,-4],[1,-5],[8,-32],[3,-2],[14,-15],[5,-10],[5,-5],[4,8],[2,-4],[2,0],[2,5],[1,7],[-1,5],[-2,5],[-1,4],[2,6],[3,-1],[20,-21],[4,-2],[24,-2],[26,-31],[3,-5],[1,-10],[-1,-19],[-2,-9],[-8,-26],[2,-5],[1,-6],[3,-4],[2,-1],[1,4],[0,7],[1,6],[2,3],[1,-2],[4,-8],[2,-2],[2,1],[5,5],[3,2],[20,0],[9,4],[2,0],[0,-18],[0,-104],[0,-115],[0,-147],[0,-196],[0,-129],[0,-119],[0,-102],[1,-250],[0,-105],[0,-127],[0,-6],[0,-2],[0,-115],[0,-74],[0,-25],[0,-152],[0,-109],[0,-116],[0,-134],[0,-63],[-1,-1],[-2,-7],[-1,-11],[-1,-2],[0,-2],[0,-3],[2,-5],[1,-4],[-1,-6],[-2,-4],[-1,-5],[1,-7],[-3,0],[-2,0],[-2,-1],[-2,-3],[2,-1],[2,-3],[0,-5],[0,-7],[4,0],[1,-9],[-1,-11],[-1,-5],[-4,-1],[-1,-4],[-1,-7],[0,-15],[-1,-3],[-1,-2],[-2,0],[-1,-2],[0,-5],[2,-5],[0,-4],[-3,-6],[-4,-3],[-3,-3],[-2,-9],[3,-4],[1,-11],[-2,-19],[-1,-7],[-1,-5],[0,-6],[2,-7],[4,-11],[2,-7],[-1,-4],[-2,-7],[0,-3],[0,-7],[2,-5],[4,-8],[2,-10],[0,-12],[2,-8],[5,4],[1,-19],[4,-6],[3,1],[0,-64],[0,-90],[0,-74],[0,-25],[0,-156],[0,-109],[0,-112],[0,-24],[0,-99],[0,-157],[0,-104],[0,-110],[0,-114],[0,-69],[0,1],[-10,15],[-2,0],[-14,18],[-51,144],[-25,99],[-12,31],[-2,5],[-14,33],[-3,8],[-1,10],[-2,2],[-11,12],[-8,22],[-3,13],[-48,96],[-9,32],[-3,16],[-1,13],[2,13],[4,10],[5,9],[3,1],[3,0],[2,3],[1,9],[1,22],[-2,20],[-1,14],[2,14],[4,9],[7,-8],[3,6],[5,31],[-3,-5],[-4,-13],[-4,-3],[-5,0],[-3,-3],[-2,-7],[-2,-26],[-1,-38],[-1,-8],[-4,-9],[-9,-14],[-9,-7],[-36,-1],[-30,-8],[-7,-7],[-11,-18],[-7,-7],[-18,-11],[-8,-2],[-9,1],[-8,5],[-8,11],[-6,15],[-3,21],[0,5],[1,7],[0,7],[1,4],[1,3],[-1,11],[-1,20],[-1,7],[-5,14],[4,2],[4,-4],[3,-2],[4,7],[-9,10],[-6,3],[-2,-7],[0,-6],[1,-12],[0,-6],[0,-2],[3,-1],[1,-1],[0,-4],[0,-3],[-1,-3],[0,-27],[-5,-13],[-18,-13],[-7,-9],[-25,-57],[-2,-10],[-1,-11],[-1,-4],[-1,-6],[-2,-6],[-1,-2],[-3,0],[-2,2],[-8,43],[-5,21],[-2,13],[-1,14],[1,12],[3,10],[9,5],[5,8],[1,5],[-1,6],[-1,5],[-3,5],[0,7],[1,14],[0,50],[1,12],[3,5],[8,6],[6,11],[2,18],[1,48],[6,38],[3,9],[0,4],[2,20],[1,7],[2,5],[2,5],[2,5],[1,22],[-5,16],[-7,10],[-8,5],[-9,0],[-3,6],[-2,28],[-2,13],[-9,39],[-4,15],[-6,13],[-16,29],[-3,4],[-2,5],[-1,4],[-2,2],[-5,0],[-1,2],[-2,2],[-3,6],[-3,8],[0,7],[5,3],[47,-4],[9,-4],[3,-5],[7,-13],[3,-2],[33,-2],[4,4],[3,13],[2,15],[3,13],[6,5],[0,5],[-4,4],[-3,-4],[-6,-15],[-3,-12],[-2,-4],[-2,-2],[-10,0],[-9,-4],[-5,1],[-4,10],[-12,17],[-4,5],[-4,2],[-15,2],[-3,3],[-6,9],[-12,10],[-2,4],[-1,5],[-22,58],[-16,34],[-3,14],[5,16],[3,6],[4,3],[9,0],[4,-3],[9,-10],[5,1],[4,5],[6,16],[3,3],[19,4],[7,4],[3,0],[2,-2],[4,-5],[2,-1],[5,-6],[6,-25],[4,-6],[7,-14],[1,-4],[2,-2],[4,-4],[3,-5],[2,-2],[3,-1],[9,1],[3,-1],[-3,8],[-5,3],[-5,1],[-3,2],[-1,5],[-10,13],[-15,39],[-8,10],[-9,6],[-14,3],[-4,4],[-4,5],[-12,29],[-5,10],[-9,7],[-4,8],[-2,11],[-1,14],[3,16],[4,0],[9,-12],[4,-3],[15,-21],[-27,45],[-6,16],[-10,34],[-3,6],[-3,4],[-30,74],[-10,50],[-2,16],[-4,23],[-1,11],[1,28],[-1,9],[-4,28],[0,10],[-1,9],[-4,12],[-1,8],[-1,9],[-14,57],[-3,19],[2,16],[7,11],[16,8],[6,11],[-4,-1],[-9,-6],[-5,-2],[-24,16],[-6,9],[-1,3],[-1,5],[-1,5],[-2,8],[20,32],[12,14],[12,10],[-4,5],[-5,0],[-9,-5],[-6,0],[-4,-3],[-4,-5],[-9,-14],[-5,-4],[-10,-2],[-4,-8],[-1,1],[0,2],[-2,4],[-1,5],[0,7],[0,6],[-2,24],[-1,26],[0,14],[1,8],[2,6],[3,7],[2,2],[2,1],[2,2],[0,7],[-1,2],[-4,5],[-2,1],[-3,5],[0,13],[2,27],[1,14],[-1,6],[-2,4],[-1,-10],[-2,-7],[-2,-2],[-3,3],[2,-14],[0,-12],[-2,-6],[-6,3],[-3,6],[-6,23],[-9,26],[-2,14],[4,20],[-5,3],[-11,-22],[-7,-1],[-1,3],[-1,3],[-6,21],[-1,1],[1,11],[4,16],[2,10],[-9,-12],[-4,-3],[-4,3],[-4,10],[-2,20],[-3,7],[-2,-1],[-2,-3],[-2,-2],[-4,5],[-6,4],[-4,5],[-4,9],[-1,9],[4,6],[0,4],[-3,4],[-2,13],[-2,3],[-1,-3],[-4,-14],[-1,-3],[-3,1],[-2,4],[-4,11],[-2,3],[-2,2],[-1,2],[-1,9],[-7,-5],[-6,4],[-6,9],[-5,12],[2,4],[1,5],[0,6],[0,6],[-1,0],[-3,-8],[-3,5],[-6,19],[0,-13],[-2,-3],[-5,4],[-2,3],[0,9],[3,35],[-1,2],[-10,-19],[-1,-8],[1,-10],[-3,-8],[-10,13],[-4,10],[-1,17],[-7,-20],[-6,11],[0,10],[2,13],[1,19],[-2,0],[-4,-20],[-7,-12],[-8,-1],[-11,13],[-2,3],[0,5],[1,6],[2,5],[3,4],[1,3],[-2,6],[-5,-4],[-16,-26],[-4,-5],[-5,-2],[-2,2],[-2,5],[-2,6],[-1,5],[1,11],[-1,1],[-3,3],[-5,1],[-2,-4],[-2,0],[-10,20],[-16,14],[-19,29],[-16,23],[-5,12],[-2,2],[-4,0],[-2,2],[-6,15],[-4,3],[-20,1],[-19,16],[-7,13],[0,3],[-5,2],[-4,4],[-2,5],[-3,5],[-4,3],[-3,0],[-3,2],[-4,9],[-10,31],[-5,8],[-8,4],[-18,0],[-8,8],[-3,-6],[-6,-1],[-6,1],[-3,4],[-2,1],[-10,1],[-9,6],[-2,4],[-4,5],[-26,8],[-5,3],[-3,6],[-3,-3],[-12,-4],[-6,2],[-13,-11],[-10,-2],[-9,7],[-49,77],[-4,8],[-1,9],[-2,9],[-5,7],[-5,4],[-2,1]],[[8683,5870],[3,-4],[4,5],[4,26],[4,5],[-1,-9],[0,-9],[0,-20],[-8,-27],[-3,-3],[-3,-1],[-8,0],[-3,3],[-3,5],[-3,8],[-3,22],[-5,12],[-3,13],[4,16],[0,3],[1,11],[1,7],[1,3],[0,3],[4,7],[3,4],[3,1],[10,-9],[3,-4],[1,-6],[1,-4],[2,-10],[0,-6],[0,-4],[-1,-10],[0,-6],[-4,-13],[-1,-9]],[[8791,6117],[1,0],[3,1],[1,1],[1,-2],[2,-4],[2,-2],[6,-4],[12,-3],[2,0],[5,6],[2,-5],[2,-12],[14,7],[2,-1],[0,-4],[2,-10],[1,-6],[1,-6],[2,1],[2,5],[2,2],[7,-14],[5,-6],[2,5],[1,7],[4,9],[4,8],[4,3],[5,-5],[5,-10],[16,-45],[17,-33],[5,-11],[2,-17],[2,-6],[1,-5],[3,-5],[1,-8],[1,-8],[0,-6],[3,-8],[4,-8],[4,-8],[2,-16],[3,-10],[2,-11],[3,2],[2,4],[1,3],[5,2],[6,1],[5,-4],[2,-13],[2,-6],[13,-5],[2,-8],[-1,-9],[-3,-8],[-3,-3],[-3,-3],[-10,-21],[-14,-6],[-3,-4],[-3,-5],[-4,-5],[-5,-3],[-4,-1],[-9,4],[-14,24],[-10,4],[-5,-2],[-8,-8],[-5,-2],[-5,4],[-4,9],[-4,12],[-3,11],[-1,12],[1,35],[-1,5],[-3,12],[0,3],[-1,7],[-2,19],[-4,58],[-4,20],[-5,12],[-5,-4],[-4,-11],[-4,-14],[-5,-11],[-4,3],[-34,73],[-1,-6],[0,-7],[3,-15],[-8,7],[-7,18],[-7,23],[-5,42],[0,10],[4,5],[2,-2],[4,-10],[2,-4]]],"transform":{"scale":[0.004596951802080204,0.001691107424542451],"translate":[95.01270592500012,-10.999281507999868]}};
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
