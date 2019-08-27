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
  Datamap.prototype.itaTopo = {"type":"Topology","objects":{"ita":{"type":"GeometryCollection","geometries":[{"type":"Polygon","properties":{"name":"Modena"},"id":"IT.MO","arcs":[[0,1,2,3,4,5]]},{"type":"Polygon","properties":{"name":"Reggio Emilia"},"id":"IT.RE","arcs":[[-5,6,7,8,9]]},{"type":"Polygon","properties":{"name":"Parma"},"id":"IT.PR","arcs":[[-9,10,11,12,13,14]]},{"type":"Polygon","properties":{"name":"Piacenza"},"id":"IT.PC","arcs":[[-14,15,16,17,18,19]]},{"type":"Polygon","properties":{"name":"Bologna"},"id":"IT.BO","arcs":[[20,21,22,23,24,-2]]},{"type":"Polygon","properties":{"name":"Ferrara"},"id":"IT.FE","arcs":[[25,26,-21,-1,27,28]]},{"type":"Polygon","properties":{"name":"Ravenna"},"id":"IT.RA","arcs":[[29,30,-22,-27,31]]},{"type":"Polygon","properties":{"name":"Forlì-Cesena"},"id":"IT.FC","arcs":[[32,33,34,35,-30]]},{"type":"Polygon","properties":{"name":"Rimini"},"id":"IT.RN","arcs":[[36,37,38,39,-34,40],[41]]},{"type":"Polygon","properties":{"name":"Genova"},"id":"IT.GE","arcs":[[-16,-13,42,43,44,45]]},{"type":"Polygon","properties":{"name":"Savona"},"id":"IT.SV","arcs":[[46,-45,47,48,49,50]]},{"type":"Polygon","properties":{"name":"Imperia"},"id":"IT.IM","arcs":[[-49,51,52]]},{"type":"Polygon","properties":{"name":"La Spezia"},"id":"IT.SP","arcs":[[53,54,-43,-12]]},{"type":"MultiPolygon","properties":{"name":"Carbonia-Iglesias"},"id":"IT.CI","arcs":[[[55]],[[56]],[[57,58,59]]]},{"type":"Polygon","properties":{"name":"Medio Campidano"},"id":"IT.VS","arcs":[[60,-60,61,62]]},{"type":"Polygon","properties":{"name":"Oristrano"},"id":"IT.OR","arcs":[[63,64,-63,65,66]]},{"type":"MultiPolygon","properties":{"name":"Sassari"},"id":"IT.SS","arcs":[[[67,68,-67,69]],[[70]]]},{"type":"MultiPolygon","properties":{"name":"Olbia-Tempio"},"id":"IT.OT","arcs":[[[71]],[[72]],[[73]],[[74]],[[75]],[[76]],[[77]],[[78]],[[79,-68,80]],[[81]],[[82]],[[83]]]},{"type":"Polygon","properties":{"name":"Nuoro"},"id":"IT.NU","arcs":[[84,85,86,-64,-69,-80]]},{"type":"Polygon","properties":{"name":"Ogliastra"},"id":"IT.OG","arcs":[[87,-86,88]]},{"type":"Polygon","properties":{"name":"Cagliari"},"id":"IT.CA","arcs":[[89,-58,-61,-65,-87,-88]]},{"type":"MultiPolygon","properties":{"name":"Grosseto"},"id":"IT.GR","arcs":[[[90]],[[91]],[[92,93,94,95,96]]]},{"type":"MultiPolygon","properties":{"name":"Livorno"},"id":"IT.LI","arcs":[[[97]],[[98]],[[99]],[[100]],[[101]],[[-95,102,103]]]},{"type":"Polygon","properties":{"name":"Pisa"},"id":"IT.PI","arcs":[[104,105,-96,-104,106,107]]},{"type":"Polygon","properties":{"name":"Massa-Carrara"},"id":"IT.MS","arcs":[[-8,108,109,-54,-11]]},{"type":"Polygon","properties":{"name":"Lucca"},"id":"IT.LU","arcs":[[-4,110,111,-108,112,-109,-7]]},{"type":"Polygon","properties":{"name":"Pistoia"},"id":"IT.PT","arcs":[[-25,113,114,-111,-3]]},{"type":"Polygon","properties":{"name":"Prato"},"id":"IT.PO","arcs":[[115,-114,-24]]},{"type":"Polygon","properties":{"name":"Firenze"},"id":"IT.FI","arcs":[[-31,-36,116,117,-105,-112,-115,-116,-23]]},{"type":"MultiPolygon","properties":{"name":"Arezzo"},"id":"IT.AR","arcs":[[[-42]],[[-40,118,119,120,-117,-35]]]},{"type":"Polygon","properties":{"name":"Siena"},"id":"IT.SI","arcs":[[121,122,123,-97,-106,-118,-121]]},{"type":"MultiPolygon","properties":{"name":"Matera"},"id":"IT.MT","arcs":[[[124]],[[125,126,127,128,129]]]},{"type":"Polygon","properties":{"name":"Potenza"},"id":"IT.PZ","arcs":[[130,-129,131,132,133,134,135,136],[-125]]},{"type":"Polygon","properties":{"name":"Cosenza"},"id":"IT.CS","arcs":[[137,138,139,140,-132,-128]]},{"type":"Polygon","properties":{"name":"Crotene"},"id":"IT.KR","arcs":[[141,-139,142]]},{"type":"Polygon","properties":{"name":"Catanzaro"},"id":"IT.CZ","arcs":[[143,144,145,146,-140,-142]]},{"type":"Polygon","properties":{"name":"Vibo Valentia"},"id":"IT.VV","arcs":[[147,148,-146]]},{"type":"Polygon","properties":{"name":"Reggio Calabria"},"id":"IT.RC","arcs":[[-145,149,-148]]},{"type":"Polygon","properties":{"name":"Caserta"},"id":"IT.CE","arcs":[[150,151,152,153,154,155,156]]},{"type":"MultiPolygon","properties":{"name":"Napoli"},"id":"IT.NA","arcs":[[[157]],[[158]],[[159]],[[160,161,-153,162,163]]]},{"type":"MultiPolygon","properties":{"name":"Benevento"},"id":"IT.BN","arcs":[[[164]],[[165,-163,-152,166,167]]]},{"type":"Polygon","properties":{"name":"Avellino"},"id":"IT.AV","arcs":[[-135,168,-164,-166,169],[-165]]},{"type":"Polygon","properties":{"name":"Salerno"},"id":"IT.SA","arcs":[[-134,170,-161,-169]]},{"type":"Polygon","properties":{"name":"Campobasso"},"id":"IT.CB","arcs":[[171,-167,-151,172,173,174]]},{"type":"Polygon","properties":{"name":"Isernia"},"id":"IT.IS","arcs":[[-173,-157,175,176,177]]},{"type":"Polygon","properties":{"name":"Bari"},"id":"IT.BA","arcs":[[178,179,-130,-131,180,181]]},{"type":"MultiPolygon","properties":{"name":"Foggia"},"id":"IT.FG","arcs":[[[182,-136,-170,-168,-172,183]],[[184]]]},{"type":"Polygon","properties":{"name":"Barletta-Andria Trani"},"id":"IT.BT","arcs":[[-181,-137,-183,185]]},{"type":"Polygon","properties":{"name":"Brindisi"},"id":"IT.BR","arcs":[[186,187,-179,188]]},{"type":"Polygon","properties":{"name":"Lecce"},"id":"IT.LE","arcs":[[189,-187,190]]},{"type":"Polygon","properties":{"name":"Taranto"},"id":"IT.TA","arcs":[[-188,-190,191,-126,-180]]},{"type":"MultiPolygon","properties":{"name":"Trapani"},"id":"IT.TP","arcs":[[[192]],[[193]],[[194]],[[195,196,197]]]},{"type":"MultiPolygon","properties":{"name":"Palermo"},"id":"IT.PA","arcs":[[[198]],[[199,200,201,202,-196,203],[204]],[[205]]]},{"type":"MultiPolygon","properties":{"name":"Messina"},"id":"IT.ME","arcs":[[[206,207,-200,208]],[[209]],[[210]],[[211]],[[212]],[[213]],[[214]]]},{"type":"Polygon","properties":{"name":"Enna"},"id":"IT.EN","arcs":[[215,216,-201,-208]]},{"type":"Polygon","properties":{"name":"Catania"},"id":"IT.CT","arcs":[[217,218,219,220,-216,-207]]},{"type":"Polygon","properties":{"name":"Siracusa"},"id":"IT.SR","arcs":[[221,222,-219]]},{"type":"Polygon","properties":{"name":"Ragusa"},"id":"IT.RG","arcs":[[-223,223,224,-220]]},{"type":"MultiPolygon","properties":{"name":"Caltanissetta"},"id":"IT.CL","arcs":[[[-205]],[[-217,-221,-225,225,226,-202]]]},{"type":"MultiPolygon","properties":{"name":"Agrigento"},"id":"IT.AG","arcs":[[[227]],[[228]],[[-227,229,-197,-203],[-199]]]},{"type":"Polygon","properties":{"name":"Pescara"},"id":"IT.PE","arcs":[[230,231,232,233]]},{"type":"Polygon","properties":{"name":"Teramo"},"id":"IT.TE","arcs":[[-234,234,235,236,237]]},{"type":"Polygon","properties":{"name":"L'Aquila"},"id":"IT.AQ","arcs":[[-233,238,-177,239,240,241,-235]]},{"type":"Polygon","properties":{"name":"Chieti"},"id":"IT.CH","arcs":[[-174,-178,-239,-232,242]]},{"type":"Polygon","properties":{"name":"Roma"},"id":"IT.RM","arcs":[[-241,243,244,245,246,247],[248]]},{"type":"Polygon","properties":{"name":"Viterbo"},"id":"IT.VT","arcs":[[249,-247,250,-93,-124,251]]},{"type":"Polygon","properties":{"name":"Rieti"},"id":"IT.RI","arcs":[[-236,-242,-248,-250,252,253,254]]},{"type":"Polygon","properties":{"name":"Frosinone"},"id":"IT.FR","arcs":[[-240,-176,-156,255,-244]]},{"type":"MultiPolygon","properties":{"name":"Latina"},"id":"IT.LT","arcs":[[[256]],[[257]],[[258]],[[259]],[[-256,-155,260,-245]]]},{"type":"Polygon","properties":{"name":"Ancona"},"id":"IT.AN","arcs":[[261,262,263,264]]},{"type":"Polygon","properties":{"name":"Pesaro e Urbino"},"id":"IT.PU","arcs":[[-264,265,-119,-39,266,-37,267],[268]]},{"type":"Polygon","properties":{"name":"Macerata"},"id":"IT.MC","arcs":[[269,270,271,-262,272]]},{"type":"Polygon","properties":{"name":"Fermo"},"id":"IT.FM","arcs":[[273,-270,274]]},{"type":"Polygon","properties":{"name":"Ascoli Piceno"},"id":"IT.AP","arcs":[[275,-237,-255,276,-271,-274]]},{"type":"MultiPolygon","properties":{"name":"Perugia"},"id":"IT.PG","arcs":[[[-263,-272,-277,-254,277,-122,-120,-266]],[[-269]]]},{"type":"Polygon","properties":{"name":"Terni"},"id":"IT.TR","arcs":[[-253,-252,-123,-278]]},{"type":"Polygon","properties":{"name":"Turin"},"id":"IT.TO","arcs":[[278,279,280,281,282,283,284]]},{"type":"Polygon","properties":{"name":"Biella"},"id":"IT.BI","arcs":[[-285,285,286]]},{"type":"Polygon","properties":{"name":"Vercelli"},"id":"IT.VC","arcs":[[287,288,289,-279,-287,290,291]]},{"type":"Polygon","properties":{"name":"Verbano-Cusio-Ossola"},"id":"IT.VB","arcs":[[292,293,-292,294,295]]},{"type":"Polygon","properties":{"name":"Novara"},"id":"IT.NO","arcs":[[296,297,298,-288,-294]]},{"type":"Polygon","properties":{"name":"Alessandria"},"id":"IT.AL","arcs":[[299,-17,-46,-47,300,-280,-290]]},{"type":"Polygon","properties":{"name":"Asti"},"id":"IT.AT","arcs":[[-301,-51,301,-281]]},{"type":"Polygon","properties":{"name":"Cuneo"},"id":"IT.CN","arcs":[[-50,-53,302,-282,-302]]},{"type":"Polygon","properties":{"name":"Aoste"},"id":"IT.AO","arcs":[[-295,-291,-286,-284,303]]},{"type":"Polygon","properties":{"name":"Bergamo"},"id":"IT.BG","arcs":[[304,305,306,307,308,309]]},{"type":"Polygon","properties":{"name":"Sondrio"},"id":"IT.SO","arcs":[[310,311,312,-310,313,314,315]]},{"type":"Polygon","properties":{"name":"Brescia"},"id":"IT.BS","arcs":[[316,317,318,319,-305,-313]]},{"type":"Polygon","properties":{"name":"Mantova"},"id":"IT.MN","arcs":[[320,-28,-6,-10,321,-319,322]]},{"type":"Polygon","properties":{"name":"Cremona"},"id":"IT.CR","arcs":[[-320,-322,-15,-20,323,324,-306]]},{"type":"Polygon","properties":{"name":"Lodi"},"id":"IT.LO","arcs":[[-324,-19,325,326]]},{"type":"Polygon","properties":{"name":"Pavia"},"id":"IT.PV","arcs":[[-326,-18,-300,-289,-299,327]]},{"type":"Polygon","properties":{"name":"Milano"},"id":"IT.MI","arcs":[[-325,-327,-328,-298,328,329,-307]]},{"type":"Polygon","properties":{"name":"Varese"},"id":"IT.VA","arcs":[[330,331,-329,-297,-293,332]]},{"type":"Polygon","properties":{"name":"Como"},"id":"IT.CO","arcs":[[333,334,-331,335,-315]]},{"type":"Polygon","properties":{"name":"Lecco"},"id":"IT.LC","arcs":[[-314,-309,336,-334]]},{"type":"Polygon","properties":{"name":"Monza e Brianza"},"id":"IT.MB","arcs":[[-308,-330,-332,-335,-337]]},{"type":"Polygon","properties":{"name":"Udine"},"id":"IT.UD","arcs":[[337,338,339,340,341,342]]},{"type":"Polygon","properties":{"name":"Pordenone"},"id":"IT.PN","arcs":[[343,344,345,-341]]},{"type":"Polygon","properties":{"name":"Gorizia"},"id":"IT.GO","arcs":[[346,347,-338,348]]},{"type":"Polygon","properties":{"name":"Trieste"},"id":"IT.TS","arcs":[[-347,349]]},{"type":"Polygon","properties":{"name":"Bozen"},"id":"IT.BZ","arcs":[[350,351,-311,352]]},{"type":"Polygon","properties":{"name":"Trento"},"id":"IT.TN","arcs":[[353,354,355,-317,-312,-352]]},{"type":"MultiPolygon","properties":{"name":"Venezia"},"id":"IT.VE","arcs":[[[356,357,358]],[[359]],[[360]],[[361]],[[-340,362,363,364,-344]]]},{"type":"Polygon","properties":{"name":"Rovigo"},"id":"IT.RO","arcs":[[-29,-321,365,366,-357,367]]},{"type":"Polygon","properties":{"name":"Padova"},"id":"IT.PD","arcs":[[-364,368,-358,-367,369,370,371]]},{"type":"Polygon","properties":{"name":"Verona"},"id":"IT.VR","arcs":[[372,-370,-366,-323,-318,-356]]},{"type":"Polygon","properties":{"name":"Vicenza"},"id":"IT.VI","arcs":[[373,374,-371,-373,-355]]},{"type":"Polygon","properties":{"name":"Treviso"},"id":"IT.TV","arcs":[[-345,-365,-372,-375,375]]},{"type":"Polygon","properties":{"name":"Belluno"},"id":"IT.BL","arcs":[[-342,-346,-376,-374,-354,-351,376]]}]}},"arcs":[[[3906,8156],[-7,-22],[-12,-14],[11,-6],[74,-26],[28,-23],[-11,-6],[-8,-1],[-9,0],[-10,-2],[-8,-4],[-7,-6],[-11,-15]],[[3936,8031],[-25,1],[-95,-10],[-17,-10],[-18,-64],[-25,-51],[27,-16],[18,-24],[4,-28],[-16,-30],[-9,-5],[-19,3],[-10,-2],[-7,-9],[-5,-26],[-7,-13],[-11,-5],[-24,-5],[-10,-6],[-3,-9],[7,-7],[29,-12],[6,-5],[2,-6],[-4,-10],[-11,-17],[-2,-8],[1,-12],[3,-5],[8,-8],[1,-7],[-6,-15],[-10,-6],[-51,-5],[-6,-4],[-2,-9],[5,-7],[7,-8],[4,-8],[-2,-12],[-6,-12],[-9,-9],[-11,-5],[-15,-2],[-44,15],[-9,0],[-2,-6],[0,-8],[-1,-8],[-5,-5],[-19,-13],[-8,-13],[-5,-17],[1,-17],[6,-14]],[[3536,7437],[-13,3],[-56,32],[-22,6],[-49,-3],[-3,-1],[-8,-3],[-3,-2],[-2,-2],[-2,-2],[-5,-9],[-4,-4],[-6,-5]],[[3363,7447],[-23,-2],[-10,2],[-41,26],[-6,6],[-26,21],[-2,2],[-1,3],[-1,3],[-1,3],[-1,12],[-4,9]],[[3247,7532],[5,5],[4,4],[5,22],[5,5],[15,11],[4,12],[6,40],[8,12],[52,12],[17,8],[5,7],[1,17],[2,8],[7,6],[15,10],[8,22],[11,12],[45,27],[16,13],[12,16],[10,19],[7,60],[3,6],[3,5],[10,9],[11,6],[3,2],[5,9],[-2,9],[-8,17],[-2,10],[2,12],[16,39],[6,9],[2,3],[0,4],[-2,4],[-2,3],[-4,3],[-11,4],[-2,1],[24,44],[9,7],[18,4],[3,11],[-1,14],[8,12]],[[3596,8127],[1,-1],[27,7],[10,4],[3,2],[7,2],[25,5],[6,2],[3,2],[5,5],[2,3],[2,1],[3,2],[70,7],[6,0],[46,-14],[3,-1],[3,-2],[7,-7],[2,-2],[19,1],[60,13]],[[3247,7532],[-46,6],[-14,4],[-3,2],[-21,22],[-11,7],[-6,3],[-46,6],[-7,0],[-21,-9],[-8,-1]],[[3064,7572],[-4,-1],[-16,10],[-10,10],[-3,3],[-8,16],[-5,3],[-4,2],[-5,1],[-16,4],[-28,13]],[[2965,7633],[12,23],[19,12],[21,9],[18,12],[37,38],[42,32],[42,46],[16,6],[8,5],[7,13],[15,90],[15,31],[0,17],[-4,36],[3,21],[25,50],[1,10],[-3,19],[1,6],[6,6],[20,10],[6,6]],[[3272,8131],[2,0],[15,-2],[37,-1],[30,6],[26,15],[26,22],[14,19],[10,3],[3,-2],[5,-1],[7,-1],[12,1],[11,-1],[2,-1],[12,-7],[3,-2],[2,-3],[2,-2],[1,-3],[0,-4],[-1,-2],[-2,-3],[-1,-3],[0,-3],[1,-2],[4,-2],[79,-14],[6,-2],[6,-3],[3,-2],[9,-4]],[[2965,7633],[-12,6],[-30,1],[-11,2],[-10,8],[-5,5],[-2,2],[-51,32],[-6,6],[1,3],[1,2],[3,2],[8,4],[1,2],[1,4],[-3,7],[-4,4],[-3,2],[-46,19],[-33,8],[-25,3],[-6,0],[-6,-1],[-7,-2],[-7,-3],[-13,-10],[-15,-16],[-20,-17],[-14,-14],[-1,-3],[-2,-3],[-4,-9],[-2,-3],[-3,-1],[-3,-2],[-23,-6],[-14,-2],[-4,-1],[-3,-2],[-2,-2],[-1,-3],[-1,-3],[3,-5]],[[2591,7647],[-14,10],[-6,12],[-5,11],[-4,5],[-3,4],[-45,18],[-6,1],[-17,-1],[-12,2],[-17,-1],[-20,1],[-6,-1],[-4,-5],[-4,-3],[-4,-2],[-3,-1],[-9,-3]],[[2412,7694],[-20,-1],[-11,1],[-2,2],[-1,5],[1,5],[1,4],[2,7],[8,26],[2,3],[2,2],[3,2],[3,1],[6,3],[6,4],[8,11],[4,6],[2,5],[1,15],[-3,19]],[[2424,7814],[14,5],[82,62],[28,33],[15,11],[9,3],[8,1],[5,-2],[10,-7],[6,-2],[43,5],[10,3],[2,6],[-1,16],[5,5],[15,8],[21,23],[12,10],[8,1],[18,0],[8,3],[6,9],[9,21],[6,10],[28,20],[52,18],[14,14],[0,21],[-11,18],[-3,8],[0,12],[3,9],[5,9],[31,27],[18,31],[11,8]],[[2911,8233],[28,-2],[32,7],[34,3],[34,-7],[86,-41],[20,-6],[13,1],[11,3],[17,2],[12,-5],[14,-29],[11,-13],[29,-11],[20,-4]],[[2424,7814],[0,3],[-9,7],[-33,9],[-8,3],[-5,4],[-10,11],[-5,2],[-4,0],[-2,-2],[-7,-7],[-5,-2],[-7,-2],[-15,0],[-7,1],[-5,2],[-3,2],[-34,16],[-9,3],[-7,1],[-9,-4],[-7,-1],[-4,0],[-4,1],[-7,6],[-7,5],[-5,1],[-5,1],[-9,-3],[-10,-3]],[[2182,7868],[-1,59]],[[2181,7927],[26,-3],[8,4],[2,6],[1,4],[-1,7],[0,4],[3,6],[3,1],[3,-1],[1,-2],[5,-9],[4,-3],[7,-2],[14,-2],[8,0],[6,2],[4,2],[5,4],[2,4],[1,4],[0,3],[-4,13],[-9,18],[-1,3],[0,3],[3,7],[6,11],[20,22],[12,18],[3,22],[0,4],[-1,4],[-1,3],[-2,2],[-3,2],[-6,4],[-15,4],[-7,3],[-3,2],[-6,4],[-2,3],[-1,3],[-1,6],[1,9],[1,6],[2,4],[5,7],[6,8],[53,89],[26,31],[4,6],[6,11],[38,0],[18,2],[7,0],[9,-2],[17,-11],[9,-2],[3,10],[-1,8],[-4,8],[-1,7],[3,6],[3,1]],[[2470,8315],[6,2],[7,-5],[10,-12],[14,-2],[11,5],[10,6],[11,3],[10,-2],[1,-4],[-3,-4],[-2,-5],[0,-11],[1,-4],[11,-6],[27,-10],[34,-3],[25,9],[0,22],[2,1],[2,0],[1,1],[0,4],[5,0],[9,-12],[31,-14],[7,-7],[4,-7],[7,0],[6,5],[-3,8],[-5,11],[7,2],[35,-6],[13,0],[3,6],[-12,17],[-2,14]],[[2753,8317],[17,3],[17,-7],[-6,-19],[59,18],[9,-3],[4,-5],[16,-8],[4,-5],[2,-6],[15,-27],[21,-25]],[[3936,8031],[-23,-18],[-5,-8],[0,-5],[2,-3],[3,-2],[4,-3],[2,-8],[-2,-7],[-9,-13],[-1,-11],[5,-5],[10,1],[9,4],[57,50],[17,6],[31,-12],[47,-10],[116,-48],[56,-52],[18,-5],[10,2],[24,12],[12,4],[18,-3],[15,-9],[6,-14],[-7,-16],[-19,-12],[-4,-5],[1,-9],[24,-15]],[[4353,7817],[-5,-21],[-5,-9],[-8,-5],[-15,0],[-5,-2],[-2,-5],[2,-5],[3,-5],[8,-7],[21,-13],[6,-10],[1,-11],[-1,-8],[2,-6],[23,-15],[4,-7],[-3,-8],[-54,-66],[-16,-9],[-17,-2],[-28,10],[-5,1],[-5,-1],[-4,-4],[-2,-5],[1,-11],[-1,-6],[-3,-4],[-10,-8],[-12,-17],[-11,-9],[-40,-13],[-16,-10],[-11,-14],[-13,-33]],[[4132,7479],[-8,-1],[-18,4],[-9,7],[-30,26],[-4,6],[-4,7],[-3,4],[-3,3],[-11,4],[-6,1],[-8,1],[-5,0],[-4,-2],[-2,-2],[-2,-2],[-7,-11],[-2,-3],[-5,-1],[-8,-1],[-16,0],[-6,-2],[-4,-3],[-1,-2],[-1,-1],[-4,-5],[-26,-20],[-9,-2],[-65,-8],[-3,-2],[-2,-3],[-1,-3],[0,-3],[1,-2],[2,-3],[3,-2],[3,-2],[7,-3],[27,-8],[4,-2],[2,-2],[1,-2],[-1,-4],[-7,-4],[-14,-4],[-13,0],[-12,2]],[[3858,7429],[-2,0],[-125,-11]],[[3731,7418],[-6,0],[-28,10],[-3,4],[-3,4],[1,3],[3,3],[5,4],[3,3],[2,5],[-2,3],[-5,2],[-4,1],[-4,0],[-8,-1],[-1,-2],[0,-3],[-1,-3],[-1,-2],[-1,-2],[-2,-2],[-8,-5],[-2,-3],[-8,-10],[-32,-30],[-4,0],[-3,1],[-15,5],[-6,3],[-7,7],[-4,2],[-18,5],[-4,2],[-3,2],[-2,2],[-9,6],[-15,5]],[[4860,8023],[-15,-1],[-16,10],[-8,10],[-22,15],[-15,9],[-9,0],[-22,-15],[0,-5],[11,0],[-22,-59],[-6,-35],[6,-37],[11,-28],[3,-5]],[[4756,7882],[-23,-18],[-8,-10],[-8,-12],[-15,-9],[-23,-8],[-41,-4],[-31,-1],[-21,-6],[-11,0],[-10,2],[-11,5],[-5,4],[-15,28],[-3,3],[-3,1],[-3,-1],[-6,-2],[-91,-15],[-8,-6],[-7,-9],[-7,-6],[-21,4],[-32,-5]],[[3906,8156],[15,-5],[4,1],[6,3],[4,6],[2,3],[3,1],[5,2],[57,-2],[42,-7]],[[4044,8158],[9,-11],[15,0],[32,5],[18,-1],[13,-2],[24,-9],[44,-26],[13,-4],[16,3],[11,7],[20,14],[34,8],[15,6],[2,10],[8,6],[7,3],[10,2],[13,1],[3,2],[5,8],[3,2],[21,0],[40,6],[21,-3],[13,-1],[11,-2],[6,0],[32,6],[8,1],[7,-1],[4,-1],[81,-11],[14,-5],[10,-5],[2,-3],[2,-2],[4,-9],[3,-3],[5,-2],[11,-3],[7,-1],[5,2],[6,2],[4,0],[14,-5],[27,-5],[6,0],[2,1],[2,2],[3,1],[5,2],[23,3],[7,0],[6,-1],[3,-2],[2,-2],[1,-3],[0,-2],[-2,-3],[-4,-5],[-2,-3],[-1,-3],[0,-3],[0,-4],[3,-9],[1,-9],[1,-7],[1,-3],[2,-3],[3,-3],[6,-2],[19,-5],[5,-2],[3,-2],[2,-2],[2,-2],[2,-3],[0,-3],[1,-8],[0,-3],[2,-3],[2,-2],[11,-7],[25,-14],[1,0]],[[4853,7536],[-26,-29],[-6,-3],[-50,32],[-21,2],[-37,-14],[-15,13],[5,5],[1,5],[1,12],[-8,-1],[-22,-10],[-46,20],[-9,6],[0,4],[2,5],[-2,4],[-8,6],[-9,4],[-10,2],[-9,0],[-9,6],[-9,17],[-10,1],[-49,-65],[-8,-7],[-20,-10],[-25,-27],[-13,-19],[-7,-6],[-11,2],[-40,16],[-14,0],[-17,-7],[-6,1],[-4,2],[-2,3],[-3,3],[-5,0],[-6,-3],[-24,-23],[-4,-10],[-4,-21]],[[4294,7452],[-23,-1],[-11,-2],[-21,-8],[-8,-1],[-8,0],[-26,5],[-8,2],[-5,3],[0,3],[2,2],[2,3],[11,7],[2,2],[2,3],[-1,4],[-5,5],[-13,7],[-8,2],[-6,0],[-3,-1],[-3,-2],[-2,-3],[-5,-2],[-4,-1],[-21,0]],[[4756,7882],[4,-8],[7,-6],[2,-10],[-5,-61],[4,-38],[25,-86],[4,-23],[2,-6],[4,-5],[11,-12],[3,-4],[1,-18],[5,-18],[16,-32],[14,-19]],[[4853,7536],[4,-5],[23,-24],[34,-25]],[[4914,7482],[-7,-3],[-18,-13],[9,-8],[6,-11],[9,-27],[-4,-4],[-24,-6],[-19,-10],[-23,-3],[-7,-3],[-3,-10],[7,-8],[21,-12],[-58,-61],[-5,-2],[-9,-4],[-17,-9],[-37,-16],[-6,-1],[-5,0],[-5,0],[-28,1],[-4,1],[-11,3],[-3,1],[-3,0],[-3,0],[-2,-2],[-1,-4],[0,-8],[2,-12],[0,-4],[-16,-53],[-4,-9],[-16,-15],[-5,-9],[-10,-30]],[[4615,7131],[-18,-4],[-11,0],[-83,16],[-12,7],[-15,12],[-15,7],[-28,11],[-8,1],[-39,3],[-8,2],[-5,1],[-4,2],[-10,8],[-6,8],[-4,2],[-44,18],[-10,7],[-4,2]],[[4291,7234],[-6,5],[0,30],[-2,4],[-4,5],[-5,2],[-6,2],[-3,4],[0,4],[2,12],[-1,4],[-2,3],[-20,13],[-5,5],[-3,4],[0,3],[0,4],[1,12],[1,4],[2,3],[5,1],[14,1],[3,1],[3,2],[9,10],[2,3],[4,10],[15,14],[2,4],[3,6],[3,12],[7,11],[3,4],[4,8],[0,4],[-1,3],[-4,1],[-4,1],[-4,0],[-7,-1],[-3,0]],[[5162,7315],[0,-1],[-3,-9],[-9,-19],[-2,-7],[0,-4],[0,-3],[0,-4],[1,-3],[3,-5],[1,-3],[-1,-3],[-1,-3],[-8,-14],[-2,-3],[-3,-2],[-3,-1],[-18,-7],[-3,-1],[-2,-2],[-3,-3],[-1,-2],[-4,-6],[-2,-3],[-2,-2],[-4,-1],[-6,-1],[-29,0],[-5,1],[-5,2],[-5,6],[-2,4],[-4,13],[-4,5],[-7,8],[-3,5],[-3,1],[-4,1],[-7,-2],[-3,-3],[-2,-3],[-1,-3],[-2,-3],[-2,-2],[-3,-2],[-4,0],[-3,2],[-3,7],[0,4],[0,4],[0,3],[-4,4],[-5,3],[-34,15],[-11,5]],[[4935,7278],[6,8],[1,9],[1,6],[-2,8],[-1,6],[-6,9],[-24,-3],[-22,-9],[-5,-2],[-4,-3],[-5,-3],[-12,-10],[-9,-20],[4,-6],[8,-13],[18,-7]],[[4883,7248],[1,-3],[1,-4],[-1,-4],[-2,-3],[-2,-3],[-4,-1],[-3,-1],[-4,1],[-3,1],[-5,5],[-3,2],[-3,0],[-3,0],[-6,-3],[-14,-5],[-8,-3],[-2,-6],[-2,-14],[-9,-17],[-12,-12],[-14,-9],[-16,-7],[2,-6],[2,-5],[-1,-6],[-3,-6]],[[4769,7139],[-2,1],[-4,1],[-4,1],[-5,0],[-3,-2],[-8,-6],[-4,-1],[-4,0],[-18,2],[-4,0],[-4,-1],[-3,-1],[-3,-2],[-9,-10],[-2,-2],[-3,-1],[-4,-1],[-4,0],[-4,1],[-4,2],[-11,8],[-6,3],[-8,3],[-9,1],[-4,0],[-9,-1],[-11,-3]],[[4914,7482],[17,-23],[27,-22],[31,-18],[22,-7],[48,-47],[25,-19],[26,-15],[16,-7],[36,-9]],[[4697,7149],[0,1],[2,2],[21,11],[6,2],[3,0],[1,0],[0,1],[1,1],[0,2],[0,2],[-1,2],[-1,1],[0,1],[-1,1],[-3,1],[-5,2],[-36,3],[-5,2],[-1,1],[-4,-11],[-1,-4],[4,-7],[5,-6],[7,-5],[8,-3]],[[2412,7694],[-3,-13],[10,-15],[14,-14],[14,-7],[-13,-24],[50,-38],[7,-26],[-20,4],[-11,-9],[-9,-14],[-10,-14]],[[2441,7524],[-10,6],[-8,8],[-5,11],[-10,-4],[-15,-1],[-15,1],[-6,7],[-6,8],[-40,13],[-6,20],[-88,36],[-27,15],[-8,-9],[-6,-9],[-3,-11],[1,-13],[-39,11],[-15,9],[2,10],[-16,20],[-24,9],[-84,12],[-41,10],[-24,11],[-8,-3],[-39,1],[-19,3],[-6,3],[-9,10],[-55,3],[-21,-3],[-10,-4],[-24,-15],[-9,-7],[-6,-3],[-6,0],[-7,1],[-7,-1],[-20,-11]],[[1702,7668],[-11,3],[-12,9],[-9,11],[-4,14],[59,19],[8,7],[-14,29],[-21,3],[-22,-1],[-30,22]],[[1646,7784],[15,7],[6,6],[7,7],[2,3],[1,2],[0,3],[-1,3],[-1,3],[-1,2],[0,3],[1,3],[3,6],[1,3],[3,6],[2,2],[3,2],[7,1],[9,0],[66,-5],[7,-2],[5,-1],[2,-3],[2,-2],[3,-6],[4,-5],[7,-7],[5,-8],[4,-5],[6,-7],[2,-2],[1,-4],[-3,-9],[0,-3],[1,-3],[2,-2],[3,-1],[2,0],[2,2],[8,8],[4,5],[3,3],[12,6],[3,2],[2,3],[2,2],[1,3],[5,13],[2,3],[6,1],[10,1],[21,0],[17,-2],[5,1],[6,4],[3,4],[2,4],[0,3],[0,4],[-1,7],[0,12],[0,3],[-2,3],[-1,3],[-2,2],[-9,6],[-10,4],[-3,2],[-1,3],[1,2],[1,3],[15,9],[9,7],[1,2],[2,2],[3,11],[1,2],[3,2],[4,1],[18,2],[7,0],[6,-2],[7,-9],[5,-2],[7,-3],[14,-5],[12,-6],[12,-11],[11,-7],[41,-11],[8,-4],[5,-4],[1,-8],[1,-3],[1,-3],[3,-2],[3,-2],[4,-2],[12,-3],[11,-2],[5,0],[13,2],[8,3],[11,5],[6,5],[3,13]],[[1395,7789],[2,-2],[6,-4],[13,-5],[9,-6],[6,-3],[4,-2],[16,-4],[7,-2],[3,-2],[2,-2],[2,-3],[4,-1],[5,0],[10,5],[5,4],[3,3],[1,3],[1,3],[1,1],[2,2],[3,2],[12,6],[4,2],[4,0],[7,-3],[7,-1],[6,0],[9,3],[23,2],[74,-1]],[[1702,7668],[-31,-17],[-14,-1],[-10,-3],[-21,-15],[-62,-31],[-18,-18],[4,-16],[-9,-10],[-2,-5],[-1,-6],[-3,-2],[-12,-6],[-5,-4],[-4,-10],[1,-9],[0,-9],[-11,-10],[-21,-8],[-47,-11],[-24,-10],[-13,-9],[-11,-9],[-20,-21],[-2,-6],[1,-14],[-1,-7],[-6,-13],[-6,-10],[-39,-34],[-14,-20],[13,-18],[0,-5],[-20,-3],[-12,-11]],[[1282,7287],[-18,23],[-13,10],[-53,8],[-26,11],[-6,18],[39,40],[-5,15],[-26,29]],[[1174,7441],[1,3],[0,4],[-2,3],[-2,1],[-7,2],[-3,2],[-2,2],[-2,3],[1,4],[3,5],[8,7],[4,2],[5,2],[9,-2],[11,-3],[8,-1],[5,0],[2,1],[3,1],[5,3],[9,9],[8,10],[1,4],[2,4],[0,9],[-2,4],[-3,3],[-3,2],[-2,3],[0,5],[2,10],[0,6],[0,4],[-1,3],[-1,4],[1,6],[6,21],[0,6],[-2,4],[-3,2],[-2,2],[0,3],[2,3],[6,4],[9,3],[6,3],[5,5],[6,6],[5,4],[16,9],[3,2],[2,4],[3,9],[3,8],[9,14],[4,5],[5,4],[3,1],[13,3],[3,1],[2,2],[3,2],[6,7],[3,5],[2,6],[0,9],[-2,5],[-3,3],[-5,4],[-2,2],[-2,3],[0,4],[1,4],[3,6],[6,8],[4,10],[6,10],[2,3],[13,13],[11,2]],[[1382,7800],[9,-7],[4,-4]],[[1282,7287],[-13,-11],[-22,-6],[-6,-4],[-5,-5],[-2,-5],[-5,-6],[-10,-4],[-20,-4],[-60,-30],[-146,-27],[-41,-20],[-35,-6],[-104,0],[-23,-6],[-11,0],[-7,4],[-8,2],[-9,1],[-16,41],[-5,22],[14,18],[36,29],[17,20],[43,28],[19,15],[6,10],[7,19],[6,11],[9,8],[12,6],[9,10],[2,15],[-3,5]],[[911,7417],[18,1],[24,6],[0,2],[-1,2],[-3,1],[-2,3],[-1,3],[-1,3],[1,3],[1,3],[1,2],[6,8],[3,2],[6,4],[3,1],[3,2],[6,0],[8,-1],[14,-5],[11,-5],[3,-2],[23,-3],[54,-2],[16,-4],[58,-5],[6,1],[5,2],[1,2]],[[2591,7647],[22,-24],[30,-21],[72,-37],[7,-4],[5,-5],[1,-2],[1,-4],[0,-3],[-1,-4],[0,-4],[0,-3],[5,-16],[1,-4],[-1,-3],[-1,-7],[1,-5],[2,-2],[3,0],[3,1],[2,3],[8,10],[3,2],[5,0],[10,-4],[4,-4],[1,-3],[-1,-3],[-6,-9],[-2,-3],[0,-5],[1,-2],[2,-1],[8,-1],[8,0],[15,1],[6,0],[7,-1],[12,-3],[6,-3],[4,-3],[2,-3],[0,-3],[-1,-4],[0,-4],[1,-5],[3,-8],[4,-4],[3,-2],[6,0],[7,2],[6,-1],[9,-2],[15,-8],[7,-4],[3,-5],[-1,-3],[-1,-3],[-2,-3],[-8,-7],[-6,-8],[-2,-5],[-2,-4],[-2,-5],[0,-1]],[[2875,7381],[-12,3],[-13,5],[-9,1],[-3,-3],[-3,-5],[-7,-4],[-8,-1],[-8,4],[-13,10],[-28,17],[-14,11],[-9,-5],[-27,18],[-16,-1],[6,-6],[-4,-2],[-4,-2],[-3,-2],[4,-7],[5,-5],[6,-4],[8,-2],[0,-5],[-5,-3],[-2,-2],[-5,-7],[11,-5],[-3,-5],[-9,1],[-5,12],[-5,6],[-40,14],[-43,30],[-10,3],[-22,16],[-9,4],[-24,1],[-11,2],[-8,4],[-29,25],[-5,1],[-6,11],[-14,7],[-38,13]],[[1475,3129],[21,-11],[27,1],[23,-3],[9,-25],[2,-5],[4,-2],[6,0],[5,3],[1,1],[2,2],[4,-3],[-17,-11],[-4,-6],[4,-6],[-8,-12],[-7,-30],[-8,-23],[-3,-4],[-9,-2],[-10,1],[-4,5],[0,6],[-4,6],[-30,42],[-13,28],[3,18],[0,7],[-6,0],[0,6],[12,17]],[[1429,3117],[-13,-5],[-17,2],[-13,6],[3,9],[0,6],[-21,17],[-7,11],[5,13],[12,7],[38,7],[13,4],[1,-28],[4,-35],[-5,-14]],[[1759,3350],[6,-6],[0,-7],[-4,-16],[0,-6],[2,-5],[5,-10],[7,-20],[3,-7],[4,-3],[8,-4],[4,-3],[2,-6],[11,-52],[7,-17],[11,-9],[27,-8],[7,-6],[4,-8],[0,-6],[-1,-7],[0,-9],[6,-13],[11,-9],[6,-10],[-5,-19],[-11,-11],[-13,-5],[-59,2],[-6,-3],[-6,-6],[-20,-8],[-9,-1],[-6,2],[-11,10],[-7,1],[-7,-7],[-10,-32],[-25,-33],[-5,-5]],[[1685,2988],[-6,9],[-20,-4],[-6,46],[-11,37],[-6,0],[-7,-5],[-19,9],[-14,2],[4,4],[7,13],[-11,7],[-18,-9],[-1,3],[-4,5],[-3,15],[-7,10],[-9,5],[-10,-6],[-4,9],[1,21],[-3,11],[-6,7],[-8,3],[-5,-1],[2,-9],[-5,3],[-3,5],[-3,6],[-1,7],[-2,10],[-5,2],[-6,1],[-4,2],[-7,13],[0,7],[4,6],[41,40],[5,16],[-14,18],[2,14],[-30,17],[-6,17],[3,8],[15,14],[4,7],[4,13],[-1,7],[-5,9]],[[1507,3412],[6,5],[7,10],[5,3],[7,1],[21,-2],[10,2],[20,11],[9,1],[26,-2],[5,-3],[14,-19],[43,-25],[9,-8],[15,-21],[8,-7],[11,-4],[36,-4]],[[2015,3683],[45,-7],[8,-2],[4,-3],[1,-3],[-1,-3],[-6,-7],[-4,-7],[-15,-72],[-26,-44],[-13,-37],[1,-4],[11,-19],[2,-6],[0,-6],[-2,-15],[-4,-9],[-9,-6],[-14,-5],[-8,-7],[2,-10],[5,-11],[2,-9],[-7,-6],[-34,-13],[-124,3],[-28,-5],[-42,-20]],[[1507,3412],[-8,14],[-2,3],[0,3],[7,10],[23,24],[11,14],[14,29],[10,16],[-7,6],[7,12],[-2,16],[-10,36],[-2,39],[-4,10],[0,5],[3,8],[-2,23],[2,5],[11,-2],[8,-5],[26,-33],[14,-12],[18,-6],[9,2]],[[1633,3629],[11,-3],[24,0],[11,-4],[4,-3],[6,-12],[10,-11],[28,-18],[14,-4],[27,5],[26,-6],[9,0],[78,30],[15,9],[26,26],[34,61],[3,3],[3,2],[4,1],[30,-8],[19,-14]],[[1693,4164],[-7,-9],[-1,-6],[7,-21],[7,-8],[29,-11],[6,-8],[2,-19],[6,-8],[9,-3],[30,0],[36,-11],[165,15],[8,0],[8,-3],[8,-4],[7,-6],[4,-9],[10,-37],[2,-26],[8,-24],[11,-16],[2,-6],[-2,-6],[-14,-16],[-34,13],[-25,-20],[1,-27],[42,-8],[3,-7],[-19,-42],[12,-13],[27,-7],[39,-18],[44,-10],[18,-9],[2,-1],[1,-1],[0,-29]],[[2145,3743],[-3,1],[-11,2],[-34,-2],[-32,-13],[-28,-21],[-22,-27]],[[1633,3629],[14,3],[-43,11],[-8,6],[2,15],[11,15],[13,13],[8,10],[-5,0],[-3,-6],[-4,-4],[-5,-4],[-6,-3],[10,8],[9,15],[7,15],[3,12],[3,28],[-2,9],[-7,13],[-18,17],[-25,12],[-26,2],[-23,-14],[6,-5],[3,5],[3,1],[5,-1],[7,0],[-10,-5],[-6,-8],[-8,-22],[-6,7],[8,9],[-6,8],[-10,6],[-13,9],[-2,0],[-2,2],[-3,6],[-1,7],[2,6],[3,5],[1,6],[-6,32],[1,10],[10,18],[0,11],[-10,12],[-12,-5],[-3,3],[6,7],[14,7],[3,-1],[26,2],[14,4],[6,1],[8,4],[9,11],[7,13],[2,13],[-4,11],[-15,23],[-3,16],[-4,46],[14,40],[0,25],[-11,20],[-18,14],[-22,12],[-6,-6],[-18,12],[-2,17],[7,35]],[[1502,4245],[15,-10],[17,-4],[18,2],[17,6],[17,14],[7,3],[8,-2],[16,-9],[34,-33],[14,-25],[5,-6],[18,-12],[5,-5]],[[1853,4701],[42,-8],[17,1],[11,3],[35,18],[4,0],[3,0],[5,0],[14,-4],[10,-13],[5,-16],[-3,-14],[-11,-9],[-15,-4],[-40,0],[-3,-3],[-2,-6],[1,-6],[2,-6],[4,-5],[5,-3],[5,-2],[48,1],[6,-1],[6,-4],[4,-5],[28,-50],[1,-9],[-4,-46],[-3,-6],[-11,-13],[-1,-6],[4,-7],[8,-4],[83,-27],[12,2],[11,7],[12,5],[14,-7],[5,-6],[9,-25],[2,-18],[-2,-17],[-5,-18],[-1,-9],[3,-9]],[[2171,4352],[-1,-11],[3,-9],[6,-7],[11,-2],[39,2],[11,-5],[7,-12],[-4,-7],[-21,-11],[-8,-8],[-6,-11],[-6,-23],[-3,-5],[-19,-8],[-4,-6],[-7,-15],[-3,-4],[-105,-34],[-13,-8],[-13,-15],[-7,0],[-16,10],[-49,48],[-51,15],[-19,2],[-4,2],[-2,2],[-4,10],[-4,3],[-4,1],[-4,1],[-5,-2],[-9,-6],[0,-7],[3,-8],[-1,-11],[-5,-7],[-5,-4],[-64,-12],[-16,-6],[-34,-27],[-10,-3],[-10,0],[-9,3],[-9,6],[-4,1]],[[1502,4245],[2,10],[-4,16],[-9,23],[-12,20],[-13,9],[-15,7],[-7,17],[-3,22],[-7,19],[-17,15],[-20,-1],[-43,-20],[-17,6],[8,17],[9,12],[-19,5],[-14,-9],[-9,-18],[-4,-19],[-7,12],[-5,13],[-5,22],[0,6],[14,6],[14,8],[9,13],[3,20],[2,0],[4,4],[1,6],[-4,2],[-11,1],[-4,2],[-5,4],[-13,15],[-6,6],[-10,2],[64,118],[4,14],[1,15],[-5,13],[-15,5],[-11,7],[3,15],[9,16],[7,10],[7,0],[2,-11],[6,-1],[8,1],[6,-7],[-1,-7],[-3,-11],[-2,-11],[3,-10],[38,-38],[27,-13],[94,-10],[47,-11],[19,-2],[16,3],[66,22],[17,11],[13,14],[6,13],[57,20],[21,1],[14,-2],[11,-4],[39,23]],[[1452,4843],[8,-7],[2,-10],[-3,-10],[-7,-8],[-49,-7],[-20,-11],[0,-24],[-4,-20],[-30,2],[6,8],[4,8],[1,9],[0,8],[5,7],[10,9],[16,11],[13,4],[2,10],[-2,12],[2,9],[5,1],[15,-2],[3,4],[2,4],[5,4],[10,7],[0,-7],[2,-5],[4,-6]],[[2633,4632],[-5,-3],[-12,5],[-5,9],[11,0],[6,2],[9,-6],[-4,-7]],[[2633,4676],[-34,-19],[-7,-1],[-5,2],[-5,0],[-3,-1],[1,2],[48,28],[2,0],[2,-5],[1,-6]],[[2520,4813],[-2,-2],[-1,1],[-4,1],[-1,2],[0,3],[4,1],[5,1],[-1,-2],[0,-5]],[[2362,4925],[-8,-14],[-2,3],[-3,2],[-5,-1],[-1,5],[3,3],[6,4],[2,4],[8,-6]],[[2407,4915],[3,-4],[0,-5],[-3,-6],[-5,1],[-7,7],[-7,4],[-6,-2],[-3,2],[9,17],[-4,5],[3,8],[6,12],[5,7],[7,-1],[5,-5],[3,-6],[1,-4],[0,-6],[-7,-24]],[[2131,4964],[4,-2],[3,0],[7,-1],[-2,-4],[1,0],[-4,-4],[-5,-3],[-8,10],[4,4]],[[2306,4952],[-7,-3],[-2,0],[-2,0],[-2,1],[-3,3],[-1,4],[2,11],[4,1],[4,0],[9,-3],[-2,-14]],[[2377,4939],[-33,-6],[-16,3],[-3,7],[0,7],[4,3],[6,3],[6,3],[3,6],[2,8],[3,1],[5,0],[5,4],[7,-1],[5,-6],[2,-7],[0,-7],[-1,-7],[1,-4],[3,-4],[1,-3]],[[2640,4459],[-8,7],[-9,4],[-21,3],[-8,-1],[-12,-8],[-6,0],[-8,5],[-12,15],[-9,5],[-30,3],[-23,-8],[-46,-31],[-13,-4],[-14,1],[-28,8],[-15,0],[-10,-5],[-18,-21],[-4,-7],[-6,-22],[-5,-7],[-15,-11],[-40,-21],[-109,-12]],[[1853,4701],[10,5],[14,13],[30,40],[11,7],[-2,3],[0,1],[0,1],[-4,1],[27,8],[8,4],[6,5],[9,16],[5,3],[10,4],[14,11],[13,13],[12,21],[17,6],[57,5],[12,4],[24,18],[5,-6],[13,13],[5,14],[0,35],[6,15],[16,7],[19,4],[15,6],[2,-8],[5,-4],[7,-1],[9,2],[9,-11],[-1,-30],[9,-6],[-3,4],[-1,5],[2,6],[2,8],[6,0],[4,-11],[-1,-3],[-3,-4],[0,-5],[12,1],[5,2],[6,2],[4,-4],[13,-7],[2,20],[14,-3],[31,-23],[0,6],[7,-4],[6,-1],[7,-1],[8,0],[0,-6],[-4,-2],[-2,-3],[-2,-3],[-3,-4],[9,-3],[6,-6],[5,-8],[9,-7],[-5,-6],[-1,-9],[6,-20],[9,17],[5,8],[8,5],[-2,4],[-2,3],[-2,2],[-5,3],[10,5],[11,-1],[11,-2],[11,-2],[5,3],[4,4],[5,1],[6,-8],[-6,-7],[8,-4],[6,-4],[4,-2],[6,5],[5,0],[2,-4],[0,-1],[1,0],[3,-1],[-1,-11],[-2,-8],[-5,-8],[-9,-9],[-2,4],[-2,4],[-2,4],[-15,-52],[-8,-13],[17,0],[-6,12],[16,6],[9,-2],[3,-9],[-4,-13],[4,0],[1,1],[-1,3],[1,2],[6,-5],[2,-1],[4,0],[12,10],[24,-1],[24,-7],[15,-8],[-10,-10],[-12,1],[-14,6],[-13,3],[-14,-6],[-4,-13],[-3,-16],[-11,-11],[4,-12],[-11,-3],[-39,2],[0,-4],[1,-1],[-7,-1],[6,-10],[7,0],[8,3],[8,1],[9,-3],[15,-7],[5,-2],[16,3],[13,7],[12,5],[17,-3],[-4,-7],[-5,-6],[-7,-4],[-8,-1],[0,-5],[30,-12],[5,-3],[2,-10],[4,-5],[8,0],[9,6],[6,-8],[8,-5],[9,-3],[11,-2],[-27,-7],[-9,-6],[8,-11],[0,-5],[-13,2],[-11,-4],[-3,-8],[9,-8],[1,10],[5,-11],[24,-26],[5,-12],[3,-15],[26,-41],[3,-11],[0,-6]],[[2307,4990],[-6,-1],[-6,2],[-5,3],[3,4],[13,3],[1,-11]],[[2330,5007],[-3,-3],[-3,-1],[-2,2],[-4,-5],[-6,8],[3,0],[3,4],[6,3],[4,2],[1,-4],[2,-2],[-1,-4]],[[2308,5010],[1,-6],[-6,1],[-8,1],[-1,2],[-1,2],[-3,5],[3,3],[2,-1],[2,0],[2,-1],[3,-1],[6,-5]],[[2640,4459],[4,-48],[3,-8],[4,-7],[5,-3],[12,-2],[3,-5],[1,-7],[5,-9],[23,-18],[5,-6],[1,-8],[-10,-15],[-3,-9],[-2,-19],[-8,-13],[-18,-24],[-14,-32],[-10,-11],[-19,-5],[-12,-5],[-10,-11],[-15,-25],[-11,-10],[-20,-14],[-10,-12],[-7,-17],[-1,-13],[2,-20]],[[2538,4083],[-17,-5],[-25,-18],[-14,-1],[-23,17],[-6,2],[-5,-3],[-1,-7],[-1,-7],[-1,-6],[-6,-6],[-23,-13],[-46,-58],[-75,-30],[-4,-4],[-5,-6],[-6,-6],[-16,-6],[-5,-6],[-1,-5],[1,-4],[2,-3],[4,-2],[12,-6],[3,-3],[-1,-20],[-9,-7],[-12,-4],[-8,-13],[0,-9],[2,-9],[0,-9],[-5,-8]],[[2247,3818],[-57,-6],[-9,-5],[-3,-5],[-2,-6],[3,-54],[1,-2],[-35,3]],[[2554,3501],[-42,20],[-9,2],[-20,-2],[-9,3],[-48,40],[-17,9],[-21,4],[-13,-4],[-11,0],[-17,15],[-2,8],[4,17],[-3,8],[-8,3],[-9,-2],[-16,-6],[-6,0],[-4,3],[-2,4],[1,6],[3,7],[4,5],[6,4],[15,7],[5,7],[0,7],[-7,7],[-12,4],[-4,3],[-1,4],[0,8],[-2,4],[-9,6],[-21,9],[-8,5],[-26,34],[-4,11],[1,7],[6,13],[0,7],[-5,16],[0,6],[4,8]],[[2538,4083],[2,-16],[1,-8],[20,-45],[9,-11],[12,-5],[7,-4],[19,-21],[18,-11],[-1,-13],[-31,-66],[-5,-27],[7,-24],[5,3],[6,3],[5,0],[2,-6],[-3,-8],[-5,-2],[-6,0],[-4,-2],[-6,-11],[-4,-11],[0,-10],[5,-9],[-6,0],[0,-5],[4,-2],[3,-3],[4,-2],[0,-5],[-10,-10],[-7,-19],[-5,-21],[-1,-21],[1,-11],[4,-21],[1,-13],[-1,-8],[-8,-15],[-2,-12],[-2,-5],[-4,-7],[-4,-9],[-2,-12],[6,-38],[-2,-24],[-6,-15]],[[2554,3501],[-15,-41],[14,-15],[-5,-28],[-21,-45],[-10,-38],[-1,-13],[2,-12],[7,-9],[19,-11],[0,-6],[-23,-7],[-21,-19],[-12,-24],[5,-21],[-7,-8],[3,-5],[6,-5],[4,-5],[-2,-7],[-8,-17],[-2,-9],[-7,-8],[-15,-5],[-14,-8],[-4,-18],[-7,3],[-3,3],[1,5],[3,7],[-13,7],[-13,2],[-13,-3],[-12,-6],[-6,0],[-5,7],[-7,5],[-17,6],[-21,20],[-5,3],[-8,4],[-20,17],[-7,3],[-8,2],[-12,5],[-11,5],[-6,6],[-6,-6],[-12,5],[-15,4],[-31,3],[-15,-6],[-14,-12],[-10,-12],[-3,-5],[-24,6],[-20,15],[-34,32],[-8,-5],[-7,4],[-6,7],[-8,5],[-12,3],[-8,-1],[-2,-3],[11,-4],[0,-6],[-4,-7],[5,-4],[7,-4],[3,-4],[0,1],[10,-2],[21,3],[4,-4],[0,-7],[-1,-4],[-34,-28],[-10,-12],[-7,-17],[-2,-19],[3,-17],[4,-15],[7,-15],[5,-5],[5,-4],[1,-7],[-14,-18],[-9,-30],[6,0],[-8,-5],[-3,1],[-6,4],[-7,-11],[-86,-69],[-5,-2],[-9,-1],[-4,-2],[-10,-12],[-6,-4],[-10,2],[-12,7],[-18,15],[0,-18],[-13,17],[-20,14],[-23,8],[-19,2],[-18,-6],[-22,-13],[-15,-16],[3,-18],[-11,-6],[-6,6],[7,16],[-8,5],[-15,1],[-13,2],[0,6],[13,15],[0,21],[-4,6]],[[3783,5839],[2,-7],[-4,2],[-3,0],[-2,-1],[2,-7],[2,-7],[-10,5],[-1,2],[-2,5],[0,4],[2,3],[5,1],[4,2],[5,-2]],[[3640,5899],[-14,-10],[-12,6],[-31,24],[-9,11],[13,7],[-1,11],[6,4],[11,-4],[15,-10],[11,-19],[2,-11],[9,-9]],[[4317,6303],[23,-16],[3,-3],[4,-5],[3,-10],[3,-4],[5,-3],[7,-4],[3,-4],[0,-3],[-1,-3],[-3,-6],[-3,-5],[-3,-3],[-3,-1],[-3,-6],[-1,-9],[2,-25],[-1,-11],[-1,-6],[-4,-2],[-3,-1],[-13,-1],[-4,-1],[-2,-1],[-2,-1],[-2,-2],[-2,-2],[-7,-13],[-2,-4],[-3,-3],[-5,-4],[-6,-2],[-16,-4],[-3,-2],[-4,-3],[-11,-13],[-3,-2],[-2,-2],[-3,-1],[-43,-15],[-3,0],[-3,1],[-6,6],[-4,1],[-5,0],[-6,-3],[-3,-3],[0,-3],[0,-3],[2,-3],[0,-4],[1,-4],[-2,-6],[-13,-9],[-3,-4],[-1,-4],[2,-2],[3,-2],[23,-14],[5,-4],[2,-3],[2,-4],[0,-7],[-2,-13],[-2,-6],[-3,-4],[-2,-2],[-4,-2],[-3,-1],[-78,-7],[-4,-1],[-5,-2],[-7,-4],[-3,-3],[-3,-3],[-17,-38]],[[4069,5937],[-26,10],[-20,6],[0,6],[-8,4],[-9,2],[-9,1],[-9,-1],[6,-6],[-24,1],[-62,17],[-12,1],[-15,0],[-13,-3],[-6,-7],[-3,-13],[-12,-14],[-2,-11],[-8,3],[-8,0],[-7,-2],[-1,-1],[-7,4],[-11,11],[-23,6],[-10,10],[-7,14],[0,9],[10,12],[12,3],[24,-7],[19,1],[13,15],[7,20],[1,21],[-2,14],[-17,22],[-7,15],[-8,0],[-10,-4],[-7,-1],[-10,12],[-8,17],[-8,13],[-14,5],[-2,17],[-21,13],[-40,18],[-5,10],[-3,14],[-5,13],[-8,5],[-7,3],[-24,20],[-44,18],[-134,35],[20,12],[8,14],[1,17],[0,19],[2,6],[5,4],[3,6],[-4,11],[-8,9],[-11,6],[-38,13]],[[3443,6425],[6,10],[15,13],[4,9],[0,23],[3,6],[8,5],[7,-2],[12,-12],[12,-3],[5,15],[-3,35],[-7,10],[-11,4],[-24,0],[-11,4],[-3,8],[0,10],[-3,10]],[[3453,6570],[9,11],[3,6],[5,15],[2,2],[4,1],[3,0],[8,-5],[16,-2],[3,3],[4,7],[3,3],[10,3],[23,-6],[12,0],[58,9]],[[3616,6617],[16,-1],[26,9],[34,6],[31,12],[11,-4],[6,-10],[-2,-32],[3,-15],[7,-15],[10,-15],[7,-2],[31,5],[6,-2],[14,-6],[7,-1],[49,10],[31,-3],[30,-8],[6,0],[31,5],[23,-2],[4,-9],[1,-9],[-2,-7],[-4,-9],[-1,-38],[32,-28],[44,-11],[36,13],[14,9],[9,-3],[9,-8],[10,-3],[14,4],[8,1],[6,-2],[31,-17],[6,-16],[0,-41],[13,-28],[3,-15],[-5,-14],[2,-13],[29,-4],[65,3]],[[3116,5908],[-2,-15],[-16,4],[2,14],[8,6],[8,-9]],[[2931,6112],[-8,-4],[-12,0],[-11,3],[-7,5],[2,6],[9,3],[8,7],[6,11],[4,1],[3,-9],[3,-7],[4,-5],[1,-2],[0,-3],[-2,-6]],[[3212,6318],[6,-10],[-6,-15],[-8,-9],[-11,-7],[-16,-5],[16,-5],[15,-14],[4,-16],[-12,-12],[-4,8],[-6,1],[-9,-1],[-10,4],[-3,5],[-9,15],[-2,4],[-11,5],[-11,8],[-11,0],[-10,-19],[-7,14],[-33,-13],[-17,11],[-5,-13],[-4,-5],[-4,-1],[-69,2],[-19,5],[-15,12],[-5,23],[9,15],[18,9],[21,5],[18,1],[8,-2],[19,-7],[10,-3],[15,-1],[20,1],[-1,4],[0,1],[-1,0],[-4,1],[11,6],[0,7],[0,1],[15,-2],[31,1],[-4,-13],[9,-5],[13,0],[6,2],[3,8],[6,5],[8,3],[5,5],[9,22],[7,9],[10,4],[8,-2],[8,-5],[6,-8],[4,-9],[-6,-6],[-4,-9],[-1,-10]],[[2702,6484],[-18,-1],[-14,18],[19,33],[16,7],[12,-8],[1,-2],[2,-2],[3,-2],[6,-12],[-10,-17],[-17,-14]],[[2780,6852],[-6,-7],[-12,4],[3,10],[5,0],[4,2],[4,-1],[2,-2],[0,-6]],[[3443,6425],[-20,7],[-41,9],[-41,1],[-38,-9],[4,-9],[3,-4],[-24,-8],[-16,13],[-18,43],[21,13],[12,16],[18,48],[-2,10],[0,19],[3,18],[6,11],[-7,15],[-3,18],[-2,35],[-4,18],[-9,17],[-67,105],[-54,56],[-12,11],[-27,10],[-8,13],[-19,66],[-1,9]],[[3097,6976],[146,49],[20,-3],[5,-21],[-6,-19],[-9,-15],[-7,-16],[2,-23],[19,-53],[2,-22],[-4,-31],[2,-11],[5,-10],[7,-6],[4,-1],[9,1],[4,-1],[6,-8],[1,-24],[2,-11],[7,-7],[10,-7],[20,-10],[12,-1],[46,9],[20,8],[10,0],[10,-5],[0,-9],[-5,-10],[-20,-20],[-3,-4],[1,-13],[14,-21],[-4,-14],[-6,-5],[-17,2],[-8,-2],[-6,-6],[-2,-8],[3,-9],[6,-6],[55,-28],[5,-15]],[[3448,7154],[14,-19],[40,-23],[15,-15],[0,-1],[12,5],[49,5],[19,-19],[15,-24],[3,-25],[-18,-20],[-50,-5],[-8,-8],[1,-5],[3,-5],[7,-8],[3,-7],[1,-7],[-2,-15],[0,-24],[7,-27],[14,-24],[21,-10],[56,-7]],[[3650,6866],[36,-41],[8,-18],[2,-12],[-2,-11],[-5,-8],[-11,-5],[-15,-4],[-6,-3],[-4,-7],[-2,-7],[1,-6],[2,-6],[4,-5],[21,-15],[7,-9],[0,-14],[-5,-12],[-7,-4],[-8,0],[-21,7],[-4,0],[-5,-2],[-5,-7],[1,-9],[2,-9],[1,-8],[-5,-8],[-13,-16],[-1,-10]],[[3097,6976],[-24,198],[-2,6]],[[3071,7180],[19,5],[17,1],[56,-7],[20,1],[14,6],[7,2],[8,-3],[10,-11],[5,-6],[2,-8],[-1,-7],[-3,-4],[0,-5],[7,-8],[10,-6],[11,-2],[105,2],[14,5],[13,9],[5,8],[4,9],[5,8],[10,2],[12,-1],[9,-2],[9,-5],[9,-9]],[[3064,7572],[-1,-9],[-5,-10],[-6,-9],[-7,-8],[-32,-15],[-7,-5],[1,-10],[10,-22],[-3,-13],[-7,-15],[2,-6],[21,-9],[16,-30],[-14,-38],[-29,-34],[-32,-22]],[[2971,7317],[-5,3],[-26,33],[-13,8],[-16,3],[-30,16],[-6,1]],[[3363,7447],[17,-10],[43,-10],[17,-7],[9,-8],[3,-4],[3,-5],[5,-15],[7,-14],[2,-8],[-3,-7],[-5,-3],[-17,-5],[-28,-27],[-4,-7],[-1,-28],[-1,-9],[-15,-32],[-3,-13],[7,-9],[4,0],[9,1],[4,0],[6,-2],[10,-5],[13,-11],[8,-9],[5,-11],[4,-11]],[[3462,7178],[-14,-24]],[[3071,7180],[-9,26],[-35,64],[-24,30],[-32,17]],[[3731,7418],[3,-21],[-30,-62],[16,0],[16,-8],[7,-11],[-7,-9],[-8,-5],[-7,-6],[-5,-8],[-4,-8],[-2,-10],[1,-21],[-3,-10],[-4,-7],[0,-6],[8,-14],[-1,-6],[-9,-10],[-8,-5],[-34,-14]],[[3660,7177],[-14,7],[-11,-4],[-10,-8],[-14,-6],[-42,-3],[-13,3],[-22,16],[-14,-3],[-13,-10],[-6,-2],[-10,1],[-29,10]],[[3858,7429],[5,-5],[1,-4],[0,-3],[-1,-3],[-2,-1],[-5,-3],[-4,-5],[-3,-6],[-1,-7],[-1,-7],[4,-19],[-2,-7],[-9,-14],[-17,-68],[-18,-26],[-1,-3],[0,-4],[3,-6],[5,-6],[3,-6],[-1,-7],[-7,-6],[-37,-25],[-19,-1],[-8,-6],[-2,-5],[-3,-45],[-8,1],[-22,10],[-28,7],[-8,5],[-7,17],[-5,6]],[[4291,7234],[-12,-3],[-25,-1],[-9,-3],[-9,-7],[-15,-15],[-3,-5],[-1,-13],[-2,-6],[-39,-52],[-3,-23],[6,-8],[22,-20],[-1,-6],[-6,-5],[-28,-12],[-3,-3],[-3,-4],[-7,-14],[-4,-6],[-6,-2],[-20,1],[-8,-2],[-6,-4],[-3,-8],[1,-6],[10,-13],[-1,-11],[-13,-6],[-58,-9],[-12,-7],[-9,-12]],[[4024,6949],[-8,-3],[-12,-11],[-9,-5],[-54,-6],[-5,7],[-4,7],[-8,3],[-6,-5],[-20,-28],[-6,-5],[-22,-11],[-7,-1],[-10,5],[-2,8],[-1,9],[-3,10],[-9,-1],[-43,-36],[-12,18],[-24,21],[-26,15],[-20,4],[-43,-18],[-9,-6],[-6,-12],[-5,-42]],[[4769,7139],[5,-1],[12,-7],[44,-32],[-1,-3],[-2,-6],[-12,-13],[-5,-6],[-5,-4],[-3,-1],[-5,2],[-3,2],[-1,3],[-3,28],[-2,3],[-2,2],[-3,-1],[-4,-4],[-6,-11],[-4,-12],[-3,-4],[-3,-3],[-9,-3],[-15,-3],[-4,-3],[-15,-12],[-6,-3],[-5,-3],[-12,-3],[-3,-1],[-2,-4],[0,-4],[9,-24]],[[4701,7008],[-42,-59],[-14,-14],[-4,-1],[-11,-1],[-6,-1],[-9,-5],[-4,-4],[-1,-3],[2,-3],[2,-2],[3,-2],[15,-5],[6,-4],[2,-3],[2,-3],[0,-7],[-2,-3],[-4,-2],[-7,-2],[-6,-3],[-7,-4],[-17,-15],[-4,-4],[-4,0],[-7,-2],[-6,-2],[-13,-9],[-3,-5],[-1,-4],[2,-3],[3,-1],[4,-1],[18,1],[3,-1],[2,-3],[0,-5],[-1,-14],[0,-5],[1,-3],[2,-2],[2,-2],[34,-8],[7,-3],[3,-2],[2,-5],[1,-9],[-1,-20],[1,-9],[2,-6],[3,-2],[8,-2],[5,0],[9,0],[4,1],[3,2],[2,2],[2,3],[5,8],[2,3],[3,1],[4,0],[4,-1],[3,-2],[4,-5],[3,-8],[0,-4],[-2,-4],[-11,-7],[-35,-17],[-3,-1],[-4,-1],[-19,0],[-4,-1],[-4,-1],[-2,-2],[-6,-4],[-6,-4],[-3,-1],[-4,-1],[-5,0],[-8,2],[-23,8],[-5,0],[-5,-1],[-7,-4],[-3,-3],[-2,-4],[-5,-26],[-2,-6],[-2,-4],[-2,-3],[-8,-5],[-3,-3],[-3,-1],[-24,-5],[-7,-4],[-3,-2]],[[4490,6626],[-39,0],[-11,-4],[-4,-4],[-1,-3],[-3,0],[-17,11],[-8,9],[-14,26],[-8,6],[-28,3],[-22,10],[-12,2],[-2,-2],[-19,17],[-32,15],[-14,18],[-9,19],[-4,4],[-75,36],[-14,9],[-11,12],[-3,5],[-1,15],[1,5],[6,9],[1,5],[-6,17],[-18,10],[-19,7],[-15,10],[-12,20],[-7,8],[-20,10],[-20,17],[-6,1]],[[4490,6626],[-7,-5],[-18,-26],[-5,-13],[1,-4],[1,-3],[1,-3],[1,-3],[2,-5],[1,-7],[2,-15],[2,-6],[2,-5],[4,0],[4,0],[2,2],[5,5],[3,2],[3,1],[5,-2],[4,-3],[6,-9],[1,-6],[1,-5],[-2,-15],[0,-4],[-1,-3],[-3,-6],[-2,-2],[-9,-10],[-5,-8],[-6,-20],[-4,-10],[-6,-24],[-1,-7],[2,-4],[7,-3],[4,-3],[3,-5],[1,-4],[0,-4],[-2,-3],[-1,-3],[-2,-3],[-2,-2],[-5,-5],[-5,-2]],[[4472,6366],[-36,-19]],[[4436,6347],[-40,-12],[-7,-3],[-21,-17],[-6,-1],[-4,0],[-6,4],[-4,2],[-8,2],[-4,-1],[-4,-1],[-10,-9],[-2,-2],[-3,-6]],[[7870,4434],[3,-22],[-16,2],[-10,15],[-11,11],[11,8],[17,2],[8,-3],[-2,-13]],[[8487,4506],[-1,-8],[-14,-5],[-1,-2],[0,-3],[3,-2],[3,-2],[3,-1],[4,-3],[3,-3],[4,-6],[0,-5],[0,-4],[-8,-23],[2,-35],[-2,-39],[1,-3],[3,-9],[10,-46],[3,-6],[6,-7],[2,-1],[4,-1],[4,0],[19,6],[3,0],[8,0],[5,-3],[4,-6],[13,-23],[5,-5],[2,-2],[9,-5],[3,-3],[3,-4],[5,-8],[3,-3],[6,-4],[7,-5]],[[8611,4227],[-68,-77],[-18,-28],[-20,-51],[-5,-8],[-13,-7],[-30,-41],[-34,-23]],[[8423,3992],[-15,3],[-53,4],[-26,-5],[-5,0],[-4,0],[-31,5],[-25,-2],[-4,1],[-3,1],[-2,2],[-3,5],[-3,2],[-4,-1],[-5,-3],[-3,-3],[-2,-3],[-2,-3],[-1,-5],[-1,-7],[-1,-21],[-2,-12],[-7,-13]],[[8221,3937],[-14,9],[-4,3],[-1,4],[-1,11],[-3,8],[-10,12],[-3,7],[0,9],[6,7],[8,6],[8,4],[10,9],[-1,9],[-9,9],[-14,5],[-10,7],[-2,12],[17,57],[3,32],[-19,1],[-11,-1],[-7,-3],[-3,-5],[-3,-13],[-4,-5],[-14,-6],[-28,1],[-29,-8],[-16,1],[-14,5],[-12,11],[-7,12],[-19,65],[-7,9],[-22,9],[-8,7],[-1,11],[7,9],[11,7],[6,9],[-5,24],[-29,49],[2,22],[15,20],[2,4],[-40,26],[-15,17],[3,21],[6,4],[23,7],[46,22],[3,24],[-27,40],[3,23],[9,5],[24,2],[58,21],[13,8]],[[8092,4612],[80,-74],[47,-34],[12,-6],[8,-2],[7,2],[5,3],[16,12],[19,17],[18,13],[3,1],[2,1],[5,1],[3,-1],[2,-2],[3,-5],[5,-9],[8,-7],[5,-3],[5,0],[2,2],[1,3],[-2,2],[-1,3],[-7,6],[-2,3],[0,2],[2,3],[6,1],[5,-1],[15,-7],[5,0],[1,1],[0,3],[-1,3],[3,3],[7,1],[29,-3],[6,-3],[3,-2],[18,-8],[26,-5],[5,-2],[3,-2],[18,-16]],[[8051,4675],[6,-3],[4,-3],[3,-5],[3,-6],[10,-27],[6,-11],[9,-8]],[[8221,3937],[-2,-4],[-4,-7],[-3,-6],[-1,-3],[0,-3],[2,-17],[-1,-3],[0,-4],[-1,0],[-3,-6],[-2,-3],[-4,-4],[-5,-4],[-2,-2],[-2,-3],[-3,-6],[-2,-11],[-2,-3],[-1,-3],[-2,-2],[-5,-4],[-2,-3],[-1,-2],[1,-3],[3,-1],[3,-1],[3,-2],[1,-3],[1,-3],[2,-10],[-1,-3],[-1,-3],[-3,-1],[-7,2],[-3,3],[-3,3],[-3,5],[-2,2],[-2,2],[-3,2],[-6,4],[-3,1],[-4,5],[-3,1],[-4,1],[-34,5],[-8,-1],[-18,-4],[-14,-7],[-3,-2],[-2,-2],[-2,-6],[-8,-2],[-90,-6],[-7,-2],[-5,0],[-6,1],[-8,3],[-5,2],[-3,3],[-10,11],[-19,17],[-2,2],[-1,3],[-1,3],[0,3],[3,7],[7,11],[1,3],[-2,1],[-4,0],[-16,-6],[-6,-2],[-7,1],[-4,2],[-4,2],[-2,2],[-11,13],[-1,2],[-3,1],[-5,1],[-7,0],[-15,-1],[-3,-2],[-3,-2],[-5,-10],[-3,-2],[-5,1],[-3,1],[-3,2],[-2,3],[-5,4],[-3,1],[-17,8],[-6,-1],[-8,-3],[-54,-33],[-3,-4],[-4,-5],[-4,-9],[-13,-15],[-2,-2]],[[7673,3825],[-4,4],[-6,12],[-5,18],[-12,14],[-29,24],[-23,30],[-4,3]],[[7590,3930],[13,12],[2,5],[-3,1],[-3,1],[-2,1],[-3,2],[-2,5],[0,2],[9,7],[7,7],[21,29],[3,7],[0,4],[-2,10],[0,6],[1,4],[2,2],[7,6],[9,9],[3,2],[3,2],[6,3],[7,2],[4,3],[4,3],[7,6],[4,3],[11,5],[8,13],[3,8],[1,3],[1,4],[-1,4],[-1,4],[-1,4],[-2,2],[-4,5],[-12,7],[-2,2],[-2,2],[-6,7],[-2,3],[-3,1],[-16,8],[-6,4],[-2,2],[-2,2],[-3,5],[-2,6],[-3,33],[-1,4],[-4,5],[-5,4],[-3,2],[-3,1],[-4,1],[-13,1],[-4,0],[-3,2],[-3,1],[-15,13],[-8,9],[-5,4],[-4,1],[-3,1],[-5,0],[-4,0],[-5,2],[-5,4],[-10,17],[-3,4],[-6,3],[-10,5],[-6,4],[-3,2],[-3,4],[-4,5],[-2,5],[-1,3],[0,4],[1,2],[2,7],[1,6],[0,4],[-19,38],[-2,3],[-9,8],[-11,8],[-6,3],[-8,2],[-10,2],[-5,1],[-6,3],[-2,3],[-1,3],[0,2],[1,3],[1,2],[3,4],[10,11],[2,2],[3,2],[10,4],[3,2],[2,3],[2,6],[0,4],[-2,3],[-2,2],[-4,1],[-14,2],[-4,1],[-20,9],[-2,2],[-10,12],[-2,2],[-6,4],[-13,6],[-4,3],[-4,5],[-6,9],[-3,6],[-1,5],[-1,23],[-4,7],[1,5],[0,3],[-1,3],[-3,3],[1,2],[1,3],[2,3],[-2,2],[-4,3],[-3,2],[-12,9]],[[7336,4597],[15,12],[3,8],[0,4],[-3,7],[-1,6],[0,11],[4,9],[3,11],[85,2],[16,5],[29,14],[10,8],[7,9],[9,24],[14,23],[5,11],[-1,14],[-15,24]],[[7516,4799],[-3,12],[5,15],[9,9],[10,7],[11,4],[131,-6],[15,2],[66,23],[7,5]],[[7767,4870],[7,-6],[15,-16],[10,-7],[4,-2],[25,-6],[19,-8],[8,-4],[9,-7],[9,-10],[34,-31],[6,-7],[-1,-3],[-5,-11],[-2,-8],[-3,-6],[-2,-3],[-4,-5],[-4,-5],[-3,-1],[-2,-1],[-2,-1],[-3,0],[-4,0],[-4,-1],[-3,-2],[0,-5],[2,-3],[3,-2],[90,-34],[9,-5],[4,-1],[4,0],[3,0],[3,2],[3,2],[4,5],[2,2],[3,1],[4,1],[15,3],[5,0],[6,-1],[8,-3],[12,-6]],[[8423,3992],[-13,-9],[-16,-21],[-7,-32],[2,-11],[12,-32],[15,-27],[-8,-10],[-14,-10],[-13,-20],[-40,-29],[-28,-41],[-14,-28],[-2,-26],[11,-25],[22,-22],[0,-5],[-11,-22],[25,-25],[39,-21],[28,-10],[105,-4],[27,-7],[13,-7],[15,-11],[13,-13],[5,-13],[7,-7],[51,-20],[39,-26],[15,-4],[21,-2],[13,-6],[7,-6]],[[8742,3440],[-23,-15],[-11,-11],[-5,-15],[-1,-13],[-2,-5],[-4,-5],[-8,-5],[-6,0],[-24,7],[-8,-1],[-7,-4],[-5,-8],[-2,-20],[-4,-8],[-10,-6],[-16,-3],[-104,9],[-8,-2],[-6,-3],[-7,-15],[7,-11],[24,-19],[7,-17],[10,-57],[-2,-16],[-7,-5],[-7,-1],[-87,12],[-25,-8]],[[8401,3195],[-10,-4],[-5,-6],[-4,-7],[-5,-5],[-38,-13],[-4,1],[-15,5],[-7,0],[-8,-5],[-5,-4],[-3,-5],[-3,-12],[-4,-57],[-10,-13],[-16,-2],[-17,8],[-39,34],[-12,5],[-48,7],[-42,-5],[-84,-36],[-42,-5],[-12,-5]],[[7968,3071],[-12,21],[-34,203],[-7,30],[-33,81],[-31,33],[-21,31],[-24,19],[-24,14],[-7,11],[-6,21],[-8,22],[-12,33],[-17,23],[-8,14],[-15,87],[0,-5],[-4,17],[-4,8],[-7,4],[-1,5],[10,33],[-6,20],[-24,29]],[[8635,2967],[6,7],[3,9],[-1,10],[-10,31],[-5,9],[-8,7],[-52,34],[-14,6],[-15,3],[-37,-2],[-11,5],[-19,16],[-17,7],[-6,6],[-4,6],[-2,7],[-2,28],[-6,5],[-18,8],[-5,4],[-11,22]],[[8742,3440],[3,-3],[11,-12],[18,-17],[26,-16],[30,-12],[29,-2],[-31,-59],[-6,-48],[0,-11],[2,-12],[6,-10],[15,-19],[3,-10],[-5,-27],[-15,-50],[2,-26],[20,-32],[3,-7],[6,-5],[28,-8],[12,-1],[-17,-9],[-8,-6],[-4,-6],[0,-34],[0,-5],[-28,-20],[-3,-4],[-6,-3],[-8,-8],[-12,-18],[-8,18],[-20,3],[-24,-6],[-17,-9],[-22,20],[-12,7],[-20,3],[-19,-2],[-36,-7]],[[8635,2967],[-45,-10],[-93,-34],[-33,-20],[-7,-7],[-8,-6],[-50,-21],[-21,-16],[-10,-11],[-9,-24],[-10,-14],[-10,-15],[-4,-21],[10,-5],[2,-3],[0,-16],[8,-65],[16,-58],[0,-22],[-3,-31]],[[8368,2568],[-31,-2],[-65,34],[-9,3],[-9,0],[-2,0],[-4,2],[-2,3],[-2,3],[0,4],[1,4],[5,7],[1,3],[-1,4],[-4,4],[-7,6]],[[8239,2643],[12,15],[-9,11],[-30,12],[-4,4],[-14,18],[-20,17],[-6,7],[-3,8],[1,9],[11,27],[0,15],[0,5],[2,4],[2,3],[4,3],[10,3],[4,5],[1,6],[0,6],[-1,6],[-6,10],[-8,7],[-21,9],[-32,21],[-12,3],[-7,-5],[-4,-10],[-5,-9],[-12,-1],[-4,2],[-7,7],[-4,2],[-11,1]],[[8066,2864],[1,3],[5,37],[-1,36],[-4,17],[-9,13],[-13,9],[-17,2],[-12,7],[-12,17],[-36,66]],[[8239,2643],[-17,10],[-13,2],[-11,-7],[-11,-15],[-5,-12],[-2,-13],[3,-12],[8,-10],[5,-4],[7,-4],[7,-6],[4,-8],[0,-10],[-5,-9],[-7,-6],[-9,-2],[-57,1],[-18,7],[-8,16],[-4,15],[-11,11],[-13,6],[-27,1],[-14,5],[-36,21],[-28,9],[-21,14],[-12,2],[-12,-5],[-20,-19],[-13,-5],[-15,-2],[-27,1],[-42,-14]],[[7815,2601],[2,10],[-1,29],[-14,24],[-24,22],[-6,3],[-12,5],[-5,4],[-7,9],[-1,4],[1,5],[1,9],[7,9],[15,7],[35,10],[54,28],[29,11],[38,2],[61,-5],[12,2],[14,6],[23,15],[18,24],[11,30]],[[8368,2568],[-4,-33],[-7,-11],[-33,-25],[-11,-14],[-9,-2],[-26,-17],[-27,-8],[-79,-34],[-29,-20],[-114,-116],[-15,-27],[-22,-92],[-13,-27],[-8,-11],[-9,-10],[-11,-8],[-12,-6],[-39,-7],[-13,-5],[-49,12],[-152,-6],[-22,4],[-22,9],[-20,11],[-16,11],[-17,19],[-9,18],[3,16],[17,13],[-22,27],[-7,15],[3,14],[12,16],[5,14],[-1,17],[-7,20],[-5,30],[15,18],[28,10],[86,22],[8,6],[2,5],[12,8],[3,5],[11,39],[63,106],[9,27]],[[6529,5133],[43,-14],[9,-1],[15,-1],[5,-3],[5,-4],[6,-10],[12,-12],[15,-1]],[[6639,5087],[-13,-10],[-21,-3],[-17,-8],[-4,-5],[-3,-7],[1,-4],[9,-4],[10,-6],[11,-12],[6,-11],[-10,-8],[-12,-3],[-10,-6],[-9,-7],[-8,-10],[-5,-10],[-3,-12],[0,-11],[6,-9],[12,-7],[4,-4],[11,-25],[-5,-11],[-11,-9],[-16,-3],[-37,11],[-15,-3],[-3,-9],[7,-10],[19,-15],[30,-8],[7,-5],[3,-10],[-11,-29],[6,-11],[15,-2],[29,6],[16,-1],[13,-6],[9,-11],[4,-16]],[[6654,4763],[-1,-15],[-13,-9],[-35,-3],[-133,20],[-13,-5],[-5,-6],[0,-6],[0,-7],[-1,-7],[-16,-19],[-23,-2],[-46,8],[-25,-2],[-7,2],[-5,5],[-3,13],[-2,4],[-4,1],[-5,1],[-4,0],[-4,-1],[-23,-15],[-60,-17],[-10,-6]],[[6216,4697],[-37,52],[-30,15],[-10,8],[-3,8],[-1,19],[-2,9],[-22,34],[-28,37],[-51,50],[-39,28]],[[5993,4957],[15,7],[8,3],[28,4],[4,2],[3,3],[-1,4],[1,4],[4,6],[4,4],[7,3],[6,2],[7,1],[7,4],[4,3],[3,3],[2,3],[1,2],[1,4],[0,10],[4,12]],[[6101,5041],[-3,20],[5,20],[0,6],[0,4],[-2,6],[-11,16],[1,4],[1,2],[3,2],[20,4],[6,3],[11,5],[2,1],[22,18],[6,3],[6,2],[8,1]],[[6176,5158],[19,-9],[3,-2],[3,-4],[2,-6],[3,-5],[23,-32],[5,-5],[3,-2],[4,-1],[18,-3],[23,-2],[9,1],[5,0],[3,2],[1,3],[-2,6],[0,4],[0,6],[-1,4],[-3,4],[-3,3],[-8,5],[-5,4],[-2,3],[-1,3],[0,3],[1,3],[2,3],[4,5],[10,8],[2,2],[3,6],[5,4],[4,7],[3,3],[8,-2],[28,-2],[26,3],[24,0],[14,-4],[23,-4],[4,-1],[3,-2],[17,-10],[28,-11],[34,-10],[11,-3]],[[6422,4361],[-7,-2],[-8,0],[-24,-6],[-11,3],[3,15],[9,2],[8,0],[32,-3],[4,-3],[-6,-6]],[[6173,4503],[-12,-8],[-8,3],[-12,-1],[-14,-4],[-11,-5],[-7,5],[-19,7],[-9,6],[6,17],[5,8],[7,4],[-3,4],[-3,8],[17,0],[53,-15],[16,-9],[-2,-5],[-1,-5],[3,-7],[-6,-3]],[[6234,4549],[4,-4],[-5,0],[-2,0],[-5,-3],[4,-5],[-5,-1],[-6,-2],[3,-9],[-5,2],[-4,7],[-1,0],[-1,-3],[-2,0],[2,6],[2,7],[-2,3],[3,2],[5,4],[4,1],[3,-3],[8,-2]],[[6716,4620],[-21,0],[-9,-4],[-1,-10],[2,-4],[8,-8],[3,-4],[0,-9],[-4,-6],[-7,-3],[-15,-3],[-23,-9],[-8,-7],[-4,-5],[-1,-6],[0,-6],[3,-6],[4,-5],[6,-3],[20,-1],[7,-2],[5,-2],[5,-4],[7,-9],[4,-11],[0,-11],[-6,-10],[-15,-11],[-3,-12],[-4,-3],[-5,0],[-33,5],[-10,-1],[-9,-4],[-7,-7],[-2,-11]],[[6603,4428],[-41,-8],[-17,-11],[-38,-16],[-12,-11],[-10,12],[-2,18],[8,16],[19,7],[17,1],[6,3],[9,6],[6,10],[33,26],[27,8],[3,14],[-5,16],[-12,12],[-15,10],[-18,-4],[-13,5],[-9,4],[-10,9],[-13,7],[-15,15],[-31,27],[-15,9],[-16,1],[-23,-2],[-20,-6],[-10,-9],[-7,-17],[-18,0],[-14,13],[-26,2],[-20,10],[-13,4],[-11,-3],[-5,-7],[1,-11],[3,-11],[1,-12],[-6,3],[-23,2],[-6,6],[10,36],[-7,31],[-19,41],[-10,13]],[[6654,4763],[8,4],[8,0],[18,-7]],[[6688,4760],[6,-19],[3,-38],[14,-11],[47,-8],[7,-4],[4,-7],[0,-7],[-6,-5],[-6,-1],[-50,8],[-13,-3],[-4,-12],[3,-9],[23,-24]],[[6795,4735],[-10,-7],[-10,4],[-3,10],[3,15],[6,13],[7,7],[14,-20],[-1,-10],[-6,-12]],[[7168,4989],[-2,-5],[-10,-9],[-11,-6],[-11,-3],[-11,2],[-20,11],[-11,2],[-18,-4],[-6,0],[-19,8],[-9,1],[-6,-5],[-1,-22],[9,-16],[4,-14],[-28,-26],[-1,-8],[4,-8],[22,-13],[4,-6],[3,-7],[0,-8],[-3,-6],[-5,-3],[-133,-59],[-12,-2],[-6,1],[-3,3],[-5,9],[-4,4],[-4,3],[-6,1],[-5,-1],[-5,-5],[-1,-7],[0,-8],[-1,-7],[-8,-9],[-9,-3],[-10,2],[-9,7],[-4,6],[-5,15],[-6,8],[-5,0],[-51,-9],[-12,1],[-15,4],[-12,-2],[-13,-10],[-9,-14],[-1,-12]],[[6639,5087],[10,-1],[25,2],[5,-2],[3,-2],[6,-7],[2,-2],[3,-2],[4,-1],[4,-1],[6,1],[6,2],[38,19],[7,5],[3,2],[6,0],[56,1],[6,2],[6,2],[10,6],[4,4],[3,3],[3,10],[2,3],[2,3],[3,1],[4,1],[7,-2],[4,-2],[3,-2],[5,-4],[6,-3],[7,-3],[4,-1],[21,4],[24,10],[32,7],[7,1],[8,3],[49,24]],[[7043,5168],[4,-3],[22,-9],[16,-4],[5,-3],[10,-12],[4,-4],[4,-3],[18,-7],[3,-4],[2,-6],[2,-19],[0,-5],[-2,-3],[-3,-2],[-7,-2],[-2,-2],[-2,-3],[0,-3],[-2,-2],[-2,-2],[-3,-2],[-3,-2],[-2,-2],[-2,-3],[0,-4],[0,-5],[4,-11],[3,-4],[4,-4],[10,-4],[12,-3],[9,-2],[10,-7],[13,-28]],[[7336,4597],[-19,15],[-12,1],[-7,-3],[-13,-15],[-2,-5],[-1,-11],[-4,-4],[-15,-4],[-4,-2],[-9,-20],[-1,-20],[-3,-16],[-18,-6],[-36,-4],[-13,7],[-11,21],[-10,13],[-17,6],[-106,12],[-56,22],[-9,1],[-33,-6],[-89,5],[-18,5],[-6,4],[1,4],[2,5],[0,7],[-5,6],[-8,4],[-10,2],[-8,1],[-9,-4],[-11,-14],[-7,-4],[-14,2],[-39,18]],[[7168,4989],[9,0],[4,1],[3,1],[3,2],[7,7],[3,1],[7,-2],[28,-12],[17,-5],[4,-3],[6,-4],[8,-10],[3,-5],[2,-3],[-2,-2],[-2,-2],[-3,-1],[-11,-3],[-2,-2],[2,-3],[6,-7],[0,-4],[-1,-3],[-2,-2],[-2,-2],[-8,-6],[-6,-4],[-23,-21],[-2,-3],[-1,-3],[1,-2],[1,-3],[5,-3],[39,-19],[3,-2],[5,-4],[9,-13],[4,-2],[6,-1],[80,-4],[8,1],[5,4],[3,2],[4,0],[5,-2],[10,-7],[26,-14],[87,-21]],[[7590,3930],[-14,9],[-5,7],[0,11],[-12,-4],[-63,4],[-18,-9],[-15,-18],[-30,-15],[-25,-26],[-17,-5],[-41,5],[-15,4],[-24,26],[-10,2],[-8,-3],[-8,-3],[-9,-1],[-10,1],[0,6],[15,10],[-13,22],[-25,23],[-20,10],[-16,6],[-53,44],[-12,4],[-14,-1],[-26,-6],[-15,2],[-11,6],[-10,17],[-16,13],[-23,8],[-8,4],[-8,6],[-16,-3],[-13,9],[-9,3],[-4,15],[21,23],[6,18],[-6,15],[0,8],[9,4],[9,2],[9,4],[7,6],[19,6],[4,9],[-1,24],[-19,30],[-73,122],[-23,29],[-22,22],[-22,18],[-23,14],[-25,6],[-27,-8],[-25,-16],[-10,-2],[-44,2],[-10,-3],[-36,-24],[-22,-3],[-24,5],[-25,11],[-13,-7]],[[7168,5555],[-2,-3],[-5,-33],[0,-5],[-1,-7],[-2,-5],[-11,-16],[-8,-9],[-2,-4],[-1,-6],[0,-9],[1,-6],[4,-13],[-1,-4],[-2,-6],[-4,-9],[-1,-10],[1,-5],[1,-3],[1,-4],[-1,-11],[2,-8],[3,-5],[2,-3],[2,-2],[4,-2],[3,-1],[4,-1],[20,-2],[4,-1],[1,-2],[-1,-3],[-10,-7],[-5,-2],[-7,-2],[-15,-3],[-4,-2],[-3,-2],[-8,-8],[-9,-6],[-11,-10],[-3,-2],[-4,-2],[-7,-1],[-5,-3],[-5,-3],[-7,-9],[-10,-7],[-4,-2],[-4,0],[-4,0],[-38,13],[-4,0],[-4,0],[-3,-1],[-4,-2],[-5,-4],[-2,-2],[-2,-3],[-2,-5],[0,-7],[1,-12],[5,-26],[0,-3],[-1,-8],[-2,-10],[-1,-4],[0,-4],[1,-3],[9,-8],[41,-29]],[[6529,5133],[-3,15],[4,18],[7,16],[10,10],[17,9],[4,0],[8,-1],[4,0],[13,7],[32,47],[4,10],[-1,9],[-10,7],[-55,28],[2,13],[11,6],[28,6],[16,5],[15,9],[8,13],[-2,19],[-9,7],[-12,4],[-8,5],[7,26]],[[6619,5421],[21,9],[4,3],[4,4],[3,5],[3,6],[22,21],[16,21],[27,28],[21,17],[9,9],[3,5],[0,4],[-2,7],[0,3],[1,6],[3,2],[11,4],[8,4],[60,46],[3,5],[0,3],[-1,7],[1,6],[1,4],[4,8],[5,6],[2,4],[1,2],[-1,9],[1,2]],[[6849,5681],[14,-2],[16,-8],[30,-19],[30,-10],[68,-10],[35,-9],[11,-8],[23,-23],[9,-5],[15,-4],[35,-19],[16,-7],[17,-2]],[[6176,5158],[17,13],[0,3],[1,4],[-2,3],[-2,4],[2,2],[21,13],[3,4],[0,4],[-1,3],[-1,4],[1,14],[0,5],[-2,3],[-2,2],[-5,2],[-1,5],[-2,9],[0,29],[0,7],[-1,3],[-11,14],[-3,6],[-2,6],[-1,3],[-2,2],[-2,2],[-9,6],[-5,4],[-5,8]],[[6162,5345],[16,4],[25,-5],[6,1],[5,2],[5,3],[15,6],[3,2],[16,17],[8,5],[5,2],[5,0],[10,-5],[6,-1],[4,1],[12,10],[21,11],[13,5],[18,4],[6,3],[4,2],[0,2],[-1,2],[-2,2],[-3,2],[-9,5],[-2,2],[-4,5],[-2,2],[-2,7],[-3,4],[-3,4],[-6,5],[-1,4],[0,4],[6,10],[5,4],[5,2],[20,-2],[6,0],[17,13],[2,2],[3,3],[8,13],[1,1]],[[6400,5508],[1,0],[35,23],[4,1],[5,1],[2,-2],[1,-1],[2,-2],[5,-3],[15,-5],[3,-2],[2,-2],[2,-2],[6,-8],[2,-2],[3,-3],[4,-2],[8,-4],[5,0],[4,1],[5,6],[6,3],[4,0],[3,-2],[3,-2],[3,-3],[29,-16],[5,-4],[3,-2],[1,-2],[1,-3],[1,-4],[-2,-10],[0,-3],[1,-3],[1,-3],[4,-5],[5,-4],[4,-5],[1,-3],[1,-3],[-1,-3],[-3,-6],[-1,-3],[1,-3],[4,-1],[4,0],[13,3],[14,6]],[[9055,4660],[-39,-23],[-16,-16],[-8,-13],[-2,-7],[0,-8],[3,-4],[5,-3],[38,-11],[13,0],[5,-2],[5,-5],[1,-9],[-1,-10],[-4,-8],[-7,-4],[-8,-2],[-18,0]],[[9022,4535],[-11,-6],[-13,1],[-34,15],[-22,4],[-41,-1],[-37,-14],[-5,-6],[-4,-16],[-3,-7],[-5,-4],[-17,0],[-51,10],[-11,-1],[-12,-3],[-10,0],[-7,9],[0,17],[-2,8],[-7,6],[-7,1],[-9,-1],[-25,-10],[-8,-6],[-7,-9],[-4,-18],[-3,-6],[-6,-4],[-9,0],[-5,2],[-14,10],[-15,5],[-8,1],[-8,-2],[-5,-3],[-20,-18],[-4,-2],[-5,1],[-5,2],[-17,31],[-45,-15],[-14,0]],[[8051,4675],[10,15],[38,38],[7,18],[5,36],[10,17],[37,43],[15,7],[3,5],[-1,11],[-6,13],[-1,6],[2,6],[4,2],[16,2],[8,4],[19,16],[7,4],[9,1],[16,-6],[29,-24],[16,-6],[8,-1],[4,1],[4,2],[4,6],[3,7],[-1,4],[-1,4],[0,3],[24,33],[4,13]],[[8343,4955],[9,-7],[33,-18],[198,-52],[18,-12],[6,0],[0,7],[5,0],[17,-14],[145,-37],[122,-52],[61,-35],[29,-22],[32,-37],[11,-5],[14,-3],[12,-8]],[[7863,5143],[-7,-2],[-15,-12],[-5,-7],[18,-7],[60,-47],[0,-3],[-34,-12],[-9,-1],[1,-26],[3,-10],[22,-41],[6,-20],[-60,-46],[-21,-8],[-55,-31]],[[7168,5555],[18,-3],[98,0],[99,-17],[38,-1],[139,18],[137,-6],[212,20],[70,-14],[1,-1],[24,-6],[17,-23],[16,0],[-3,-14],[6,-16],[8,-32],[0,-11],[0,-15],[-7,-10],[-15,-14],[-17,-12],[-16,-6],[-17,-4],[-14,-10],[-23,-21],[-30,-19],[-85,-34],[-22,-22],[-7,-33],[4,-35],[13,-29],[19,-20],[23,-17],[9,-5]],[[7460,5707],[-6,-5],[-6,2],[0,8],[5,4],[2,2],[3,4],[3,-1],[3,-7],[-4,-7]],[[7863,5143],[42,-22],[53,-13],[13,-8],[11,-9],[157,-56],[134,-57],[50,-10],[15,-10],[5,-3]],[[9648,4336],[-13,-15],[-13,-8],[-32,-10],[-73,-41],[-83,-19],[-20,-11],[-18,-15]],[[9396,4217],[-15,12],[-56,11],[-48,37],[-19,9],[-18,4],[-10,0],[-8,-3],[-12,-17],[-8,-5],[-13,1],[-9,6],[-20,26],[-23,8],[-4,4],[-28,48],[-3,10],[2,12],[12,21],[0,12],[-3,7],[-4,3],[-11,4],[-10,7],[-6,10],[-11,37],[-6,10],[-9,8],[-27,19],[-6,8],[-1,9]],[[9055,4660],[18,-11],[52,-44],[13,-5],[17,-3],[31,-16],[72,-15],[9,-4],[87,-28],[80,-46],[65,-10],[29,-10],[-1,-21],[10,0],[21,6],[13,-2],[3,-6],[0,-8],[4,-8],[20,-15],[3,-5],[-5,-39],[52,-34]],[[9367,4143],[4,18],[20,35],[5,21]],[[9648,4336],[17,-11],[77,-35],[17,-3],[6,-3],[17,-23],[10,-8],[27,-19],[22,-28],[12,-13],[15,-6],[8,-5],[56,-61],[52,-100],[4,-5],[4,-4],[6,-2],[-4,-10],[2,-7],[3,-5],[-1,-8],[-7,-9],[-13,-8],[-7,-26],[-11,-10],[-31,-18],[-19,-38],[-3,-9],[-3,-18],[-8,-19],[-2,-8],[6,-22],[1,-10],[-12,-46],[2,-7],[-4,-3],[-9,-12],[-4,-3],[-18,1],[-7,2],[-7,3],[-41,26],[-13,4],[-35,0],[-11,1],[-21,11],[-20,7],[-27,20],[-30,17],[-11,3],[-8,4],[-54,65],[-10,7],[0,7],[13,0],[8,6],[1,10],[-5,13],[-9,7],[-22,6],[-10,5],[30,15],[7,18],[-12,21],[-25,22],[-22,15],[-12,12],[-6,12],[0,17],[-2,14],[-5,12],[-9,7],[11,0],[0,6],[-42,26],[-13,4],[-70,3]],[[9367,4143],[-212,8],[-15,4],[-45,20],[-8,0],[-18,-1],[-8,1],[-6,3],[-15,12],[-5,3],[-15,2],[-46,22],[-47,13],[-23,10],[-10,12],[19,7],[16,11],[5,14],[-17,15],[16,5],[41,-6],[17,7],[6,14],[-16,1],[-36,-9],[2,2],[4,4],[-18,6],[-15,-5],[-16,-9],[-17,-4],[-7,3],[-4,7],[-4,8],[-5,6],[-9,2],[-18,1],[-8,2],[-63,3],[-62,-23],[-53,-41],[-41,-46]],[[4513,1154],[6,-3],[5,1],[5,9],[32,-25],[12,-14],[1,-20],[-19,-22],[-29,3],[-29,17],[-20,21],[-4,5],[-6,15],[-3,14],[10,6],[4,1],[6,4],[5,1],[5,-2],[8,-8],[4,-2],[7,-1]],[[4799,2114],[13,-7],[15,-5],[12,-1],[-9,-10],[-13,-1],[-14,5],[-10,6],[-12,-6],[-10,2],[-8,7],[-4,9],[11,-1],[9,2],[7,4],[7,1],[6,-5]],[[4595,2131],[1,-9],[-12,1],[-15,8],[-8,11],[-6,10],[5,5],[14,1],[10,-5],[6,-16],[5,-6]],[[5349,2203],[6,-18],[15,-22],[39,-38],[-5,-22],[-19,-18],[-23,-7],[-45,4],[-3,-18],[13,-7],[-3,-13],[0,-14],[5,-11],[13,-6],[53,-9],[42,6],[4,-7],[-6,-16],[10,-11],[-2,-9],[-51,-26]],[[5392,1941],[-12,2],[-1,0],[-24,-6],[-35,-17],[-30,-23],[-10,-23],[2,-10],[14,-4],[-7,-37],[-9,-26]],[[5280,1797],[-27,3],[-68,-2],[-70,-10],[-32,2],[-20,15],[-34,48],[-15,12],[-12,5],[-33,0],[-15,7],[-14,14],[-12,18],[-8,14],[-4,13],[-1,11],[-3,11],[-7,10],[-9,10],[-8,12],[0,11],[15,5],[1,-3],[12,6],[4,3],[-2,3],[6,24],[2,0],[4,16],[1,8],[-1,4],[-8,9],[-2,8],[-1,6],[0,1],[2,2],[20,32],[5,23],[6,14],[1,13],[-10,8],[26,9],[22,20],[22,15],[27,-8],[25,15],[11,10],[5,14],[4,7],[12,0],[13,-3],[11,-1],[17,13],[-1,21],[-3,21],[10,15],[5,-10],[9,1],[10,-1],[4,-16],[21,-39],[23,-34],[9,-7],[24,-10],[10,-6],[0,-7],[27,-13],[36,4],[27,10]],[[5513,1835],[-13,-3],[-9,1],[-4,12],[1,8],[7,3],[10,0],[12,-6],[2,-8],[-6,-7]],[[6359,2187],[49,-67],[32,-23],[1,-10],[-7,-25],[0,-8],[9,-27]],[[6443,2027],[-12,-10],[-5,-17],[1,-18],[9,-12],[11,-7],[6,-7],[0,-9],[-5,-12],[-18,-26],[-21,-12],[-23,-8],[-23,-4],[-9,-3],[-9,-10],[-8,-22],[-5,-9],[-11,-6]],[[6321,1835],[-6,5],[-20,7],[-16,10],[-6,1],[-15,-1],[-10,-4],[-9,-8],[-7,-13],[-10,-10],[-17,-11],[-18,-5],[-16,2],[-42,18],[-6,10],[-3,26],[-4,12],[-8,11],[-11,9],[-26,8],[-12,9],[-9,19],[-7,5],[-11,0],[-14,-7],[-35,-36]],[[5983,1892],[-35,12],[-9,1],[-8,-7],[-10,-22],[-12,-8],[-37,-10],[-130,3],[-12,-8],[-10,-10],[-14,-8],[-13,-5],[-4,-17],[19,-18],[-4,-12],[-36,-15],[-9,5],[-7,12],[-10,32],[19,39],[1,13],[-10,6],[-8,-3],[-16,-12],[-8,-4],[-21,1],[-6,-2],[-3,-3],[-4,-9],[-3,-4],[-6,-1],[-6,1],[-11,6],[-10,12],[-12,27],[-12,9],[-45,12],[-49,-2],[-17,8],[-19,26],[-4,4]],[[5349,2203],[43,16],[28,18],[7,7],[2,3],[-2,5],[-1,11],[-2,8],[-8,8],[-1,8],[29,21],[-5,8],[5,7],[9,6],[10,2],[8,-1],[29,-10],[19,-3],[24,0],[19,7],[7,19],[13,-3],[10,2],[9,4],[17,4],[11,4],[7,1],[4,-2],[1,-6],[1,-5],[2,-4],[32,-18],[5,-6],[1,-28],[3,-8],[12,-24],[103,6],[23,-14],[-2,-15],[2,-8],[5,-10],[9,-6],[24,-8],[30,-21],[24,-12],[39,-7],[12,-4],[-3,-3],[-1,-1],[-2,-3],[19,1],[53,-7],[19,4],[37,16],[35,7],[11,7],[11,8],[11,6],[58,8],[11,10],[35,-17],[18,-5],[19,-3],[12,1],[26,6],[24,-3]],[[6216,1887],[8,-2],[27,1],[13,3],[11,6],[7,13],[-5,9],[-12,6],[-15,2],[-8,-2],[-8,-4],[-6,-7],[-11,-14],[-2,-6],[1,-5]],[[5517,2763],[-10,-2],[-9,3],[-1,7],[4,6],[10,6],[14,1],[8,-6],[1,-2],[-17,-13]],[[7265,1999],[-61,57],[-36,21],[-39,5],[-64,-11],[-35,1],[-21,17],[-7,26],[-4,7],[-10,6],[-11,0],[-10,-4],[-26,-17],[-6,0],[-3,1],[-2,3],[-3,7],[-5,8],[-8,6],[-9,1],[-11,-13],[-6,-1],[-18,4],[-6,-1],[-6,-3],[-5,-4],[-4,-5],[-2,-5],[-1,-6],[1,-7],[0,-9],[-5,-4],[-8,-3],[-7,-4],[-2,-5],[-2,-4],[-2,-10],[0,-6],[2,-4],[4,-3],[5,0],[12,8],[5,1],[9,-2],[9,-6],[8,-9],[4,-9],[0,-9],[-3,-8],[-6,-6],[-8,1],[-15,8],[-8,2],[-8,-3]],[[6831,2008],[-25,-4],[-28,-11],[-6,-1],[-58,8],[-6,3],[-26,19],[-4,4],[1,7],[8,10],[3,5],[-1,6],[-4,3],[-6,1],[-7,-1],[-15,-5],[-18,-10],[-8,-6],[-5,-7],[-1,-6],[-1,-15],[-2,-6],[-4,-5],[-5,-3],[-6,-1],[-6,1],[-6,2],[-4,4],[-2,6],[-2,14],[-3,10],[-8,8],[-14,6],[-11,1],[-87,-21],[-21,3]],[[6359,2187],[78,-9],[49,3],[45,9],[39,18],[27,-11],[40,6],[103,32],[28,16],[24,18],[32,32],[9,3],[27,-2],[18,1],[63,13],[12,6],[8,3],[8,2],[24,-2],[8,-3],[15,-16],[6,-4],[10,-1],[21,-5],[27,1],[8,-1],[4,-3],[8,-11],[5,-4],[16,-2],[15,4],[14,7],[46,13],[22,23],[31,50],[-2,7],[-2,1],[1,3],[3,7],[-3,2],[5,0],[3,-9],[-5,-20],[4,-12],[10,-6],[14,-2],[15,-1],[25,4],[66,19],[18,10],[10,7],[33,13],[34,26],[13,4],[25,-2],[48,-17],[30,-5],[-3,-7],[-5,-4],[-6,-1],[-9,1],[-34,-19],[-12,-11],[-5,-11],[-3,-13],[13,1],[-41,-55],[-22,-45],[-90,-94],[-76,-96],[-16,-27],[-14,-18],[-6,-4]],[[7046,2485],[-10,-6],[-19,15],[-13,13],[-3,13],[12,18],[6,0],[0,-12],[13,-5],[10,-8],[7,-11],[4,-11],[-7,-6]],[[7019,2556],[-15,-2],[-12,6],[-11,9],[-11,5],[-7,6],[1,15],[7,14],[13,6],[28,0],[7,-5],[-6,-12],[5,-4],[7,-6],[5,-3],[0,-5],[-23,0],[5,-10],[3,-4],[4,-4],[0,-6]],[[6511,2630],[-12,-4],[-3,11],[12,3],[3,-10]],[[6932,2638],[-1,-8],[-32,11],[-25,17],[18,10],[30,1],[13,-3],[9,-10],[-4,-4],[-3,-4],[-5,-10]],[[6699,2646],[-10,-1],[-18,4],[-7,11],[-1,11],[3,1],[15,-3],[10,-7],[3,-9],[5,-4],[0,-3]],[[7236,2835],[-6,-3],[-10,1],[-16,12],[0,4],[6,4],[8,3],[4,4],[3,4],[6,1],[7,-1],[6,-2],[4,-4],[-2,-7],[-4,-5],[-2,-6],[-4,-5]],[[6831,2008],[-2,-4],[-1,-4],[0,-4],[1,-8],[0,-2],[-1,-3],[-15,-7],[-4,-5],[2,-7],[9,-10],[1,-6],[-12,-15],[-2,-4],[-2,-8],[0,-9],[3,-8],[4,-7],[10,-4],[12,2],[43,22],[1,-15],[-6,-30],[7,-12],[15,-7],[15,-36],[-7,-8],[-20,-10],[-7,-7],[-1,-6],[4,-13],[0,-7],[-4,-12],[-8,-12],[-10,-6],[-11,6],[-13,14],[-22,15],[-23,11],[-17,-1],[-19,-10],[-18,-3],[-69,3],[-13,-9],[-8,-12],[-6,-14],[-2,-15],[1,-10],[4,-9],[7,-7],[9,-5],[9,-1],[29,3],[27,-10],[13,-9],[2,-7],[-8,-4],[-17,-5],[-8,-4],[-6,-5],[-1,-5],[5,-12],[-1,-8],[-5,-5],[-8,-3],[-37,-1],[-9,-3],[-5,-5],[-1,-4],[1,-4],[3,-6],[3,-14],[-8,-7],[-13,1],[-13,8],[-16,17],[-8,3],[-9,-5],[-3,-8],[4,-9],[14,-13],[-20,-9],[-22,0],[-44,11]],[[6504,1567],[-21,-3],[-7,1],[-44,31],[-4,3],[-16,0],[-61,-16],[-7,0],[-27,14],[-22,-2],[-6,1],[-6,5],[-12,25],[-5,16],[0,16],[7,15],[54,47],[4,6],[1,7],[-2,5],[-9,7],[-3,4],[-3,7],[1,3],[3,3],[4,6],[1,7],[-2,15],[1,8],[4,5],[10,3],[2,6],[1,9],[-3,7],[-5,4],[-11,3]],[[7265,1999],[-15,-10],[-24,-30],[-6,-12],[2,-9],[9,-16],[1,-10],[-4,-9],[-11,-9],[-3,-9],[-2,-17],[-10,-26],[-5,-18],[-12,-32],[-41,-39],[-16,-24],[-4,-15],[-2,-15],[2,-85],[1,-2]],[[7125,1612],[-29,5],[-22,11],[-7,1],[-19,-6],[-8,-1],[-9,3],[-29,25],[-8,4],[-11,3],[-9,1],[-10,-2],[-42,-20],[-7,-8],[-11,-17],[-29,-13],[-6,-8],[5,-9],[12,-5],[9,1],[9,4],[12,2],[20,-9],[2,-18],[-11,-20],[-19,-10],[-13,-3],[-14,-6],[-12,-8],[-9,-10],[0,-9],[7,-8],[18,-9],[11,-2],[5,1],[15,5],[10,0],[7,-4],[3,-12],[-2,-8],[-15,-17],[-3,-7],[-2,-8],[-2,-7],[-7,-4],[-8,-1],[-8,2],[-15,6]],[[6874,1417],[-6,1],[-6,1],[-7,-1],[-4,-4],[-2,-7],[1,-7],[-1,-6],[-6,-5],[-6,-1],[-6,1],[-6,3],[-12,14],[-6,4],[-8,-1],[-64,-33],[-30,-10],[-6,-4],[-12,-11],[-5,-2],[-10,2],[-18,11],[-10,2],[-41,-15],[-11,-2],[-11,1]],[[6581,1348],[-2,8],[-7,14],[-1,8],[3,7],[7,5],[8,3],[7,5],[8,20],[-10,19],[-19,14],[-41,10],[-6,13],[1,34],[-5,17],[-19,23],[-1,19]],[[7125,1612],[3,-13],[6,-12],[6,-7],[58,-27],[32,-5],[16,-8],[13,-15],[7,-21],[-13,11],[-8,-4],[-6,-10],[-7,-8],[1,14],[-5,7],[-8,0],[-11,-4],[5,-11],[-13,-17],[9,-27],[19,-18],[14,8],[12,-5],[0,-6],[-16,-2],[3,-13],[12,-14],[15,-7],[21,-2],[12,-6],[3,-13],[-4,-20],[-12,5],[-5,-7],[1,-11],[7,-5],[17,2],[8,-4],[7,-10],[2,-14],[-6,-3],[-9,3],[-5,5],[-4,-1],[-30,-14],[6,-6],[-8,-3],[-1,-2],[3,-6],[0,-7],[-20,0],[-15,-7],[-12,-7],[-13,-3],[-18,-8],[-14,-17],[-43,-89],[0,-10],[-11,-8],[4,-17],[15,-28],[15,-52],[0,-10],[-17,-14],[-17,-4],[-17,4],[-16,10],[-12,14],[-6,6],[-10,4],[-12,3],[-6,0]],[[7047,1046],[-4,55],[-8,15],[-13,10],[-90,25],[-9,4],[-7,7],[-2,9],[9,13],[19,0],[36,-10],[8,1],[6,3],[2,6],[-1,8],[-6,9],[-31,12],[-27,18],[-9,11],[-6,12],[-3,13],[-1,14],[10,-1],[49,-37],[7,-2],[7,3],[0,6],[-18,45],[-7,7],[-35,23],[-14,14],[-10,19],[-6,17],[-17,32],[-2,10]],[[7047,1046],[-2,0],[-3,-5],[-10,-7],[-21,8],[-32,19],[-31,9],[-29,-3],[-56,-24],[-4,8],[-2,2],[-11,-4],[-13,12],[-51,5],[-10,16],[-11,8],[-49,16],[-15,8],[-14,-2],[-66,13],[-10,9],[-68,121],[-21,24],[-29,24]],[[6489,1303],[14,2],[78,43]],[[6489,1303],[-47,38],[-59,32],[-69,26],[-32,5],[-41,-3]],[[6241,1401],[-4,19],[-7,14],[-25,24],[-5,7],[-1,8],[1,8],[22,40],[3,11],[-1,10],[-6,9],[-15,9],[-5,4],[-15,18],[-6,5],[-7,2],[-16,-2],[-7,1],[-10,4],[-28,21],[-1,6],[8,7],[14,9],[0,4],[-11,10],[-4,3],[-5,1],[-18,-2],[-9,20],[-3,5],[-7,3],[-85,-3],[-12,1],[-14,6],[-17,11],[-8,3],[-23,-1],[-5,2],[-2,7],[2,8],[5,6],[7,4],[7,2],[7,1],[3,1],[3,2],[3,4],[4,14],[1,19],[-19,31],[2,13],[9,5],[7,-2],[8,-5],[8,-3],[20,2],[60,23],[10,7],[3,9],[-3,11],[-6,10],[-11,11],[-13,7],[-13,3],[-15,0],[-13,4]],[[5051,3],[-9,-3],[-6,2],[-4,2],[-4,0],[-32,12],[-17,4],[-8,4],[7,4],[18,0],[9,-2],[39,-4],[7,-1],[2,-1],[-2,-2],[0,-2],[2,-5],[-2,-8]],[[5262,313],[-13,0],[-5,3],[-5,6],[1,5],[6,2],[5,1],[6,0],[6,-5],[2,-9],[-3,-3]],[[6241,1401],[-53,-3],[-8,-2],[-15,-8],[-9,-3],[-37,5],[-51,33],[-32,11],[-37,6],[-30,10],[-27,16],[-71,58],[-25,15],[-29,7],[-38,5],[-30,9],[-27,14],[-41,27],[-36,18],[-15,12],[-8,4],[-11,3],[-9,4],[-21,33],[-5,4],[-18,8],[-10,11],[-6,5],[-10,2],[-5,3],[-8,12],[-4,3],[-103,11],[-12,-5],[-9,-1],[-8,4],[-6,8],[-5,17],[-3,7],[-22,19],[-26,10],[-41,4]],[[6335,6072],[58,-52],[31,-21]],[[6424,5999],[-24,-25],[-7,6],[-12,6],[-13,2],[-11,-1],[-8,-5],[-12,-26],[-5,-6],[-12,-10],[-5,-6],[-2,-7],[-3,-15],[-4,-6],[-11,-4],[-12,-1],[-10,-5],[-3,-11],[43,-71],[-9,-18],[-9,-3],[-4,-2],[-4,-4],[-2,-9],[2,-6],[11,-11],[5,-11],[1,-39],[-2,-8],[-16,-8],[-6,-6]],[[6280,5689],[-56,-10],[-15,0],[-11,7],[-24,30],[-35,17],[-9,10],[-15,12],[-20,-4],[-40,-16],[-11,2],[-8,7],[-3,10],[3,11],[4,4],[3,1],[3,3],[2,5],[-1,5],[-4,7],[-2,4],[-1,5],[5,18],[5,10],[6,1],[6,-2],[5,0],[10,20],[-8,22],[-13,22],[-7,21],[0,18],[-3,8],[-27,33],[-8,6]],[[6011,5976],[7,16],[31,40],[12,9],[14,-1],[14,-5],[11,-1],[10,11],[13,8],[34,-7],[10,10],[2,12],[3,2],[31,10],[50,-7],[7,3],[7,6],[7,3],[21,-12],[13,-3],[27,2]],[[6011,5976],[-10,10],[-12,6],[-130,12],[-27,-8],[-9,-1],[-8,2],[-6,5],[-7,12],[-4,6],[-8,5],[-36,14],[-19,14],[-16,18],[-17,39],[-18,25]],[[5684,6135],[9,23],[0,5],[0,7],[-3,2],[-3,1],[-3,2],[-4,1],[-9,2],[-4,1],[-3,1],[-3,3],[-4,3],[-4,6],[-2,5],[-1,3],[2,7]],[[5652,6207],[62,7],[7,2],[8,3],[2,8],[1,4],[3,5],[6,7],[7,3],[8,2],[14,3],[6,2],[4,3],[1,3],[1,3],[2,8],[1,3],[1,3],[2,2],[7,7],[3,3],[9,14],[7,8],[5,4],[5,1],[4,-1],[3,-2],[5,-4],[3,-1],[4,-1],[5,0],[5,1],[23,6],[6,1],[4,-1],[7,-2],[5,0],[6,-1],[23,4],[14,5],[6,3],[2,3],[2,2],[2,3],[0,3],[1,8],[2,4],[3,4],[8,7],[5,2],[5,2],[13,-1],[17,4],[47,16],[60,11],[15,2]],[[6129,6392],[32,-90],[31,-58],[17,-28],[52,-63],[5,-13],[5,-10],[64,-58]],[[6280,5689],[14,-15],[-3,-17],[-9,-20],[-6,-18],[12,-31],[2,-17],[-13,-9],[5,-10],[10,-22],[5,-8],[9,-3],[65,6],[13,-5],[16,-12]],[[6162,5345],[-45,31],[-16,6],[-12,0],[-13,3],[-10,4],[-17,9],[-8,3],[-6,1],[-3,-2],[-3,-2],[-4,-1],[-7,-1],[-12,2],[-8,2],[-5,3],[-2,2],[-2,3],[-3,5],[-5,11],[-2,4],[-3,4],[-7,5],[-50,13],[-8,1],[-3,-1],[-3,-2],[-6,-3],[-14,-13],[-13,-9],[-18,-7],[-13,-2],[-15,0],[-7,1],[-6,1],[-3,2],[-3,2],[-3,2],[-1,3],[-2,2],[-1,3],[-4,4],[-6,4],[-81,31],[-5,0],[-4,0],[-4,0],[-11,-2],[-8,-1],[-5,0],[-4,2],[-1,3],[-1,3],[0,3],[-1,4],[2,22],[1,4],[2,3],[7,10],[1,3],[1,4],[0,4],[-1,4],[-4,4],[-9,5],[-10,3],[-9,4],[-11,12],[-5,3],[-4,2],[-7,0]],[[5619,5568],[-2,1],[-13,-1],[-154,67],[-4,-1],[-2,-2],[-6,-2],[-9,1],[-19,3],[-11,4],[-6,4],[-3,2],[-1,3],[-5,11],[-1,3],[-4,39],[0,2],[1,6],[14,6]],[[5394,5714],[18,8],[18,14],[4,4],[2,2],[1,3],[3,9],[4,7],[4,2],[4,1],[36,-13],[26,-5],[14,-6],[15,-9],[5,-1],[6,-2],[11,-3],[6,0],[5,1],[7,5],[5,3],[3,-1],[9,-4],[8,-2],[5,1],[4,1],[3,2],[2,2],[2,2],[2,2],[0,3],[-1,3],[-3,5],[-1,3],[1,4],[3,4],[10,4],[31,5],[8,3],[3,3],[-2,2],[-3,2],[-3,1],[-5,0],[-14,0],[-9,2],[-3,1],[-3,2],[-2,2],[-2,3],[-1,6],[-2,3],[-1,3],[-2,2],[-2,1],[-3,1],[-16,3],[-3,2],[-3,1],[-3,2],[-2,3],[-10,15],[-2,2],[-2,2],[-17,12],[-2,2],[-4,5],[-3,6],[-2,6],[-2,13],[-2,3],[-1,2],[-4,5],[-6,4],[-9,5],[-21,8],[-3,2],[-2,3],[-1,4],[-1,8],[1,3],[2,5],[14,17],[2,7],[0,4],[-2,2],[-3,2],[-16,4],[-6,3],[-3,2],[-5,5],[-3,5],[-1,4],[-2,4],[0,8],[1,5],[1,3],[3,3],[12,6],[3,3],[4,3],[6,7],[1,5],[1,4],[-2,5],[0,2],[0,6],[0,3],[-1,3],[-2,2],[-2,3],[-3,1],[-9,5],[-3,3],[-3,3],[-2,5],[1,4],[2,2],[3,2],[3,1],[14,1],[5,2],[5,5],[2,6],[2,11],[3,5],[3,3],[4,1],[4,0],[9,-2],[11,-3],[9,-2],[24,0],[4,-1],[8,-2],[3,-2],[8,-1],[4,-1],[13,2],[18,-1],[4,1],[4,1],[26,9],[6,16]],[[6424,5999],[22,-16],[61,-30],[26,-17],[35,-44],[110,-83],[30,-15],[48,-15],[34,-5],[13,-9],[7,-13],[5,-35],[5,-17],[10,-13],[14,-5],[5,-1]],[[5619,5568],[-49,-47],[-36,-21],[-5,-11],[-6,-6],[-13,-2],[-25,0],[-32,11],[-15,0],[-18,-22],[-11,-4],[-23,-4],[-6,-2],[-3,-2],[-2,-4],[-8,-26],[-1,-6],[4,-7],[14,-14],[51,-28],[12,-10],[1,-6],[-2,-11],[2,-4],[44,-27],[9,-15],[0,-16],[-3,-14],[2,-11],[16,-4]],[[5516,5255],[-13,-11],[-47,-22],[-12,12],[-12,8],[-13,5],[-33,3],[-6,7],[-3,27],[-5,9],[-39,30],[-3,4],[-3,5],[-3,16],[-4,10],[-6,6],[-9,2],[-10,0],[-49,-9],[-4,-10],[2,-28],[-3,-15],[-9,-9],[-12,-5],[-27,-6],[-9,-8],[-13,-22],[-15,-7],[-14,7],[-26,20],[-11,0],[-12,-3],[-10,1],[-6,11],[1,24],[-3,11],[-10,6],[-16,1],[-17,-5],[-16,-9],[-11,-11],[-6,-17],[4,-15],[10,-14],[22,-23],[13,-7],[29,-10],[8,-5],[17,-18],[33,-13],[16,-12],[13,-15],[10,-17],[5,-19]],[[5179,5115],[-9,0],[-12,2],[-59,30],[-21,6],[-9,-6],[-6,-9],[-14,10],[-62,73],[-82,75],[-88,61],[-13,8],[-22,5],[-13,9],[-7,2],[-25,3],[-7,3],[-13,12],[-7,15],[-3,17],[0,17],[-4,17],[-10,17],[-21,28],[-19,21],[-82,49],[-9,4],[-8,7],[-3,11],[-4,6],[-24,3],[-8,3],[-12,10],[-13,9],[-15,8],[-15,6],[-65,-1],[-10,-2],[-5,10],[-10,17],[-14,16],[-11,7],[-7,12],[-18,18],[-4,8],[-2,13],[-3,7]],[[4311,5752],[22,2],[27,-3],[17,-10],[6,0],[15,13],[22,43],[14,16],[23,2],[27,-10],[25,-18],[31,-35],[17,-5],[37,5],[11,-1],[22,-7],[11,0],[10,4],[17,14],[10,4],[42,5],[40,-2],[21,-8],[6,-15],[19,-3],[21,6],[16,14],[4,20],[-2,18],[2,8],[7,7],[7,3],[7,1],[8,-2],[6,-5],[3,-8],[-4,-19],[0,-9],[7,-6],[9,3],[40,31],[3,8],[-1,9],[-3,8],[0,7],[5,9],[22,14],[6,9]],[[4966,5869],[22,-2],[12,-20],[7,7],[3,4],[1,7],[7,0],[-1,-10],[3,-6],[6,-1],[9,5],[8,-10],[9,-10],[6,-11],[0,-16],[-16,13],[-4,-10],[2,-17],[3,-10],[-5,-3],[6,-6],[14,-8],[-4,0],[38,-19],[21,-6],[21,11],[7,5],[13,6],[17,14],[10,-1],[7,-6],[5,-10],[6,-7],[29,-11],[9,-7],[8,-8],[11,-20],[7,-6],[10,0],[10,4],[7,5],[12,3],[27,-13],[11,6],[6,12],[4,4],[7,1],[10,0],[27,-8]],[[4910,5530],[1,0],[-1,1],[-1,0],[0,-1],[1,0]],[[4920,5948],[-10,-13],[1,-17],[10,-15],[16,-8],[-11,-6],[15,-18],[25,-2]],[[4311,5752],[-3,8],[-45,72],[-20,23],[-100,60],[-42,9],[-32,13]],[[4436,6347],[37,-51],[13,-12],[10,-5],[9,-5],[2,-4],[1,-4],[-2,-3],[-1,-3],[-2,-2],[-2,-3],[-2,-2],[-6,-4],[-10,-3],[-6,-4],[-3,-2],[-3,-3],[-2,-5],[0,-3],[2,-3],[15,-15],[5,-4],[5,-3],[21,-7],[9,-6],[20,-18],[5,-2],[3,0],[4,0],[25,9],[25,4],[4,0],[17,-3],[4,-1],[5,1],[3,1],[3,2],[2,2],[6,8],[2,2],[3,1],[4,0],[40,-18],[13,0],[1,-2],[12,-4],[4,-8],[4,-16],[2,-19],[-2,-11],[12,-17],[3,-1],[4,1],[3,0],[2,-3],[-1,-12],[3,-11],[1,-14],[3,-8],[3,-3],[9,-8],[5,-6],[15,7],[20,-6],[43,-25],[20,-18],[0,-2],[-1,-7],[1,-2],[2,-1],[7,1],[2,0],[4,-3],[10,-2],[3,-2],[0,-5],[-5,-3],[-4,-4],[-8,-12],[7,-3],[7,-1],[7,1],[7,-2],[1,0]],[[4920,5948],[32,3],[5,-1],[6,-2],[5,-10],[5,-5],[4,-1],[3,1],[10,8],[23,10],[9,5],[5,4],[9,13],[3,5],[4,10],[0,4],[0,3],[-1,3],[-1,3],[-1,3],[0,4],[3,5],[4,3],[5,0],[3,-1],[3,-2],[12,-15],[7,-1],[11,-1],[28,4],[12,3],[8,3],[2,2],[1,3],[1,2],[0,4],[-1,3],[-7,10],[-1,3],[-1,3],[2,4],[3,2],[28,4],[1,0],[2,1],[4,3],[2,2],[9,14],[3,3],[75,27],[9,5],[1,3],[0,3],[-1,3],[-1,3],[-1,2],[1,8],[19,17]],[[5286,6140],[73,-2],[9,1],[2,1],[2,2],[1,2],[4,7],[2,4],[4,4],[5,1],[3,-1],[8,-4],[5,-1],[9,-2],[5,0],[27,6],[4,2],[14,10],[5,1],[6,0],[15,-3],[5,1],[4,1],[2,3],[2,2],[2,3],[4,9],[3,6],[4,5],[9,9],[2,2],[1,4],[0,3],[-1,3],[-2,5],[-1,3],[0,4],[0,4],[1,3],[8,10]],[[5532,6248],[40,0],[4,1],[4,1],[8,5],[3,1],[3,0],[5,-1],[7,-3],[18,-12],[6,-6],[22,-27]],[[6101,5041],[-7,-2],[-32,-2],[-8,-5],[-3,-4],[-4,-3],[-18,-7],[-24,3],[-43,30],[-26,-6],[-28,-17],[-14,-1],[-15,11],[-24,26],[-3,5],[0,17],[-9,13],[-13,11],[-69,34],[-18,5],[-11,-2],[0,-9],[3,-11],[0,-10],[-7,-15],[-7,-5],[-85,1],[-13,4],[-8,7],[-24,14],[-5,5],[3,10],[9,8],[22,11],[-28,50],[-15,8],[-23,4],[-9,4],[-8,9],[-2,10],[0,11],[-5,6],[-14,-4]],[[5727,4571],[-10,-4],[3,9],[5,4],[6,1],[-4,-10]],[[5334,4650],[-6,0],[-2,3],[1,5],[-2,4],[-5,3],[5,16],[5,3],[9,4],[1,1],[1,3],[1,1],[3,1],[4,2],[5,2],[6,-1],[2,-3],[-10,-4],[-10,-8],[-6,-14],[2,-4],[2,-2],[1,-2],[-2,-4],[-5,-6]],[[5253,4692],[-10,-4],[-1,2],[1,5],[1,6],[3,3],[-2,3],[4,2],[3,-2],[0,-8],[1,-7]],[[5420,4722],[-6,0],[-3,1],[3,7],[7,1],[-1,-9]],[[5993,4957],[-19,12],[-11,4],[-25,-5],[-13,0],[-5,8],[-52,-6],[-26,-13],[10,-26],[-27,-1],[-8,1],[-8,7],[-4,8],[-5,4],[-6,-7],[-6,0],[-16,15],[-131,48],[-32,1],[-68,-10],[-15,-5],[-30,-16],[-31,-8],[-20,-21],[-19,-4],[-20,5],[-6,11],[-3,14],[-8,15],[-10,11],[-16,25],[-12,13],[-46,42],[-26,17],[-26,12],[-17,5],[-57,2]],[[5912,6886],[-16,-5],[-8,-8],[3,-22],[-6,-10],[-6,-3],[-18,-1],[-7,1],[-5,3],[-10,17],[-12,5],[-12,0],[-114,-23],[-47,-18],[-20,-1],[-18,8],[-8,19],[-2,10],[-5,6],[-6,4],[-10,3],[-15,-4],[-22,-25],[-14,-10],[-21,-1],[-62,17],[-6,-2],[-7,-3],[-5,-5],[-4,-6],[-3,-12],[-1,-22],[-7,-12],[-40,-43],[-21,-16],[-23,-13],[-12,-3],[-11,1],[-23,7],[-7,1],[-6,-3],[-4,-5],[-1,-8],[1,-6],[8,-15],[-2,-11],[-10,-6],[-13,-5],[-10,-7]],[[5244,6654],[0,2],[-42,53],[-5,8],[-1,6],[1,11],[-2,13],[-2,5],[-1,4],[-30,35],[-4,7],[-2,5],[0,4],[6,20],[0,8],[0,3],[0,7],[3,11],[1,4],[0,14]],[[5166,6874],[126,88],[11,17],[7,8],[23,6],[10,6],[6,9],[7,19],[6,9],[9,7],[43,24],[3,3],[3,6],[2,17],[3,5],[9,5],[32,2],[51,19]],[[5517,7124],[64,-41],[98,-46],[17,-5],[8,-7],[40,-11],[22,-10],[8,4],[7,6],[4,3],[2,1],[2,2],[3,2],[5,1],[5,-2],[2,-4],[2,-4],[3,-1],[16,-7],[12,-14],[9,-14],[8,-7],[16,-3],[15,-7],[8,-12],[-7,-13],[26,-49]],[[5166,6874],[-22,0],[-16,-6],[-4,-2],[-3,-3],[-7,-8],[-5,-4],[-4,-1],[-3,1],[-10,4],[-12,3],[-9,1],[-6,0],[-3,-1],[-2,-1],[-8,-6],[-7,-5],[-5,0],[-3,1],[-79,71],[-19,8],[-38,13],[-9,2],[-5,-1],[-3,-1],[-3,-2],[-5,-4],[-3,-3],[-5,-2],[-9,-1],[-9,2],[-52,18],[-6,4],[-3,1],[-2,3],[-2,2],[0,4],[2,2],[2,2],[4,1],[4,0],[13,-2],[5,0],[3,1],[3,1],[3,3],[2,2],[2,3],[1,3],[0,3],[0,3],[-3,5],[0,3],[1,3],[4,5],[1,4],[0,3],[-1,5],[-4,1],[-3,-1],[-34,-9],[-3,-2],[-3,-2],[-2,-2],[-3,-6],[-3,-2],[-7,-1],[-5,1],[-16,8],[-13,3],[-7,2],[-11,0],[-9,1],[-3,1],[-4,5]],[[4883,7248],[7,-2],[10,1],[16,1],[3,5],[12,14],[-1,3],[1,2],[1,3],[2,2],[1,1]],[[5162,7315],[2,-1],[40,-4],[16,-7],[33,-20],[56,-17],[8,-10],[7,-6],[193,-126]],[[4883,6985],[8,0],[8,4],[4,6],[0,8],[-2,8],[-5,6],[-6,4],[-5,0],[-6,-3],[-5,-6],[-2,-9],[1,-8],[4,-6],[6,-4]],[[5994,6728],[-93,-12],[-28,-9],[5,-13],[0,-14],[-4,-13],[-10,-9],[-11,-2],[-25,5],[-11,-2],[-8,-6],[-3,-6],[-1,-8],[-3,-8],[-7,-5],[-28,-6],[-10,-4],[-9,-6],[-7,-8],[-4,-9],[-4,-20],[0,-10],[3,-9],[4,-4],[14,-9],[4,-5],[2,-5],[0,-12],[-6,-17],[-15,-11],[-18,-4],[-16,7],[-10,13],[-6,6],[-8,3],[-24,-7],[-70,-57],[-21,-5],[-9,-5],[-7,-8],[1,-10],[21,-41]],[[5572,6383],[-15,-38]],[[5557,6345],[-48,-20],[-14,-1],[-2,3],[-1,3],[-2,6],[-1,3],[-1,3],[-4,5],[-27,23],[-4,4],[-8,6],[-18,11],[-11,10],[-6,5],[-5,1],[-4,-1],[-5,-1],[-7,-1],[-25,1],[-5,-1],[-2,-3],[0,-3],[1,-2],[3,-6],[1,-3],[-1,-3],[-4,-3],[-8,-2],[-4,1],[-2,3],[0,3],[0,15],[0,3],[-1,4],[-1,3],[-2,2],[-2,2],[-22,12],[-5,4],[-14,14],[-5,7],[-2,6],[0,7],[-1,4],[-1,3],[-4,5],[-1,3],[-1,3],[0,3],[2,7],[0,3],[0,3],[-1,2],[-4,10],[-1,11],[1,7],[2,15],[1,8],[-2,5],[-4,7],[-11,12],[-6,5],[-7,3],[-12,2],[-4,2],[-3,3],[-3,9],[0,3],[2,2],[2,2],[5,4],[5,5],[2,3],[1,2],[2,4],[1,3],[0,3],[0,4],[-1,7],[-4,12]],[[5912,6886],[82,-158]],[[6085,6534],[-33,-6],[-10,1],[-10,5],[-4,6],[-5,2],[-130,-40],[-62,-32],[-74,-21],[-12,-1],[-18,6],[-7,0],[-10,-4],[-7,-9],[-1,-9],[5,-20],[-1,-10],[-5,-11],[-7,-8],[-8,-2],[-3,2],[-9,12],[-6,5],[-6,2],[-46,9],[-7,-1],[-5,-4],[-14,-16],[-5,-4],[-6,-2],[-7,-1]],[[5994,6728],[13,-24],[13,-18],[4,-6],[5,-31],[3,-7],[10,-12],[27,-44],[12,-30],[4,-22]],[[6085,6534],[10,-51],[34,-91]],[[5532,6248],[0,12],[4,6],[3,3],[5,1],[4,-1],[5,-1],[5,0],[11,3],[5,3],[4,2],[1,3],[5,18],[0,5],[0,4],[-1,3],[-2,6],[-5,12],[-6,10],[-2,3],[-3,2],[-2,1],[-6,2]],[[5286,6140],[-6,5],[-7,22],[-5,8],[-7,8],[-8,6],[-8,4],[-8,0],[-8,-2],[-19,-9],[-13,-2],[-5,-2],[-4,-3],[-5,-9],[-6,-4],[-13,0],[-6,-2],[-4,-6],[-5,-14],[-4,-7],[-5,-3],[-6,-1],[-5,2],[-4,6],[-1,9],[-1,4],[-3,4],[-68,49],[-4,5],[-2,8],[-5,25],[-3,7],[-5,6],[-7,3],[-7,0],[-6,-4],[-2,-6],[-4,-14],[-5,-4],[-5,-2],[-12,-1],[-5,1],[-9,4],[-9,10],[-5,3],[-9,2],[-4,-1],[-3,-4],[-36,-31],[-4,-1],[-6,0],[-6,2],[-4,3],[-2,3],[-5,4],[-12,2],[-9,-8],[-8,-11],[-12,-7],[-14,3],[-3,12],[2,29],[-10,13],[-32,5],[-7,17],[7,26],[24,52],[1,26],[-9,15],[-14,8],[-195,20],[-23,-7],[-21,-18],[-7,-12],[-3,-8],[-5,-7],[-14,-7],[-23,-5],[-11,1],[-8,6]],[[1195,8549],[-14,-1],[1,-16],[11,-27],[-12,-11],[-31,2],[-15,-12],[24,-13],[4,-5],[2,-18],[-1,-19],[-1,-1],[25,-30],[15,-13],[7,-19],[5,-5],[8,-3],[26,4],[12,0],[29,-9],[10,-7]],[[1300,8346],[-8,-7],[-4,-21],[-7,-11]],[[1281,8307],[-15,4],[-7,1],[-5,-3],[-14,-20],[-4,-4],[-11,1],[-8,6],[-5,10],[0,9],[-15,4],[-11,-5],[-23,-1],[-59,-24],[-14,-2],[-7,-4],[-1,-9],[2,-10],[4,-7],[11,-4],[13,-1],[9,-4],[4,-11],[-2,-4],[-6,-9],[-2,-6],[2,-16],[-4,-9],[-23,-17],[-4,-9],[-8,-30],[0,-10],[3,-8],[5,-6],[14,-9],[17,-26],[8,-6]],[[1125,8068],[-29,-16],[-30,0],[-61,14],[-10,-1],[-8,-5],[-15,-15],[-6,-3],[-33,-3],[-16,2],[-34,-1],[-3,9],[-7,6],[-10,4],[-9,1],[-13,-2],[-5,-4],[-4,-7],[-7,-8],[-5,-3],[-19,-3],[-52,-35],[-15,-3],[-85,-2],[-10,-3],[-5,0],[-5,1],[-3,4],[-1,3],[1,3],[-1,5],[-3,6],[-3,3],[-5,1],[-7,0],[-144,-31],[-65,-30],[-32,-2]],[[366,7953],[-17,23],[-3,7],[-4,21],[-10,19],[1,1],[4,14],[1,0],[0,5],[1,2],[0,3],[-1,5],[-4,4],[-15,12],[-42,13],[-15,1],[-41,-6],[-16,2],[-58,25],[-27,17],[-15,19],[2,48],[-6,24],[-22,12],[-29,2],[-9,6],[-10,12],[-2,8],[1,7],[-2,6],[-13,9],[-15,16],[10,10],[12,7],[3,2],[29,12],[8,1],[15,0],[6,1],[8,3],[15,8],[6,3],[30,-4],[30,-12],[31,-8],[27,10],[2,5],[-5,4],[-4,5],[4,7],[7,2],[19,0],[8,2],[12,8],[15,18],[11,8],[30,10],[29,6],[7,-2],[11,-10],[4,-1],[6,4],[16,22],[22,13],[0,14],[-9,17],[-4,25],[4,5],[28,24],[17,22],[7,14],[1,10],[-6,4],[-36,11],[-11,6],[-7,10],[-6,11],[-5,6]],[[397,8603],[11,9],[36,29],[5,1],[4,1],[0,-3],[-3,-8],[0,-2],[1,-2],[3,-2],[2,-1],[15,-3],[41,-4],[10,0],[7,2],[5,3],[123,30],[3,2],[11,8],[3,2],[17,7],[5,4],[11,9],[16,11],[6,2],[7,1],[15,0],[7,1],[8,2],[11,5],[8,2],[7,1],[81,-14],[4,-1],[3,-1],[10,-5],[8,-2],[49,-2],[9,1],[6,1],[7,3],[22,12],[81,19]],[[1072,8721],[13,-30],[-1,-13],[-10,-16],[86,-58],[25,-9],[11,-7],[5,-9],[-2,-8],[-4,-6],[-3,-6],[3,-10]],[[1072,8721],[27,28],[6,12],[-1,3],[-1,3],[-4,5],[-1,7],[0,12],[4,28],[0,11]],[[1102,8830],[22,-5],[70,10],[15,-1],[18,-8],[11,-3],[5,10],[12,10],[14,7],[12,4],[34,-8],[11,-5],[34,-31],[48,-38],[7,-15],[2,-12],[-8,-11],[-8,-7],[-6,-4],[-2,-9],[4,-10],[14,-15],[5,-8],[-2,-13],[-21,-32],[-10,-10],[-21,-14],[-5,-5],[-3,-4],[-2,-8],[-3,-4],[-5,-3],[-16,-3],[-10,-5],[-4,-3],[-20,-34],[-12,-13],[-15,-3],[-72,22]],[[1466,8867],[7,-13],[22,-28],[0,-14],[-12,-8],[-35,3],[-15,-5],[35,-47],[8,-7],[10,-4],[10,-7],[5,-13],[13,-157],[3,-11],[17,-4],[9,-9],[7,-10],[8,-3],[9,0],[11,-2],[8,-5],[3,-6],[3,-16],[-25,-11],[1,-8],[16,-7],[19,-4]],[[1603,8471],[-2,-1],[-4,-6],[-5,-6],[-1,-2],[0,-3],[1,-4],[5,-4],[5,-2],[3,-3],[2,-5],[1,-16],[5,-5],[4,-2],[3,-3],[2,-3],[-2,-6],[-1,-5],[2,-6],[8,-9],[5,-4],[5,-3],[2,-3],[1,-3],[-7,-12],[3,-8],[2,-4]],[[1640,8343],[-20,7],[-14,2],[-12,5],[-4,15],[-78,5],[-29,-6],[-10,-6],[-11,-12],[-9,-4],[-55,6],[-40,-12],[-6,2],[-8,8],[-4,0],[-23,-14],[-3,5],[-4,1],[-4,0],[-6,1]],[[1102,8830],[-1,8],[-3,2],[-17,6],[-7,4],[-3,2],[-2,3],[-2,4],[-3,15],[-1,4],[-5,18],[0,14],[-3,25],[-10,49],[0,6],[1,2],[6,2]],[[1052,8994],[17,6],[20,-2],[48,-19],[15,1],[55,24],[10,2],[8,0],[17,-8],[7,-1],[81,21],[18,-2],[1,-15],[16,-9],[35,-11],[24,-31],[19,-13],[6,-22],[-10,-51],[27,3]],[[1784,9157],[5,-54],[0,-4],[-1,-6],[-4,-11],[-3,-5],[-4,-3],[-107,-82],[-2,-2],[-2,-4],[1,-7],[2,-13],[5,-16],[4,-26],[0,-5],[-2,-3],[-1,-3]],[[1675,8913],[-37,16],[-11,0],[-30,-6],[-5,-3],[-3,10],[-10,9],[-10,8],[-10,3],[-7,-3],[-19,-18],[-11,-5],[-5,1],[-11,5],[-5,1],[-9,-4],[-1,-8],[2,-17],[-2,-12],[-6,-10],[-7,-8],[-12,-5]],[[1052,8994],[-6,17]],[[1046,9011],[18,1],[2,16],[9,13],[12,7],[60,9],[8,2],[6,4],[10,9],[1,2],[8,13],[2,2],[4,24],[0,10],[2,10],[6,9],[8,4],[18,2],[9,2],[36,23],[19,28],[-3,31],[-25,34],[-19,13],[-3,3],[4,7],[8,9],[16,11],[18,6],[37,6],[17,9],[41,39],[24,8],[10,5],[8,7],[5,8],[0,9],[-6,3],[-3,4],[7,11],[18,13],[23,9],[35,5],[12,2],[24,-3],[11,-12],[4,-19],[0,-26],[-3,-25],[-13,-45],[-3,-22],[3,-21],[9,-14],[16,-9],[22,-6],[23,-9],[24,-17],[53,-56],[8,-3],[16,-4],[39,-16],[15,-1],[6,3],[13,8],[5,2],[4,-1]],[[1675,8913],[-2,-2],[-3,-3],[-17,-11],[-2,-2],[-2,-3],[-2,-2],[3,-8],[6,-12],[19,-26],[9,-10],[7,-6],[17,-3],[7,-3],[2,-3],[2,-4],[0,-8],[-1,-5],[-3,-7],[0,-4],[2,-3],[5,-3],[5,-1],[9,1],[3,-1],[2,-3],[-1,-6],[1,-5],[1,-4],[3,-6],[0,-3],[-3,-4],[-4,-1],[-4,1],[-3,-1],[-1,-3],[4,-5],[22,-20],[2,-3],[1,-4],[-2,-16],[8,-7],[-1,-9],[0,-4]],[[1764,8681],[3,-6],[5,-9],[1,-6],[1,-8],[3,-4],[6,-5],[18,-11],[16,-4],[4,-1],[5,-6],[6,-10],[21,-41],[3,-4],[15,-13]],[[1871,8553],[-56,-15],[-26,-13],[0,-3],[3,-2],[11,-4],[3,-2],[2,-2],[0,-3],[-1,-3],[-4,-2],[-23,-10],[-5,-3],[-3,-3],[-2,-2],[-2,-3],[-1,-4],[-2,-10],[-1,-3],[-2,-2],[-4,-1],[-7,1],[-15,3],[-6,4],[-5,3],[-13,21],[-4,5],[-4,5],[-3,2],[-3,2],[-8,2],[-37,6],[-13,0],[-5,-1],[-4,-1],[-4,-4],[-3,-6],[-5,-13],[-7,-13],[-9,-8]],[[1640,8343],[5,-7],[2,-2],[7,-15],[29,-25],[20,-40],[11,-17],[20,-15],[11,6],[10,-1],[16,-5],[32,0],[19,3],[50,22],[14,4],[23,-4],[3,-1],[0,-4],[-4,-22],[0,-4],[0,-3],[1,-4],[1,-2],[1,-3],[2,-3],[2,-1],[12,-6],[5,-2],[6,-1],[25,-1],[7,-2],[6,-3],[1,-1],[5,-4],[2,-3],[3,-4],[2,-8],[0,-5],[-2,-7],[2,-4],[4,-6],[16,-13],[45,-30],[3,-2],[1,-3],[0,-6],[-1,-3],[-4,-5],[-1,-4],[0,-3],[0,-3],[4,-5],[6,-5],[14,-11],[8,-4],[7,-2],[20,0],[19,-2],[4,-1],[3,-2],[3,-1],[3,-4],[4,-4],[9,-14],[15,-34],[4,-6],[4,-4],[3,-2],[3,-10],[-4,-33]],[[1395,7789],[11,11],[7,13],[7,9],[29,-1],[17,6],[9,9],[-7,12],[-7,1],[-17,-1],[-6,5],[-1,7],[4,8],[6,5],[7,3],[12,8],[5,17],[-2,19],[-6,13],[14,4],[25,-4],[14,3],[6,6],[4,10],[1,10],[0,9],[46,16],[18,13],[-1,24],[-9,8],[-28,2],[-23,9],[-3,2],[0,5],[3,6],[1,6],[-2,4],[-25,1],[-12,6],[-7,11],[-8,41],[1,7],[1,2],[8,5],[1,1],[1,0],[2,0],[1,1],[1,0],[1,1],[0,2],[5,25],[-1,5],[-7,10],[-17,7],[-6,8],[-2,8],[1,15],[-2,8],[-8,9],[-22,12],[-8,12],[-55,-14],[-4,-9],[-1,-12],[-7,-15],[-26,21],[-8,1],[-18,-2],[-16,11],[-11,17],[-7,17],[-3,4],[-3,1],[-3,3],[1,7],[2,1],[13,13]],[[1382,7800],[-5,12],[-8,11],[6,13],[-7,18],[-15,13],[-15,2],[0,15],[20,22],[3,14],[6,7],[28,18],[1,10],[-13,8],[-25,3],[-25,18],[-11,-6],[-21,-25],[-9,11],[-4,6],[-2,7],[-6,5],[-22,2],[-8,6],[25,26],[7,15],[-1,7],[-9,1],[-15,5],[-8,1],[-26,-10],[-30,-1],[-16,3],[-10,10],[-8,14],[-8,11],[-11,4],[-15,-8]],[[911,7417],[-10,16],[-19,13],[-10,16],[12,28],[-26,4],[-35,-17],[-24,-1],[-146,-31],[-34,0],[-8,2],[-8,5],[-4,8],[-6,6],[-11,3],[-22,3],[-16,5],[-89,40],[-34,9],[-49,20],[-11,2],[-11,-1],[-10,-2],[-10,-1],[-11,3],[-8,7],[-4,7],[-3,8],[-5,9],[-8,7],[-16,8],[-8,6],[-4,7],[-10,17],[-7,9],[-15,12],[-3,4],[-4,4],[-3,8],[0,4],[2,5],[7,27],[6,7],[28,12],[-22,13],[-25,20],[-19,24],[-2,27],[8,12],[43,24],[29,37],[12,6],[-10,18],[4,10],[2,8],[16,14],[19,8],[15,0],[31,-7],[15,0],[-5,11],[-9,13]],[[397,8603],[-3,3],[-37,20],[-38,16],[-6,12],[-5,36],[-3,6],[-9,10],[-2,7],[2,8],[10,15],[2,5],[-5,12],[-11,6],[-27,5],[-11,6],[-19,13],[-11,3],[-22,4],[-23,12],[-17,18],[-9,36],[-1,5],[-2,10],[1,16],[5,14],[10,13],[13,5],[23,5],[7,-2],[6,-2],[5,-6],[5,1],[1,4],[1,6],[0,4],[6,1],[21,0],[18,4],[19,7],[17,10],[11,14],[5,11],[7,11],[9,8],[12,4],[38,-30],[19,-9],[26,-4],[27,1],[26,3],[51,15],[24,11],[11,3],[63,-5],[27,7],[50,26],[25,7],[17,2],[9,9],[8,9],[15,6],[85,-16],[13,-5],[13,-9],[16,-16],[1,-2],[10,-3],[7,1],[6,3],[9,0],[40,-10],[23,0],[15,-3],[5,-1],[10,5],[2,2],[0,5],[2,9],[1,1]],[[2993,9112],[46,-6],[19,-11],[8,-8],[4,-9],[-11,-5],[-36,-6],[-11,-4],[-5,-3],[-4,-4],[-5,-11],[-3,-4],[-36,-12],[-8,-6],[-18,-23],[-1,-22],[11,-19],[20,-14],[-22,-18],[-15,-16],[-3,-3],[-12,-17],[-8,-14],[1,-15],[5,-22],[3,-22],[-7,-16],[-24,-11],[-54,-9],[-16,-2],[-20,-5],[-8,-9],[-22,-30],[-19,-14],[-11,-21],[2,-35],[12,-34],[13,-32],[2,-23],[0,-8]],[[2760,8569],[-61,25],[-4,-8],[-2,-11],[-4,-8],[-6,0],[-27,6],[-2,14],[-11,14],[-16,11],[-16,5],[-9,-9],[-11,-17],[-13,-13],[-13,3],[-12,10],[-18,10],[-18,7],[-11,-2],[-20,-10],[-12,9],[-11,16],[-14,13],[-9,8]],[[2440,8642],[17,26],[3,15],[-1,19],[-5,20],[-8,17],[-18,18]],[[2428,8757],[-11,23]],[[2417,8780],[-12,10],[-11,14],[-6,44],[7,9],[35,11],[17,9],[-9,5],[-23,25],[-11,20],[-1,6],[7,8],[22,9],[8,7],[3,5],[2,17],[3,6],[12,16],[4,7],[1,8],[-2,8],[-7,6],[-19,4],[-3,3],[-10,36],[30,0]],[[2454,9073],[9,0],[35,9],[7,5],[14,14],[18,7],[104,9],[102,-16],[15,1],[11,4],[21,11],[142,25],[2,-8],[-4,-15],[3,-6],[10,-4],[50,3]],[[3230,9535],[5,-4],[9,-20],[4,-6],[8,-9],[5,-4],[5,-2],[39,-5],[24,-7],[40,-18],[6,-5]],[[3375,9455],[3,-6],[2,-6],[7,-25],[1,-11],[-2,-3],[-1,-4],[-3,-4],[-3,-2],[-9,-7],[-6,-3],[-3,-2],[-8,-2],[-10,-1],[-19,1],[-4,-1],[-6,-2],[-14,-9],[-6,-9]],[[3294,9359],[-15,-6],[-12,4],[-21,12],[-21,-6],[-66,-47],[-30,-5],[-11,-9],[-13,-36],[-10,-12],[-94,-42],[-15,-12],[-6,-21],[5,-17],[10,-16],[6,-17],[-8,-17]],[[2454,9073],[-4,13],[-9,10],[-6,10],[4,11],[-13,7],[-49,12],[-12,7],[-5,10],[-1,28],[8,16],[1,4]],[[2368,9201],[5,30],[9,17],[-17,5],[-40,-7],[-37,20],[-65,0],[-22,-3]],[[2201,9263],[12,30],[25,37],[5,19],[-1,11],[-12,31],[0,12],[2,11],[-1,9],[-11,5],[-8,12],[6,21],[15,21],[16,10],[41,4],[16,-3],[1,-11],[21,-15],[7,-2],[9,3],[4,5],[3,6],[5,6],[14,7],[7,1],[2,-5],[5,-83],[-1,-13],[2,-5],[6,-4],[18,-8],[8,-4],[17,-31],[10,-11],[18,-8],[20,-5],[96,-1],[16,4],[12,13],[1,7],[-2,10],[2,9],[9,8],[9,0],[21,-9],[10,-2],[18,4],[56,21],[36,4],[17,-1],[17,-3],[21,-10],[5,-14],[1,-17],[5,-19],[13,-12],[33,-21],[8,-14],[1,-20],[28,0],[35,10],[23,10],[11,17],[-10,15],[-35,25],[-8,10],[-3,7],[1,8],[4,11],[6,9],[18,11],[6,6],[6,19],[-6,9],[-14,4],[-38,6],[-25,6],[-13,12],[15,18],[-7,3],[-4,5],[-2,7],[-1,8],[3,9],[0,19],[2,6],[7,7],[18,13],[7,7],[10,28],[4,6],[8,4],[79,16],[22,0],[13,-8],[2,-10],[-5,-17],[4,-10],[35,-8],[6,-4],[5,-5],[5,-4],[9,-3],[11,-1],[29,2],[60,-11],[16,2],[6,8]],[[3294,9359],[33,-18],[9,-8],[1,-3],[1,-7],[0,-3],[-1,-4],[-1,-3],[0,-6],[2,-9],[7,-19],[1,-8],[0,-7],[-12,-23],[-7,-11],[-1,-4],[-2,-6],[0,-22],[-4,-33],[-2,-5],[-1,-2],[-3,-3],[-25,-18],[-6,-3],[-3,-5],[-4,-8],[-6,-20],[-4,-9],[-3,-6],[-11,-4],[-4,-3],[-4,-6],[-5,-11],[-2,-6],[-1,-6],[1,-3],[2,-2],[3,-2],[3,-2],[4,-1],[18,-3],[3,-2],[1,-2],[1,-3],[0,-12],[1,-4],[1,-3],[2,-3],[1,-3],[7,-8],[3,-6],[0,-3],[-1,-4],[-5,-8],[-4,-9],[-1,-5],[1,-4],[5,-10],[8,-22],[2,-4],[3,-2],[3,-1],[14,-3],[4,-1],[4,-3],[1,-4],[-3,-11],[1,-4],[3,-2],[7,-3],[8,-2],[5,0],[4,0],[4,1],[3,1],[11,8],[4,2],[4,0],[20,0],[10,0],[4,1],[3,2],[3,2],[2,2],[1,3],[1,4],[1,7],[1,3],[1,3],[3,2],[2,2],[4,1],[13,-1],[5,0],[17,4],[4,0],[5,0],[4,-1],[10,-4],[4,-1],[5,0],[27,3],[8,0],[3,0],[12,-4],[15,-6]],[[3560,8920],[-35,-39],[-4,-5],[-13,-23],[-19,-23],[-12,-10],[-85,-93],[-3,-17],[0,-24],[8,-56],[-1,-32],[-2,-1],[-3,-5],[0,-5],[1,-6],[5,-9],[9,-9],[0,-1]],[[3406,8562],[-26,-26],[-12,-6],[-45,1],[-12,3],[-35,20],[-13,3],[-9,-1],[-9,-5],[-8,-7],[-4,-8],[-1,-5],[2,-3],[5,-6],[3,-7],[2,-7],[0,-7],[0,-8],[-4,-9],[-7,-3],[-9,-3],[-8,-5],[-27,-32],[-5,-21],[-3,-5],[-12,-6],[-11,3],[-6,-5],[-2,-10],[4,-10],[-17,-9],[-9,-2],[-10,1]],[[3118,8377],[-8,12],[-34,27],[-13,5],[-6,-3],[-14,-13],[-6,-4],[-1,0],[-1,1],[-1,0],[-1,0],[-1,1],[-1,0],[-1,0],[-1,1],[-1,0],[-1,0],[-1,0],[0,1],[-1,0],[-1,0],[-1,1],[-1,0],[-1,0],[-1,1],[-1,0],[-1,0],[-1,1],[-1,0],[-1,0],[-1,1],[-1,0],[-1,1],[-1,0],[-1,0],[-1,0],[0,1],[-1,0],[-1,0],[-1,0],[0,1],[-1,0],[-61,13],[-28,16],[-38,9],[-20,6],[-19,9],[-38,24],[-33,14],[-10,8],[-3,9],[4,33],[1,16]],[[3867,8291],[-12,-7],[-3,-2],[-1,-3],[-1,-3],[4,-19],[1,-1],[14,-4],[50,0],[0,-22],[27,-18],[71,-34],[14,-1],[11,-5],[2,-14]],[[3272,8131],[2,3],[-33,13],[18,14],[44,12],[19,14],[4,8],[0,6],[-3,3],[-24,0],[-50,-18],[-15,0],[10,24],[51,25],[5,26],[-10,9],[-13,-5],[-11,-10],[-4,-5],[-16,0],[-48,-13],[1,34],[2,5],[3,3],[7,3],[11,1],[22,0],[10,3],[8,9],[3,12],[-2,11],[-9,9],[-42,4],[-32,1],[-16,6],[-10,9],[-33,12],[-3,18]],[[3406,8562],[22,4],[13,0],[1,-18],[-2,-17],[3,-8],[11,-5],[0,-6],[-10,-6],[0,-21],[-8,-8],[18,-4],[9,2],[5,0],[4,-2],[4,-4],[3,-3],[3,-7],[2,-2],[2,-2],[4,-1],[5,2],[3,1],[3,3],[4,4],[3,2],[3,1],[7,-1],[8,-4],[26,-19],[4,-5],[5,-8],[2,-2],[82,-46],[28,-8],[7,-3],[4,-3],[7,-6],[2,-3],[2,-3],[-1,-2],[0,-3],[-3,-5],[-1,-2],[-1,-3],[1,-3],[1,-2],[1,-1],[4,-2],[5,-1],[10,0],[12,2],[4,0],[5,-2],[4,-4],[1,-4],[-2,-3],[-3,-5],[-1,-3],[-1,-3],[1,-3],[1,-3],[2,-3],[11,-9],[4,-2],[6,-3],[6,-1],[5,1],[6,3],[4,3],[3,2],[3,1],[24,2],[6,2],[5,2],[3,2],[7,0],[9,0],[26,-6],[5,-7]],[[2753,8317],[-6,16],[-7,6],[-27,2],[-19,4],[-17,10],[-18,32],[-54,42],[-25,5],[-56,33],[-8,14],[-6,16],[-8,14],[-14,6],[-3,-13],[-9,-8],[-12,-1],[-13,4],[-33,26],[-13,4],[-5,24],[1,21],[5,12],[3,4]],[[2409,8590],[7,9],[24,43]],[[2470,8315],[-1,8],[-2,8],[-4,7],[-5,6],[-21,6],[-21,5],[-13,4],[-23,4],[-11,11],[-24,12],[-22,20],[-16,6],[-18,3],[-15,-1],[3,8],[10,10],[5,7],[1,7],[-1,7],[0,9],[4,9]],[[2296,8471],[14,0],[12,-5],[7,-1],[2,11],[-3,9],[-11,16],[-2,10],[3,9],[6,9],[7,8],[7,5],[16,6],[6,4],[4,9],[0,6],[-2,19],[2,5],[15,15],[13,0],[7,-2],[10,-14]],[[1871,8553],[27,-42],[64,-48],[36,-34],[23,13],[0,7],[-10,9],[-9,20],[21,4],[6,0],[5,-4],[8,-13],[6,-2],[108,-4],[11,5],[19,15],[11,4],[45,-3],[20,5],[9,-1],[7,-4],[11,-8],[7,-1]],[[1764,8681],[9,6],[18,-1],[8,1],[27,21],[5,6],[9,6],[15,-7],[14,-12],[6,-10],[31,11],[9,15],[7,4],[21,6],[7,5],[39,0],[0,-17],[3,-7],[10,-7],[15,-2],[29,3],[15,4],[4,7],[-9,25]],[[2056,8738],[46,0],[-3,-17],[0,-10],[7,-5],[16,-2],[15,2],[15,5],[6,0],[16,-13],[9,-2],[7,0],[6,-1],[15,-9],[58,-20],[15,0],[-2,13],[7,3],[21,-2],[15,2],[74,36],[17,15],[12,24]],[[1935,8915],[-3,-9],[-4,-22],[0,-6],[4,-6],[36,-37],[3,-8],[-3,-10],[-7,-8],[-9,-7],[-9,-5],[-9,-8],[4,-7],[10,-8],[7,-12],[7,5],[14,4],[6,3],[6,7],[5,2],[4,-3],[2,-8],[8,-12],[25,4],[29,7]],[[2061,8771],[-2,-13],[-1,-9],[-2,-11]],[[1784,9157],[3,-1],[6,-8],[7,-3],[13,-2],[26,1],[13,-3],[21,-21],[-13,-20],[-24,-21],[-14,-24],[-4,-4],[-1,-2],[14,-1],[13,-3],[48,-19],[6,-3],[6,-5],[8,-14],[14,-19],[7,-11],[5,-11],[1,-15],[-3,-11],[-5,-10],[-3,-13],[7,1]],[[2368,9201],[-18,2],[-20,-1],[-9,-1],[-24,-5],[-17,-9],[-13,-9],[-8,-14],[-8,-43],[-8,-17],[-3,-22],[8,-34],[3,-13],[-6,0],[-7,-2],[-5,-3],[-3,-5],[0,-3],[1,-2],[2,-1],[1,-2],[17,-39],[10,-7],[5,2],[8,7],[4,0],[5,-7],[4,-11],[2,-12],[-1,-8],[-49,-45],[-21,-29],[1,-27]],[[2219,8841],[-10,-13],[-28,-18],[-5,-11],[-3,-15],[-6,-10],[-9,-1],[-22,20],[-16,5],[-15,3],[-11,-3],[-6,-3],[-15,-1],[-6,-3],[-3,-6],[-3,-14]],[[1935,8915],[26,6],[28,-9],[25,-3],[27,23],[21,29],[3,15],[-10,14],[-8,4],[-18,3],[-8,3],[-8,8],[-7,16],[-9,6],[-2,3],[0,2],[0,2],[2,2],[28,18],[-15,30],[4,10],[21,12],[19,4],[7,4],[7,8],[3,10],[-2,20],[3,11],[16,16],[61,30],[6,9],[4,10],[5,8],[9,5],[10,3],[10,7],[8,9]],[[2417,8780],[-27,-15],[-15,-3],[-10,9],[-8,10],[-10,0],[-12,-6],[-11,-9],[-5,7],[-7,5],[-9,2],[-19,-7],[-8,2],[-14,18],[-3,7],[0,18],[-4,9],[-6,8],[-7,5],[-8,1],[-10,-1],[-5,1]],[[5756,9069],[4,-9],[-1,-6],[-5,-4],[-7,-5],[-11,-11],[-25,-42],[-4,-24],[25,-95],[0,-22],[-3,-13],[-6,-13]],[[5723,8825],[-34,5],[-10,13],[-15,-4],[-81,14],[-8,2],[-20,15],[-5,3],[-9,-1],[-30,-8],[-10,-12],[-7,-3],[-8,3],[-7,12],[-10,3],[-7,-4],[-3,-8],[4,-8],[9,-4],[0,-6],[-19,-1],[-17,-8],[-9,-12],[5,-14],[13,-7],[17,2],[32,11],[-9,-13],[-30,-17],[-6,-15]],[[5449,8763],[-13,11],[-5,8],[-19,39],[-4,5],[-8,7],[-4,4],[-3,4],[0,6],[1,2],[-1,2],[-3,5],[-20,19],[-1,3],[-1,5],[-1,10],[-1,9],[2,9],[0,2],[-6,7],[-16,8]],[[5346,8928],[0,22],[-12,13],[-18,10],[-17,14],[-9,21],[0,22],[33,170],[7,12],[1,5],[-2,7],[-2,4],[-3,2],[-1,3],[0,6],[1,4],[3,5],[17,20],[4,7],[2,9],[0,9],[-5,17],[-2,29],[-3,8],[-6,4],[-9,2],[-26,1],[-19,-3],[-8,0],[-5,2],[-10,8],[-5,3],[-6,2],[-18,0],[-26,5],[-8,0],[-6,-2],[-29,-12],[-52,-5],[-39,4],[-11,4],[-19,12],[-11,4],[-46,1],[-21,29],[-11,6]],[[4949,9412],[6,16],[11,17],[3,3],[5,2],[18,8],[35,5],[40,0],[9,-1],[8,-3],[4,-1],[4,1],[2,4],[0,7],[-2,5],[-3,3],[-7,3],[-4,1],[-4,1],[-3,1],[-3,3],[1,4],[3,5],[14,13],[5,3],[3,1],[8,3],[8,2],[55,6],[2,2],[2,4],[-2,8],[1,8],[0,11],[-5,18],[-5,41]],[[5158,9616],[21,-5],[47,-22],[197,-10],[69,-11],[53,-24],[18,-5],[33,-1],[86,13],[37,-4],[51,2],[6,-1],[12,-10],[6,-3],[36,-1],[101,-23],[13,-1],[13,1],[0,-6],[-2,-6],[-3,-6],[-4,-4],[-2,-22],[-2,-4],[-7,-10],[-15,-6],[-21,1],[-29,-3],[-20,-14],[-18,-18],[-21,-15],[-38,-15],[-20,-10],[-11,-4],[-11,-1],[-9,-7],[-11,-19],[-12,-14],[-4,-5],[-22,-9],[7,-9],[4,-10],[6,-22],[11,-11],[3,-12],[7,-7],[23,2],[-12,15],[13,-3],[25,-1],[11,-5],[24,-3],[16,-8],[25,-18],[21,-2],[25,2],[11,-2],[9,-1],[3,-8],[3,-8],[-24,-32],[-79,-43],[-14,-8],[-20,-18],[7,-5],[2,-6],[-2,-6],[-7,-6],[-4,-2],[-13,-8]],[[5346,8928],[-9,-8],[-6,-9],[-3,-2],[-4,-2],[-6,0],[-38,6],[-5,3],[-2,3],[1,3],[-1,3],[-2,2],[-3,2],[-4,1],[-4,1],[-6,0],[-6,-2],[-9,-5],[-4,-4],[-3,-3],[-1,-3],[-4,-2],[-4,0],[-6,3],[-3,3],[-1,2],[0,3],[0,3],[-1,3],[-2,2],[-3,2],[-6,4],[-7,2],[-4,0],[-3,-2],[-4,-6],[-3,-4],[-4,-3],[-5,-2],[-14,-2],[-7,-2],[-7,-4],[-27,-20],[-7,-3],[-15,2]],[[5094,8893],[-6,11],[-4,3],[-14,9],[-4,2],[-4,1],[-4,0],[-4,-1],[-10,-4],[-4,-1],[-4,0],[-30,11],[-3,3],[-3,4],[-2,7],[-22,41],[-2,7],[-1,5],[-2,4],[-3,3],[-8,4],[-13,3],[-3,1],[-18,14],[-4,3],[-4,1],[-9,1],[-4,3],[-2,6],[-4,27],[-5,17],[-10,22]],[[4884,9100],[-3,7],[10,11],[4,6],[3,5],[2,3],[2,3],[3,2],[3,2],[3,1],[21,5],[7,2],[5,4],[3,2],[1,2],[3,4],[0,6],[0,8],[-3,17],[-3,7],[-3,5],[-16,9],[-6,4],[-2,2],[-2,3],[-1,3],[-1,12],[-1,6],[-3,3],[-5,1],[-9,0],[-5,1],[-2,2],[-2,2],[-1,3],[-2,3],[-2,2],[-4,1],[-19,0],[-5,1],[-3,2],[-21,13],[-13,10],[-2,3],[-3,5],[-1,3],[2,4],[5,6],[14,14],[8,7],[13,7],[43,16],[7,4],[17,17],[27,35],[2,6]],[[5863,8896],[-5,-17]],[[5858,8879],[-7,3],[-20,2],[-14,-9],[-8,-19],[3,-16],[22,-3],[-30,-11],[-4,-4],[-5,-5],[-23,-3],[-10,-4],[-14,-11],[-20,-11],[-22,-5],[-21,7],[12,2],[15,5],[13,6],[6,7],[-8,15]],[[5756,9069],[11,-9],[4,-3],[1,0],[1,-1],[0,-1],[0,-1],[23,-19],[25,2],[27,9],[25,4],[4,1],[14,-17],[-6,-17],[-6,-17],[-7,-12],[-26,-42],[-2,-29],[7,-10],[6,-8],[6,-3]],[[5863,8896],[17,-6],[29,-3],[14,-3],[33,-19],[8,-4],[58,-19],[67,-81],[9,-7],[13,-5],[7,-1],[1,-1],[1,-1],[-7,-11],[-16,-15],[-17,-15],[-39,-3],[-34,13],[-41,-3],[6,7],[9,11],[23,0],[25,-2],[18,3],[-11,2],[-7,6],[-8,10],[-32,12],[16,5],[-4,15],[-12,16],[-11,11],[-66,50],[-16,9],[-38,12]],[[4924,9646],[-21,-9],[-11,-7],[-4,-5],[-3,-2],[-4,-2],[-16,-6],[-5,-3],[-1,-3],[1,-7],[-1,-3],[-3,-2],[-6,-1],[-9,1],[-5,2],[-5,2],[-2,2],[-4,1],[-4,1],[-6,0],[-6,-2],[-9,-5],[-8,-3],[-9,-2],[-41,-3],[-13,-4],[-20,-9],[-5,-1],[-3,3],[-2,7],[-2,3],[-18,22],[-3,1],[-4,2],[-19,2],[-7,3],[-33,20],[-4,0],[-4,-1],[-5,-6],[-2,-4],[-1,-4],[-1,-12],[-2,-7],[-5,-13],[-6,-12],[-8,-11],[-11,-10],[-2,-3],[-2,-4],[-2,-10],[-1,-4],[-2,-3],[-2,-2],[-2,-3],[-3,-2],[-14,-3],[-129,-18],[-16,-9]],[[4389,9498],[-7,16],[-10,7],[-9,-4],[-9,-8],[-10,-6],[-53,3],[-27,-5],[-20,-12],[-16,-18],[-38,-75],[-7,-9],[-8,-6],[-20,-10],[-13,-3],[-40,7],[-12,-2],[-6,-5],[-5,-8],[-7,-8],[-9,-4],[-21,-2],[-9,-3],[-9,-8],[-3,-9],[-1,-10],[-4,-10],[-15,-11],[-12,6],[-11,10],[-12,5],[-9,-4],[-26,-25],[-38,-24],[-20,-7],[-22,3],[-14,8],[-11,11],[-7,15],[2,15],[39,48],[-1,6],[11,106],[-4,20],[-6,10],[-8,1],[-28,-14],[-12,-2],[-11,2],[-12,4],[-27,26],[-25,-7],[1,-24],[6,-26],[-11,-10],[-11,4],[-22,19],[-12,5],[-132,-41],[-36,14],[-18,24],[-11,8],[-15,0],[-73,-30],[-28,4]],[[3230,9535],[5,6],[7,21],[1,22],[-7,17],[-17,10],[-36,3],[-15,13],[-7,16],[4,8],[9,6],[8,11],[2,12],[-1,10],[3,7],[15,7],[10,11],[-2,12],[-6,12],[-2,13],[18,16],[5,5],[3,8],[5,28],[27,-16],[35,-3],[85,17],[15,1],[13,-2],[64,-27],[8,-9],[-4,-6],[-18,-11],[-4,-4],[5,-8],[9,0],[17,4],[10,-2],[24,-10],[9,0],[15,3],[9,0],[8,-3],[14,-8],[9,-3],[8,1],[28,6],[14,2],[29,-2],[15,-4],[12,1],[11,9],[19,23],[4,2],[9,3],[4,3],[1,4],[-1,9],[1,4],[16,26],[8,30],[7,11],[55,38],[15,6],[58,14],[59,7],[30,-5],[26,-9],[25,-1],[29,19],[0,1],[6,6],[8,4],[8,2],[15,-3],[5,-2],[5,-3],[5,-5],[7,-3],[7,-1],[8,2],[8,2],[0,1],[1,0],[24,5],[20,1],[43,-6],[2,-1],[6,0],[6,1],[16,-1],[27,-15],[16,-4],[10,2],[16,9],[9,4],[39,5],[28,16],[36,13],[37,9],[60,2],[85,32],[14,2],[40,5],[20,-5],[0,-11],[-1,-11],[-18,-17],[-50,-20],[-9,-16],[5,-8],[4,-10],[5,-20],[6,-9],[5,-9],[0,-7],[-12,-9],[9,-3],[20,-2],[9,-3],[9,-7],[5,-6],[5,-4],[12,-3],[35,-1],[13,-6],[8,-19],[0,-11],[-2,-6],[-3,-6],[-3,-10],[0,-11],[2,-6],[5,-3],[8,-4],[18,-5],[17,-2],[14,-6],[7,-19],[16,-28],[29,-18],[34,-10],[21,-2]],[[4389,9498],[1,-18],[8,-4],[23,-4],[8,-2],[7,-4],[2,-2],[2,-2],[2,-3],[0,-4],[-1,-4],[-6,-5],[-4,-3],[-8,-3],[-5,-4],[-3,-2],[-2,-2],[-2,-5],[-3,-6],[-4,-26],[-2,-3],[-4,-3],[-14,-1],[-4,-1],[-16,-8],[-3,-2],[-1,-4],[1,-5],[2,-4],[2,-3],[31,-25],[4,-5],[2,-2],[2,-3],[0,-5],[-2,-14],[2,-5],[3,-3],[4,-1],[4,0],[20,0],[5,0],[3,-2],[3,-2],[3,-5],[2,-2],[4,-2],[8,-2],[3,-2],[2,-1],[1,-1],[-6,-14],[-1,-5],[1,-5],[1,-2],[3,-2],[6,-4],[25,-10],[3,-2],[3,-2],[1,-3],[0,-4],[-3,-3],[-8,-4],[-11,-3],[-5,-3],[-6,-4],[-18,-19],[-3,-6],[-4,-3],[-4,-3],[-11,-4],[-36,-9],[-17,-8],[-8,-2],[-10,-1],[-46,0],[-27,-4],[-5,-1],[-3,-4],[-3,-7],[1,-9],[1,-6],[3,-7],[1,-3],[-1,-4],[-5,-4],[-7,-5],[-3,-4],[-2,-7],[-3,-22],[3,-17]],[[4265,9050],[-26,-8],[-14,-1],[-20,1],[-8,2],[-4,1],[-2,2],[-3,3],[-2,2],[-5,11],[-1,1],[-4,5],[-6,3],[-3,2],[-3,1],[-5,1],[-4,1],[-11,0],[-38,-3],[-8,-2],[-38,-19],[-21,-5],[-19,-1],[-5,-2],[-3,-3],[-3,-7],[0,-4],[0,-4],[4,-5],[0,-3],[-1,-3],[-6,-5],[-5,-4],[-5,-7],[-4,-3],[-7,-1],[-4,0],[-4,2],[-6,4],[-3,2],[-2,2],[-2,2],[-2,2],[-4,1],[-4,0],[-3,-1],[-3,-2],[-11,-9],[-13,-6],[-3,-3],[-4,-5],[-4,-11],[-6,-11],[-48,-63],[-2,-3],[1,-4],[2,-7],[0,-3],[-2,-2],[-9,-4],[-4,-2],[-2,-3],[1,-4],[2,-10],[0,-3],[-1,-3],[-31,-38],[-14,-10]],[[3800,8804],[-15,1],[-41,10],[-5,1],[-4,-1],[-9,-1],[-5,0],[-7,1],[-9,3],[-5,-1],[-4,-1],[-11,-12],[-3,-2],[-3,-2],[-3,-2],[-3,0],[-14,2],[-4,0],[-3,-2],[-5,-5],[-2,-2],[-4,-2],[-4,0],[-4,0],[-6,3],[-6,6],[-12,14],[-8,5],[-6,2],[-8,-1],[-4,2],[-2,4],[1,7],[4,17],[0,4],[1,2],[1,3],[2,3],[2,3],[11,8],[2,2],[2,4],[-1,5],[-3,9],[-2,5],[-4,6],[-4,3],[-33,15]],[[4799,8343],[-29,-17],[-1,-10],[-4,-4],[-12,-7],[-32,-10],[-33,5],[-21,-24],[-13,-25],[-27,8],[-34,22],[-30,26],[-9,19],[-56,-2]],[[4498,8324],[4,10],[3,18],[4,8],[10,5],[92,13],[23,-1],[23,-9],[7,22],[35,24],[-2,24]],[[4697,8438],[2,12],[-4,9],[17,-5],[3,-9],[0,-12],[3,-15],[-9,-3],[-2,-5],[3,-5],[8,-5],[-3,-13],[8,-10],[14,-6],[16,-1],[-2,4],[-1,0],[-3,2],[12,7],[19,13],[9,4],[-7,-13],[5,-13],[9,-12],[5,-12],[0,-7]],[[4871,8572],[20,-13],[-11,4],[-11,2],[-24,0],[-46,-64],[-1,5],[7,16],[20,29],[17,16],[14,8],[15,-3]],[[4825,8575],[-12,-6],[-14,3],[-4,11],[11,14],[15,0],[14,-8],[-2,-10],[-8,-4]],[[4862,8588],[-9,-3],[-9,7],[13,4],[6,2],[4,4],[10,7],[4,-4],[-8,-10],[-11,-7]],[[5449,8763],[-9,-9],[-20,-4],[-67,-2],[-31,-5],[-137,-65],[-142,-49],[-83,-22],[-14,-9],[-7,-3],[-31,-6],[-23,-10],[-11,-2],[6,13],[10,11],[5,9],[-4,8],[8,-1],[6,2],[3,4],[0,8],[6,0],[4,-8],[3,-3],[5,0],[5,4],[-11,12],[9,-1],[9,1],[9,2],[1,-2],[1,1],[3,-2],[2,-4],[1,0],[-3,-1],[-9,1],[0,-7],[19,2],[4,10],[1,12],[8,6],[14,1],[13,4],[9,8],[7,11],[-10,-3],[-22,-11],[-6,-1],[-16,12],[-6,8],[-3,12],[-18,-7],[-23,-14],[-14,-16],[8,-10],[0,-6],[-14,1],[-14,9],[-6,-4],[-6,0],[-6,18],[-10,-14],[5,-8],[28,-8],[0,-5],[-10,-5],[-15,-1],[-11,3],[2,8],[-27,0],[-35,-13],[-31,-22],[-16,-24],[0,-5],[5,0],[-8,-8],[-3,-8],[2,-8],[9,-6],[-8,-9],[-2,-6],[1,-6],[-3,-9],[-6,-3],[-8,0],[-4,-3],[7,-11],[-9,-12],[-4,-9],[-6,-7],[-18,-2],[-11,4],[-10,5],[-7,-3],[-4,-18]],[[4655,8453],[-38,23],[-18,7],[-39,-10],[-14,9],[-2,15],[14,15],[-29,11],[-14,9],[-6,12],[2,5],[5,5],[9,7],[10,4],[8,2],[7,7],[2,20],[-30,-1],[-2,0],[-3,2],[-2,2],[-1,2],[0,8],[19,37],[6,6],[12,9],[3,4],[2,6],[1,17],[2,5],[4,3],[26,4],[11,7],[7,12]],[[4607,8717],[16,3],[65,-15],[7,-7],[12,-22],[7,-7],[9,-5],[11,-3],[10,0],[14,6],[11,22],[16,5],[9,1],[24,9],[7,0],[19,-7],[18,-3],[19,2],[14,10],[1,20],[-3,11],[0,9],[6,5],[26,3],[8,9],[6,11],[9,10],[20,8],[69,0],[8,3],[15,6],[26,5],[7,11],[0,15],[-7,32],[1,8],[7,21]],[[3867,8291],[102,-13],[22,-22],[23,-9],[34,11],[16,23],[-29,25],[5,7],[2,2]],[[4042,8315],[22,-5],[28,-9],[8,-4],[7,0],[36,15],[23,0],[30,-3],[29,-6],[22,-9],[26,3],[20,-1],[30,-10],[17,8],[22,18],[33,9],[103,3]],[[4799,8343],[1,-22],[5,-33],[-8,2],[-10,4],[1,6],[-1,8],[0,4],[-8,-19],[-1,-16],[9,-8],[18,1],[-3,3],[-1,3],[-2,6],[17,-11],[10,-12],[8,-13],[11,-11],[0,-6],[-6,-1],[-4,-2],[-3,-2],[-4,-2],[11,-12],[12,14],[3,10],[-5,11],[-10,13],[12,-8],[15,-6],[10,-6],[-2,-9],[13,-11],[7,-4],[9,-4],[16,-16],[18,-13],[11,6],[-2,0],[-6,0],[-3,0],[0,6],[14,1],[12,-4],[9,-6],[6,-9],[-1,-8],[-9,-9],[4,-6],[-7,-8],[-3,-5],[-2,-5],[-5,0],[-7,-1],[-3,-9],[-2,-28],[-5,-14],[-11,-14],[-24,-22],[-2,4],[-3,9],[-6,9],[-7,8],[13,19],[3,11],[-4,10],[-9,3],[-10,-4],[-7,-8],[-3,-5],[-9,-15],[-1,-8],[21,-6],[-1,-7],[-6,-6],[-10,-3],[0,-6],[6,-1],[11,-3],[6,-1],[-6,-15],[-16,-8],[-3,0]],[[4655,8453],[9,-8],[7,-18],[10,-4],[9,5],[7,10]],[[4042,8315],[6,9],[-1,8],[-10,20],[-10,47],[4,19],[20,5],[11,-1],[13,0],[13,3],[11,5]],[[4099,8430],[47,-17],[50,-2],[6,3],[5,5],[2,6],[-1,6],[-5,6],[-16,6],[-6,4],[-3,10],[8,14],[17,8],[13,9],[-1,19],[-11,12],[-1,5],[5,11],[61,44],[8,10],[3,10],[2,4],[5,3],[5,1],[12,-1],[6,2],[5,6],[1,8],[-2,40],[-4,11],[-7,7],[-9,4],[-11,-1],[-29,-15],[-11,-2],[9,32],[1,8],[-4,5],[-12,8],[-5,5],[-1,7],[1,10],[3,8],[6,4],[12,2],[9,5],[25,24],[11,3],[82,6]],[[4380,8793],[7,-3],[19,-2],[15,-9],[11,-14],[7,-17],[11,-8],[41,-13],[13,2],[8,4],[16,6],[4,5],[6,10],[9,4],[22,-1],[18,-4],[9,-10],[11,-26]],[[3800,8804],[17,-23],[2,-24],[3,-6],[4,-6],[6,-4],[5,-4],[8,-1],[13,3],[7,-1],[17,-11],[8,-16],[10,-38],[26,-31],[11,-5],[12,-3],[11,-5],[7,-11],[1,-12],[-3,-24],[27,-73],[3,-5],[5,-2],[43,-8],[10,-6],[5,-7],[7,-16],[6,-5],[21,-11],[7,-8],[0,-11]],[[4265,9050],[9,-4],[9,-4],[8,-7],[6,-8],[3,-13],[1,-4],[11,-5],[28,-5],[9,-7],[0,-5],[-6,-9],[-1,-7],[3,-6],[4,-3],[12,-3]],[[4361,8960],[-8,-10],[-30,-12],[-10,-11],[0,-7],[1,-7],[2,-6],[4,-6],[8,-7],[7,-3],[19,-1],[11,-3],[10,-8],[8,-11],[4,-11],[0,-10],[-10,-14],[-4,-9],[0,-7],[7,-24]],[[4361,8960],[19,17],[9,-1],[8,-8],[16,-6],[54,2],[10,5],[4,9],[4,23],[5,12],[7,11],[10,8],[12,4],[63,-4],[13,6],[17,20],[10,8],[13,2],[42,-3],[13,2],[37,15],[58,45],[22,7],[77,-34]],[[4924,9646],[25,-3],[26,-13],[14,-4],[12,-1],[49,4],[41,-3],[2,0],[6,-2],[16,-8],[7,-3],[8,0],[14,4],[6,1],[8,-2]]],"transform":{"scale":[0.0011915889253925455,0.0011597130776077687],"translate":[6.602728312000067,35.489243882]}};
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
