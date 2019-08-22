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
  Datamap.prototype.jpnTopo = {"type":"Topology","objects":{"jpn":{"type":"GeometryCollection","geometries":[{"type":"MultiPolygon","properties":{"name":null},"id":"-99","arcs":[[[0]],[[1]],[[2]],[[3]],[[4]],[[5]],[[6]],[[7]],[[8]],[[9]],[[10]],[[11]]]},{"type":"MultiPolygon","properties":{"name":"Hiroshima"},"id":"JP.HS","arcs":[[[12]],[[13]],[[14]],[[15]],[[16]],[[17]],[[18]],[[19]],[[20]],[[21]],[[22]],[[23]],[[24]],[[25,26,27,28,29]]]},{"type":"MultiPolygon","properties":{"name":"Okayama"},"id":"JP.OY","arcs":[[[30]],[[31,32,-27,33]]]},{"type":"MultiPolygon","properties":{"name":"Shimane"},"id":"JP.SM","arcs":[[[34,-30,35,36]],[[37]],[[38]],[[39]],[[40]],[[41]]]},{"type":"Polygon","properties":{"name":"Tottori"},"id":"JP.TT","arcs":[[-34,-26,-35,42,43]]},{"type":"MultiPolygon","properties":{"name":"Yamaguchi"},"id":"JP.YC","arcs":[[[44]],[[45]],[[46]],[[47]],[[48]],[[49]],[[50]],[[51]],[[52]],[[53]],[[54]],[[55]],[[56]],[[57]],[[58]],[[59]],[[-29,60,-36]],[[61]]]},{"type":"MultiPolygon","properties":{"name":"Saga"},"id":"JP.SG","arcs":[[[62]],[[63,64,65,66]],[[67]],[[68]],[[69]]]},{"type":"MultiPolygon","properties":{"name":"Fukuoka"},"id":"JP.FO","arcs":[[[70]],[[71]],[[72]],[[73]],[[74,75,76,-64,77]],[[78]],[[79]]]},{"type":"MultiPolygon","properties":{"name":"Kumamoto"},"id":"JP.KM","arcs":[[[80]],[[81]],[[82]],[[83]],[[84]],[[85]],[[86]],[[87]],[[88]],[[89]],[[90]],[[91]],[[92]],[[93,94,95,-76,96]]]},{"type":"MultiPolygon","properties":{"name":"Miyazaki"},"id":"JP.MZ","arcs":[[[97]],[[98]],[[99,100,-94,101]]]},{"type":"MultiPolygon","properties":{"name":"Ehime"},"id":"JP.EH","arcs":[[[102]],[[103]],[[104]],[[105]],[[106]],[[107]],[[108]],[[109]],[[110]],[[111]],[[112]],[[113]],[[114]],[[115]],[[116]],[[117]],[[118,119,120,121]],[[122]],[[123]],[[124]],[[125]],[[126]],[[127]]]},{"type":"MultiPolygon","properties":{"name":"Kagawa"},"id":"JP.KG","arcs":[[[128]],[[129]],[[130,-119,131]],[[132]],[[133]],[[134]],[[135]],[[136]],[[137]],[[138]],[[139]],[[140]]]},{"type":"MultiPolygon","properties":{"name":"Kochi"},"id":"JP.KC","arcs":[[[141]],[[142,-121,143]]]},{"type":"MultiPolygon","properties":{"name":"Oita"},"id":"JP.OT","arcs":[[[144]],[[145]],[[146]],[[147]],[[148]],[[149]],[[150]],[[-102,-97,-75,151]],[[152]]]},{"type":"MultiPolygon","properties":{"name":"Tokushima"},"id":"JP.TS","arcs":[[[153]],[[-144,-120,-131,154]]]},{"type":"MultiPolygon","properties":{"name":"Aichi"},"id":"JP.AI","arcs":[[[155]],[[156]],[[157]],[[158,159,160,161,162]]]},{"type":"Polygon","properties":{"name":"Gifu"},"id":"JP.GF","arcs":[[163,-163,164,165,166,167,168]]},{"type":"MultiPolygon","properties":{"name":"Ishikawa"},"id":"JP.IS","arcs":[[[169]],[[170,-168,171,172]]]},{"type":"MultiPolygon","properties":{"name":"Mie"},"id":"JP.ME","arcs":[[[173]],[[174]],[[175,176,177,178,179,-165,-162]]]},{"type":"Polygon","properties":{"name":"Nagano"},"id":"JP.NN","arcs":[[180,181,182,183,-159,-164,184,185]]},{"type":"Polygon","properties":{"name":"Shizuoka"},"id":"JP.SZ","arcs":[[186,187,-160,-184,188]]},{"type":"Polygon","properties":{"name":"Toyama"},"id":"JP.TY","arcs":[[-185,-169,-171,189,190]]},{"type":"MultiPolygon","properties":{"name":"Hokkaido"},"id":"JP.HK","arcs":[[[191]],[[192]],[[193]],[[194]],[[195]],[[196]],[[197]],[[198]],[[199]],[[200]],[[201]]]},{"type":"Polygon","properties":{"name":"Fukui"},"id":"JP.FI","arcs":[[-167,202,203,204,-172]]},{"type":"MultiPolygon","properties":{"name":"Hyōgo"},"id":"JP.HG","arcs":[[[205]],[[206]],[[207]],[[208]],[[209]],[[210,211,212,-32,-44,213]]]},{"type":"Polygon","properties":{"name":"Kyoto"},"id":"JP.KY","arcs":[[-204,214,-179,215,216,-211,217]]},{"type":"Polygon","properties":{"name":"Nara"},"id":"JP.NR","arcs":[[-178,218,219,-216]]},{"type":"MultiPolygon","properties":{"name":"Osaka"},"id":"JP.OS","arcs":[[[220]],[[-220,221,222,-212,-217]]]},{"type":"Polygon","properties":{"name":"Shiga"},"id":"JP.SH","arcs":[[-166,-180,-215,-203]]},{"type":"MultiPolygon","properties":{"name":"Wakayama"},"id":"JP.WK","arcs":[[[223]],[[-219,-177,224,-222]]]},{"type":"Polygon","properties":{"name":"Chiba"},"id":"JP.CH","arcs":[[225,226,227,228]]},{"type":"Polygon","properties":{"name":"Ibaraki"},"id":"JP.IB","arcs":[[229,-229,230,231,232,233]]},{"type":"Polygon","properties":{"name":"Kanagawa"},"id":"JP.KN","arcs":[[234,-187,235,236]]},{"type":"Polygon","properties":{"name":"Saitama"},"id":"JP.ST","arcs":[[-231,-228,237,238,-182,239]]},{"type":"Polygon","properties":{"name":"Tochigi"},"id":"JP.TC","arcs":[[-233,240,241]]},{"type":"MultiPolygon","properties":{"name":"Tokyo"},"id":"JP.TK","arcs":[[[242]],[[243]],[[244]],[[245]],[[246]],[[247]],[[248]],[[249]],[[250]],[[251]],[[252]],[[253]],[[254]],[[255]],[[256]],[[257]],[[258]],[[259]],[[260]],[[261]],[[262]],[[263]],[[264]],[[265]],[[266]],[[267]],[[268]],[[269]],[[270]],[[271]],[[-227,272,-237,273,-238]]]},{"type":"Polygon","properties":{"name":"Yamanashi"},"id":"JP.YN","arcs":[[-239,-274,-236,-189,-183]]},{"type":"Polygon","properties":{"name":"Akita"},"id":"JP.AK","arcs":[[274,275,276,277,278]]},{"type":"Polygon","properties":{"name":"Aomori"},"id":"JP.AO","arcs":[[279,-279,280]]},{"type":"Polygon","properties":{"name":"Fukushima"},"id":"JP.FS","arcs":[[281,-234,-242,282,283,284,285]]},{"type":"Polygon","properties":{"name":"Iwate"},"id":"JP.IW","arcs":[[286,-275,-280,287]]},{"type":"MultiPolygon","properties":{"name":"Miyagi"},"id":"JP.MG","arcs":[[[288]],[[289]],[[290]],[[291]],[[292]],[[-286,293,-276,-287,294]]]},{"type":"MultiPolygon","properties":{"name":"Niigata"},"id":"JP.NI","arcs":[[[295]],[[296]],[[-284,297,-186,-191,298,299]]]},{"type":"Polygon","properties":{"name":"Yamagata"},"id":"JP.YT","arcs":[[-294,-285,-300,300,-277]]},{"type":"MultiPolygon","properties":{"name":"Nagasaki"},"id":"JP.NS","arcs":[[[301]],[[302]],[[303]],[[304]],[[305]],[[306]],[[307]],[[308]],[[309]],[[310]],[[311]],[[312]],[[313]],[[314]],[[315]],[[316]],[[317]],[[318]],[[319]],[[320]],[[321]],[[322]],[[323]],[[324]],[[325]],[[326]],[[327]],[[328]],[[329]],[[-66,330]],[[331]],[[332]],[[333]],[[334]],[[335]],[[336]],[[337]],[[338]],[[339]],[[340]],[[341]],[[342]]]},{"type":"MultiPolygon","properties":{"name":"Kagoshima"},"id":"JP.KS","arcs":[[[343]],[[344]],[[345]],[[346]],[[347]],[[348]],[[349]],[[350]],[[351]],[[352]],[[353]],[[354]],[[355]],[[356]],[[357]],[[358]],[[359]],[[360]],[[361]],[[-101,362,-95]]]},{"type":"MultiPolygon","properties":{"name":"Okinawa"},"id":"JP.ON","arcs":[[[363]],[[364]],[[365]],[[366]],[[367]],[[368]],[[369]],[[370]],[[371]],[[372]],[[373]],[[374]],[[375]],[[376]],[[377]],[[378]],[[379]],[[380]],[[381]],[[382]],[[383]],[[384]],[[385]],[[386]],[[387]],[[388]],[[389]],[[390]],[[391]],[[392]],[[393]],[[394]],[[395]],[[396]],[[397]],[[398]],[[399]],[[400]],[[401]],[[402]],[[403]]]},{"type":"Polygon","properties":{"name":"Gunma"},"id":"JP.GM","arcs":[[-283,-241,-232,-240,-181,-298]]}]}},"arcs":[[[1743,3704],[1,-3],[-1,0],[-1,-2],[-1,3],[1,1],[0,3],[-1,1],[0,2],[2,0],[2,1],[-2,-6]],[[1757,3731],[3,-1],[3,1],[-2,-7],[-3,1],[-3,-1],[-1,2],[2,1],[1,4]],[[3077,4048],[-1,-1],[-1,0],[0,3],[2,1],[1,-1],[-1,-2]],[[3079,4078],[-2,-2],[-1,1],[-2,-1],[1,4],[4,0],[0,-2]],[[3415,4697],[-3,-3],[-3,5],[3,1],[2,-2],[1,-1]],[[3309,4752],[-1,-3],[-2,1],[-1,8],[-1,1],[1,3],[4,7],[2,2],[2,1],[2,-3],[0,-6],[-6,-6],[-1,-2],[1,-3]],[[3891,4768],[-1,-2],[-2,-2],[-3,1],[0,3],[1,1],[1,-1],[3,3],[2,2],[1,-1],[-1,-1],[-1,-2],[0,-1]],[[3903,4774],[-5,-2],[-1,1],[-1,0],[3,2],[4,0],[0,-1]],[[3386,4796],[1,-3],[-3,0],[-2,0],[-1,2],[-1,-1],[-2,4],[1,1],[4,1],[3,-4]],[[3427,4799],[-2,-1],[-2,4],[4,3],[3,0],[0,-1],[-1,-3],[-2,-2]],[[3418,4818],[-1,-3],[0,-3],[1,0],[1,-1],[1,1],[1,0],[0,-3],[-1,-2],[-4,0],[-2,1],[-3,4],[-4,5],[2,2],[1,-1],[0,1],[3,1],[1,2],[3,0],[2,-1],[1,-2],[-1,0],[-1,-1]],[[5350,7049],[-4,3],[1,2],[0,1],[2,3],[3,1],[2,-3],[-2,-1],[-2,-2],[0,-3],[0,-1]],[[3079,4622],[-1,-2],[-1,1],[1,2],[1,0],[-1,4],[2,2],[2,2],[1,1],[1,0],[1,0],[2,-1],[-2,-2],[-1,-4],[-2,-1],[-1,-2],[-2,0]],[[3056,4644],[-1,-2],[-5,2],[-2,3],[2,3],[3,-2],[2,-2],[1,-2]],[[3092,4664],[-2,-5],[-2,0],[-1,4],[1,3],[1,3],[1,2],[2,-7]],[[3044,4719],[5,-3],[2,0],[1,-5],[-6,-7],[-3,2],[-1,3],[0,8],[2,2]],[[3095,4693],[1,-6],[8,5],[1,-9],[-3,-11],[-5,-2],[-7,5],[-18,-1],[-7,4],[6,8],[8,5],[4,7],[-5,12],[4,5],[4,3],[4,1],[3,0],[3,-3],[-1,-2],[0,-2],[-1,-2],[-2,0],[2,-6],[1,-5],[0,-6]],[[3176,4717],[-6,-5],[-3,3],[3,9],[6,-7]],[[3190,4711],[-9,-4],[-3,1],[-1,3],[0,3],[1,4],[4,5],[5,1],[1,2],[1,0],[1,1],[2,1],[1,-1],[0,-3],[4,-2],[-2,-6],[-5,-5]],[[3021,4725],[-4,-3],[-2,2],[-2,0],[0,4],[4,1],[3,-1],[1,-3]],[[3164,4719],[-2,-4],[-3,-3],[-2,-1],[-1,1],[0,3],[-2,1],[-3,0],[-8,5],[-3,4],[2,5],[5,1],[6,-2],[3,-1],[6,-3],[2,-6]],[[3136,4719],[0,-2],[-2,0],[-2,-2],[-1,2],[-2,1],[-2,-2],[0,4],[0,4],[5,5],[3,2],[2,-3],[1,-4],[-2,-5]],[[3219,4764],[-2,-10],[-3,-9],[0,-5],[-4,-4],[-7,-2],[-7,0],[-4,3],[-2,6],[1,5],[2,3],[1,0],[10,5],[3,0],[4,3],[4,7],[2,3],[2,-5]],[[3014,4750],[-6,-3],[-3,3],[-1,5],[7,11],[4,7],[5,3],[4,3],[3,-1],[2,-4],[1,-4],[0,-2],[-7,-8],[-9,-10]],[[3061,4777],[0,-2],[-2,1],[-1,-1],[-3,2],[-2,0],[0,1],[2,1],[2,3],[1,2],[0,3],[2,1],[2,-2],[0,-4],[-1,-5]],[[3282,5133],[12,-2],[20,-1],[12,-4]],[[3326,5126],[12,-25],[2,-14],[-1,-16],[0,-11],[1,-15],[2,-9],[2,-7],[13,-23],[1,-6],[0,-6],[0,-8],[0,-10],[0,-10],[2,-9],[7,-18],[0,-19],[2,-7],[2,-6],[7,-13],[5,-11],[1,-6],[1,-4],[-1,-9],[-1,-7]],[[3383,4857],[-4,0],[-4,-3],[-1,-7],[2,-3],[-3,-10],[-23,-35],[-5,-6],[-9,-5],[-5,-2],[-4,1],[-1,4],[1,3],[4,2],[5,1],[3,2],[3,8],[-3,5],[-7,3],[-8,0],[0,3],[6,6],[-4,8],[-6,3],[-6,-23],[-5,-6],[-6,-5],[-4,-6],[7,-6],[2,-9],[-2,-9],[-6,-4],[-2,1],[-4,5],[-2,0],[-1,-1],[-4,-4],[-6,-3],[-7,-9],[-3,-2],[-6,3],[-2,9],[1,18],[1,0],[4,5],[5,8],[3,3],[1,-4],[0,-7],[-1,-6],[6,2],[5,15],[7,2],[0,3],[-5,6],[-6,4],[-4,0],[-3,0],[-3,1],[-3,2],[-5,-3],[2,-15],[-8,-9],[-14,-4],[-34,-4],[-9,-5],[-10,-8],[-5,11],[-6,-3],[-6,-9],[-7,-5],[-5,-2],[0,-3],[3,-4],[2,-5],[-2,-4],[-5,-1],[-10,0],[-7,-3],[-15,-13],[-10,0],[-1,2],[-1,3],[-1,3],[-1,1],[-3,-1],[-2,-2],[0,-2],[-2,-1],[-8,-6],[-4,0],[-3,6],[5,6],[-3,6],[-6,6],[-4,12],[-4,6],[-1,2],[0,6],[1,4],[0,4],[-1,5],[2,1],[4,2],[2,1],[-1,4],[-3,4],[-7,4],[-5,-3],[-6,-3],[-6,0],[-12,9],[-7,-1],[-12,-8],[-11,-10],[-29,-41],[3,-7],[2,-9],[1,-7]],[[2996,4725],[-3,1],[-10,4],[-9,7],[-4,1],[-5,5],[-6,9],[-18,52],[-3,35],[-3,11]],[[2935,4850],[-1,7],[-2,4],[0,6],[2,6],[5,9],[10,12],[5,11],[2,8],[1,8],[1,6],[3,7],[5,9],[1,5],[-1,5],[-2,6],[1,6],[3,5],[17,15],[7,7],[4,5],[2,4],[4,-1],[2,-3],[3,-3],[5,0],[5,4],[15,5],[5,-1],[4,-3],[3,0],[4,2],[4,5],[3,3],[5,0],[5,-2],[5,-2],[12,-1],[5,1],[7,4],[13,8],[27,10],[3,2],[0,6],[-2,5],[-4,3],[-4,3],[-2,2],[0,2],[0,3],[3,4],[6,9],[4,4],[4,3],[6,3],[5,3],[6,5],[20,31],[6,13],[4,5],[4,3],[7,2],[21,-4],[5,0],[8,5],[5,1],[9,-7],[5,-2],[5,1],[14,3],[10,-2]],[[3491,4833],[-2,-2],[-3,1],[-1,3],[0,2],[1,0],[2,-2],[2,0],[1,-2]],[[3690,5209],[0,-6],[-2,-14],[1,-7],[1,-9],[-1,-5],[-2,-5],[-4,-4],[-4,-5],[-16,-33],[-15,-18],[-1,-1],[1,-3],[0,-5],[0,-7],[-2,-15],[1,-18],[1,-11],[-2,-10],[-1,-7],[1,-7],[9,-10],[6,-10],[2,-4],[1,-4],[0,-8],[0,-6],[-3,-10]],[[3661,4967],[-9,2],[-10,2],[-8,5],[-4,-1],[2,-7],[4,-2],[16,-4],[-2,-1],[-6,-2],[-3,-1],[-6,-11],[-2,-2],[-2,-1],[-5,-4],[-6,-1],[-3,-2],[-4,-4],[2,-2],[2,-1],[3,1],[4,2],[-4,-10],[-10,-9],[-11,-5],[-10,-2],[-4,2],[-7,9],[-6,2],[-11,0],[-5,-1],[-8,-6],[-6,-3],[-4,-4],[2,-8],[4,-3],[5,4],[8,12],[6,2],[6,1],[5,-1],[3,-6],[0,-8],[-4,-5],[-5,-4],[-4,-5],[1,-2],[1,-4],[-9,4],[-5,-11],[-4,-15],[-6,-10],[-25,5],[-12,0],[2,-12],[-11,3],[-4,9],[-4,12],[-8,8],[-2,-2],[-2,3],[-2,4],[-1,5],[-2,-3],[-5,2],[-5,-2],[-5,-5],[-9,-4],[-15,-9],[-3,-3],[-1,-3],[-2,-3],[-2,-1],[-6,-2],[-3,-2],[-1,-2],[-2,-1],[-20,-10],[12,18],[5,9],[-7,5],[-4,-2],[-7,-5],[-3,-3],[-5,1]],[[3326,5126],[5,7],[3,3],[5,1],[17,9],[6,5],[2,5],[0,4],[0,4],[0,4],[1,4],[3,3],[16,1],[16,7],[2,1],[1,2],[0,3],[0,5],[1,6],[2,5],[3,3],[4,3],[3,3],[2,5],[3,14],[4,12],[2,4],[4,2],[5,1],[41,-13],[7,-3],[5,-4],[4,-4],[9,-13],[4,-2],[3,2],[3,5],[2,5],[2,4],[4,3],[11,6],[3,4],[2,5],[4,4],[6,3],[7,0],[5,-1],[4,-4],[1,-3],[0,-2],[-1,-3],[0,-2],[1,-2],[2,-1],[24,-4],[10,-9],[6,-8],[3,-7],[1,-6],[2,-6],[2,-4],[1,-6],[1,-6],[4,-3],[4,2],[19,9],[7,2],[5,0],[4,-2],[4,1],[5,3],[8,6],[15,11]],[[3323,5352],[-1,0],[-14,-6],[-2,-1],[-1,-3],[1,-2],[1,-1],[4,-4],[1,-1],[1,-2],[1,-2],[1,-4],[1,-2],[2,-6],[3,-4],[8,-8],[4,-2],[10,-5],[1,-1],[0,-1],[1,-1],[0,-2],[0,-3],[-3,-3],[-1,0],[-2,-1],[-1,-4],[-2,-26],[1,-15],[0,-9],[-2,-6],[-7,-6],[-27,-15],[-4,-4],[-4,-4],[1,-5],[2,-4],[1,-6],[-1,-8],[-8,-16],[-6,-26]],[[2935,4850],[-19,-21],[-2,-5],[1,-8],[2,-3],[2,-3],[0,-4],[-1,-3],[-2,-2],[-8,-5],[-2,-1],[-1,-3],[-2,-8],[-2,-5],[-2,-1],[-3,2],[-3,4],[-4,1],[-4,-1],[-16,-6],[-11,-2],[-6,1],[-4,2],[-3,4],[-2,4],[-2,7],[-2,6],[-1,6],[0,4],[2,4],[5,10],[0,3],[-1,3],[-23,6],[-5,4],[-1,5],[1,4],[0,5],[-3,6],[-2,7],[1,7],[3,6],[5,15],[2,3],[1,4],[0,5],[-6,16],[-1,5],[-1,7],[0,4],[1,6],[-1,2],[-1,2]],[[2814,4949],[1,2],[11,-2],[11,2],[14,5],[10,6],[6,3],[6,4],[1,11],[2,4],[2,6],[7,2],[2,3],[7,8],[11,12],[13,11],[7,14],[5,5],[6,-2],[2,6],[1,10],[15,17],[7,7],[8,8],[19,17],[7,10],[11,3],[7,4],[7,6],[4,14],[9,9],[8,6],[3,5],[-1,5],[5,7],[2,7],[19,17],[9,9],[11,6],[1,6],[6,2],[8,5],[14,5],[6,5],[4,9],[4,7],[3,12],[1,8],[-1,6],[-1,7],[-5,3],[-7,6],[-3,6],[4,4],[7,1],[8,3],[6,0],[11,0],[4,1],[2,2],[-3,4],[-6,3],[4,1],[5,2],[7,2],[10,7],[10,5],[9,2],[18,1],[8,2],[8,0],[1,11],[6,1],[7,-1],[6,2],[3,7],[3,6],[4,3],[6,-2],[3,6],[0,6],[4,-2],[5,-6],[7,-7],[5,-3],[11,4],[5,1],[6,4],[2,-2],[-3,-4],[2,-2],[4,-1],[2,2],[6,3],[7,1],[7,1],[5,-4],[-4,-3],[-4,-2],[-4,-2],[-6,-2],[-4,-6]],[[3262,5571],[4,-6],[-5,0],[-12,0],[-2,1],[-1,2],[-1,3],[-1,3],[4,5],[7,-2],[7,-6]],[[3273,5585],[-7,-8],[0,14],[1,14],[4,10],[9,4],[4,-10],[-4,-12],[-7,-12]],[[3277,5620],[-6,-1],[-1,3],[1,3],[6,-5]],[[3253,5628],[6,-2],[5,1],[5,0],[0,-4],[0,-4],[-5,-1],[-5,-2],[-2,-9],[1,-5],[1,-3],[-1,-3],[-3,-3],[-3,0],[-3,1],[-2,2],[-1,2],[0,4],[-1,3],[-1,0],[-3,1],[-4,-3],[1,-5],[4,-8],[-3,-5],[-4,1],[-6,4],[-5,6],[7,10],[14,13],[8,9]],[[3363,5664],[-2,-4],[-5,-3],[-2,5],[-3,1],[-3,-3],[-3,-3],[4,-4],[1,-4],[-1,-4],[-4,-4],[-2,0],[-13,3],[-7,0],[-2,2],[-15,16],[-3,1],[-2,5],[3,29],[4,9],[27,21],[0,-6],[2,-2],[4,-1],[3,-1],[1,-1],[1,-4],[1,-3],[2,-1],[4,-2],[1,-1],[2,-3],[2,-5],[1,-2],[4,-8],[0,-23]],[[3323,5352],[0,-1],[-1,-6],[2,-6],[2,-6],[9,-7],[12,-7],[10,-3],[6,-2],[6,-1],[6,2],[8,16],[16,9],[11,5],[17,5],[17,-5],[32,-9],[58,6],[31,10],[9,-8],[44,8],[21,4],[8,4],[6,5],[4,10],[16,3],[3,1],[3,0],[1,2]],[[3680,5381],[1,-1],[10,-9],[6,-16],[9,-49],[7,-18],[2,-8],[2,-10],[7,-13],[2,-5],[0,-4],[0,-4],[1,-8],[0,-7],[-2,-7],[-4,-6],[-9,-9],[-5,-3],[-4,-1],[-4,2],[-3,2],[-6,2]],[[2968,4510],[-7,-7],[-1,4],[3,4],[1,4],[-1,1],[0,3],[1,2],[1,1],[1,2],[0,2],[2,0],[-2,-4],[1,-2],[0,-2],[-1,-3],[2,-5]],[[2909,4530],[-4,-1],[-3,2],[-1,3],[6,6],[3,2],[5,-5],[-1,-4],[-5,-3]],[[3000,4537],[7,-6],[-1,-2],[-5,-1],[-6,1],[-11,6],[-5,-1],[2,6],[5,4],[5,-1],[6,-3],[3,-3]],[[2925,4572],[0,-4],[0,-2],[-6,2],[-1,2],[2,0],[2,0],[0,5],[2,0],[0,-3],[1,0]],[[2941,4575],[-2,-2],[-1,3],[-1,3],[2,3],[1,-2],[0,-3],[1,-2]],[[3014,4604],[9,-16],[5,1],[4,3],[7,6],[2,0],[5,-1],[2,1],[2,3],[0,5],[2,2],[4,1],[9,-2],[5,1],[-4,-5],[-7,-11],[-3,-1],[-3,2],[-8,-3],[-3,-3],[-1,-3],[0,-12],[-1,-4],[-1,-5],[-4,2],[-7,-1],[-3,2],[-1,4],[1,4],[-1,4],[-3,4],[-2,-3],[-5,4],[-2,-3],[-1,-5],[-1,-3],[-4,0],[-6,2],[-3,-2],[-3,4],[-1,-3],[-2,-1],[-3,-3],[-3,9],[-4,11],[-3,11],[5,11],[8,4],[9,-2],[8,-4],[6,-5]],[[3033,4608],[-1,0],[-4,4],[-1,0],[1,2],[1,3],[2,1],[2,-4],[0,-6]],[[2553,4623],[-1,-1],[1,6],[1,-2],[-1,-3]],[[2874,4632],[0,-5],[2,1],[2,-4],[1,-2],[-2,0],[-3,-4],[-1,-5],[-4,-2],[-3,-5],[-2,-1],[-3,-1],[-1,-1],[0,3],[-1,0],[-3,3],[0,4],[2,3],[2,1],[0,-2],[1,-2],[2,-1],[2,1],[0,3],[2,1],[2,-2],[1,2],[-1,4],[-1,1],[2,2],[1,1],[1,2],[1,2],[1,3]],[[3005,4637],[1,-2],[-3,0],[-1,2],[1,5],[2,-5]],[[2833,4631],[-4,-4],[-1,4],[-2,2],[-2,3],[-1,1],[-3,3],[-1,0],[1,2],[3,4],[0,4],[3,3],[-1,-4],[0,-5],[0,-5],[3,-5],[5,-3]],[[2842,4654],[-2,-3],[-2,0],[-2,-2],[-2,-2],[-4,5],[1,2],[2,1],[2,0],[3,-1],[2,4],[1,1],[2,-2],[0,-2],[-1,-1]],[[2531,4686],[0,-6],[-1,2],[-3,1],[-2,2],[-1,6],[2,-2],[4,-1],[1,-1],[0,-1]],[[2548,4798],[-1,-2],[-3,5],[5,1],[3,3],[2,2],[-1,5],[2,-2],[0,-1],[2,0],[1,-2],[-3,-5],[-2,0],[-3,-1],[-2,-3]],[[2731,4869],[-4,-4],[-1,7],[3,4],[1,-2],[1,-5]],[[2685,4879],[3,-3],[1,1],[1,-1],[1,-2],[-1,-2],[-4,-3],[-1,10]],[[2996,4725],[1,-11],[-2,-11],[-3,-5],[-5,-4],[-4,-7],[0,-20],[3,-19],[1,-16],[-10,-15],[-8,-4],[-5,-1],[-2,-4],[0,-12],[1,-8],[7,-18],[0,-7],[-3,-6],[-15,-9],[-9,-11],[-7,-4],[-4,-1],[1,8],[6,7],[2,2],[2,7],[1,4],[2,-5],[4,-1],[3,4],[2,6],[-1,9],[-4,4],[-4,3],[-3,4],[-6,4],[-20,8],[-7,2],[-2,2],[-8,14],[-4,3],[-9,4],[-3,2],[-7,8],[-6,5],[-6,-2],[-7,-11],[5,0],[0,-3],[-12,0],[-4,2],[0,8],[9,9],[6,7],[-1,3],[-3,1],[-4,4],[-19,9],[-12,-6],[-5,2],[-4,-4],[-10,-5],[-4,-1],[-8,0],[-2,2],[-1,2],[-2,1],[-2,-5],[3,-5],[1,-6],[-2,-5],[-4,-3],[-2,0],[-2,0],[0,2],[-1,3],[-1,4],[-2,0],[-1,-1],[0,-2],[-10,5],[-3,1],[-6,8],[-3,1],[-5,-2],[2,-4],[0,-2],[-2,-4],[0,1],[-4,-4],[0,-3],[-1,-1],[0,-2],[-1,-2],[-3,-1],[-2,0],[-2,3],[-1,3],[-1,3],[-2,-4],[-2,-3],[-2,-1],[-3,2],[3,6],[1,9],[-2,7],[-3,3],[-2,-3],[-9,-20],[-8,-13],[-3,-4],[-16,-13],[-5,0],[-2,6],[-3,-2],[-2,-1],[-3,1],[-1,3],[-1,4],[-1,1],[-2,-2],[-3,-1],[0,-1],[-2,-2],[-2,-3],[-3,-1],[-2,2],[-1,3],[-3,6],[0,5],[2,4],[0,2],[-3,1],[-11,10],[-6,14],[-10,3],[-12,5],[-7,-16],[-15,-20],[-12,-12],[-1,-10],[-4,-4],[-5,4],[-2,4],[-4,3],[0,5],[6,0],[3,11],[0,6],[1,6],[2,6],[-2,5],[-2,3],[2,11],[-3,6],[-8,1],[-1,5],[-2,6],[-2,5],[0,5],[4,8],[4,4],[4,3],[4,4],[3,8],[1,6],[-1,4],[-2,4],[-1,11],[-5,10],[-1,5],[-1,1],[-4,5],[-2,5],[1,3],[2,3],[2,3],[1,15],[1,5],[2,6],[4,-2],[5,-1],[5,1],[2,4],[2,1],[13,3],[5,4],[7,2],[-5,6],[-4,-1],[-13,4],[-3,1],[-2,-4],[-1,-1],[-4,2],[2,5],[3,6],[3,4],[6,5],[4,-2],[4,-4],[0,-5],[3,-2],[4,-1],[4,1],[5,2],[3,2],[4,2],[8,-5],[6,-2],[5,1],[3,-15],[4,-5],[6,0],[2,5],[4,7],[-6,7],[-1,4],[1,5],[6,-2],[5,2],[9,2],[6,2],[4,-4],[5,-10],[-5,1],[-5,5],[-3,1],[-4,-2],[-2,-4],[-2,-6],[-1,-6],[-1,-7],[2,2],[4,4],[2,1],[16,0],[12,4],[4,11],[10,0],[16,4],[-1,14],[5,5],[9,12],[2,4],[-2,9],[2,2],[7,2],[12,11],[5,7],[5,7],[1,5],[1,11],[2,2],[7,-1],[3,0],[0,4],[0,7],[1,9],[6,2],[4,-3],[9,-2],[4,4],[1,4],[1,0]],[[2644,4990],[-3,0],[-1,1],[-2,11],[2,3],[4,-1],[1,-1],[-1,-2],[0,-1],[1,-1],[2,0],[1,-1],[0,-4],[-1,-2],[-3,-2]],[[2267,4418],[-3,-2],[-1,3],[1,3],[-2,0],[5,2],[0,-6]],[[2286,4384],[18,1],[9,1],[14,0],[16,3],[6,1],[9,-1],[5,-2],[5,-2],[19,-15],[5,-3],[5,-4],[6,-8],[5,-4],[4,0],[6,7],[4,3],[9,5],[6,2],[5,-1],[2,-3],[1,-2],[2,-15],[0,-4],[-1,-15],[-2,-3],[-3,-1],[-3,-1],[-4,-2],[-4,-3],[-2,-5],[-2,-8],[-2,-3],[-4,-8],[-3,-2],[-6,0],[-3,-2],[-4,-3],[-4,-3],[-3,-3],[-2,-4],[-1,-9],[-2,-4],[-1,-2],[-3,-3],[-2,-4],[0,-6],[0,-5],[1,-7]],[[2387,4237],[-4,1],[-7,2],[-5,1],[-3,0],[-11,13],[-5,5],[-7,-14],[-13,-11],[-9,-11],[-8,4],[2,-8],[4,-8],[5,-15],[14,-29],[6,-7],[-1,-10],[-5,-2],[0,-3]],[[2340,4145],[-32,7],[-15,7],[-8,6],[-6,6],[-6,8],[-23,24],[-2,5],[-1,3],[5,6],[2,4],[0,5],[-2,7],[-4,5],[-4,3],[-14,4],[-11,8],[-4,5],[-3,5],[-1,4],[-2,5],[-10,18],[-2,6],[-1,5],[2,4],[10,14],[5,3],[2,3]],[[2215,4325],[1,-12],[3,-5],[3,-4],[5,-3],[-2,7],[-2,10],[2,15],[4,9],[4,5],[-3,6],[2,3],[-17,13],[-6,9],[-3,5],[3,6],[2,6],[5,1],[5,-8],[2,-5],[3,-6],[4,-3],[3,3],[-2,7],[-7,11],[-2,15],[5,9],[0,9],[5,-6],[6,-2],[7,6],[11,-7],[6,-9],[-2,-5],[-3,-5],[-2,-6],[4,-2],[3,4],[2,-5],[0,-4],[2,-5],[5,-2],[9,-1],[4,2],[2,3]],[[2239,4429],[-4,-5],[-2,1],[0,4],[0,3],[2,2],[2,0],[2,-3],[0,-2]],[[2198,4442],[2,-5],[-1,-1],[-1,-1],[-1,-1],[-1,-1],[-2,2],[-2,1],[-1,2],[-1,1],[1,3],[1,0],[2,-1],[4,1]],[[2231,4446],[-2,-1],[-4,5],[1,2],[-1,1],[1,0],[1,2],[0,1],[1,3],[2,0],[0,-5],[-1,-1],[1,-3],[1,0],[0,-1],[0,-2],[0,-1]],[[2375,4460],[-4,-7],[-2,3],[1,4],[1,8],[4,-8]],[[2396,4525],[1,-1],[-3,1],[-2,-1],[-1,-2],[-1,6],[3,0],[3,-3]],[[2437,4591],[1,-3],[-4,2],[-1,2],[-2,5],[4,-1],[0,-3],[2,-2]],[[2415,4589],[-4,-4],[-4,4],[-1,5],[2,2],[5,1],[4,-1],[-2,-7]],[[2661,4456],[-2,-2],[-4,-5],[-1,-2],[-1,-4],[0,-7],[2,-11],[0,-4],[-2,-5],[-4,-6],[-2,-5],[-2,-3],[-4,-2],[-5,-1],[-19,4],[-19,1],[-3,-1],[-5,-1],[-10,-5],[-4,-4],[-4,-5],[-4,-8],[-8,-11],[-4,-8],[-3,-11],[-8,-15],[-1,-3],[0,-3],[0,-4],[0,-4],[2,-13],[-1,-8],[-5,-20],[2,-9],[7,-26],[1,-7],[-7,-29]],[[2543,4209],[-15,9],[-19,16],[-4,2],[-5,1],[-5,-1],[-4,-2],[-7,-10],[-5,-4],[-6,-2],[-12,-1],[-5,-3],[-6,-7],[-8,-7],[-4,-6],[-3,-7],[0,-8],[1,-3],[-1,-4],[0,-1],[-5,-2],[-12,-3],[-5,-4]],[[2413,4162],[-1,12],[0,21],[-2,9],[0,6],[0,2],[-2,2],[-2,0],[-1,0],[-2,1],[-7,6],[-2,4],[-1,5],[0,4],[-1,2],[-5,1]],[[2286,4384],[1,2],[2,11],[3,5],[10,5],[6,2],[3,-1],[4,3],[1,2],[4,0],[5,3],[3,4],[2,6],[-4,0],[-10,-4],[-3,2],[-1,6],[-3,2],[-3,1],[-2,2],[0,3],[2,4],[3,4],[4,0],[3,0],[3,2],[6,5],[-1,6],[2,5],[3,0],[4,0],[3,0],[2,2],[2,3],[1,12],[4,-3],[4,-3],[1,-4],[-3,-4],[2,-8],[4,-3],[2,-2],[7,2],[1,-4],[-3,-7],[2,-3],[4,-2],[2,-2],[1,3],[2,0],[2,2],[3,6],[5,0],[9,0],[4,3],[6,1],[3,5],[1,7],[2,9],[-2,3],[-1,6],[-7,-5],[-5,-6],[-4,-2],[-4,3],[-4,2],[-2,3],[-4,-2],[-4,4],[-2,8],[2,4],[4,-1],[1,-7],[5,-3],[7,-2],[13,7],[5,6],[4,6],[4,5],[5,2],[3,5],[5,7],[1,9],[-1,8],[-4,1],[-2,4],[0,5],[2,3],[2,2],[3,3],[2,3],[4,14],[2,-3],[4,0],[7,6],[3,4],[1,3],[2,2],[5,1],[15,-1],[7,1],[7,6],[10,18],[2,1],[4,1],[4,0],[5,-3],[8,5],[11,1],[12,-3],[-2,-9],[5,3],[8,0],[3,-6],[3,-8],[5,-3],[6,1],[4,4],[4,8],[3,10],[9,9],[10,4],[3,-5],[-1,-10],[-3,-5],[0,-3],[0,-3],[-4,-6],[3,-5],[-1,-6],[-5,0],[2,-5],[0,-3],[-2,-4],[-1,-3],[-5,-4],[-1,-6],[0,-2],[1,-1],[7,-3],[7,3],[-1,-16],[0,-3],[2,-13],[3,-9],[10,-21],[4,-13],[6,-8],[7,-5],[5,1],[8,-3],[14,-2],[4,-2]],[[2505,4637],[0,-1],[-2,0],[1,4],[1,-3]],[[2311,4751],[-3,-3],[1,5],[2,-2]],[[2288,3787],[1,-5],[0,-1],[0,-3],[-4,8],[-3,-6],[-2,1],[0,3],[0,2],[0,3],[1,4],[3,2],[2,-4],[1,-1],[-1,-1],[2,-2]],[[2328,3759],[-6,-2],[-4,4],[-3,6],[2,8],[-3,5],[-3,7],[-1,9],[1,6],[2,3],[4,-1],[7,-4],[7,0],[4,-3],[2,-9],[-1,-6],[-6,-19],[-2,-4]],[[2343,3807],[-3,-7],[-1,3],[0,2],[-1,-2],[-3,5],[2,4],[0,3],[-1,4],[2,0],[1,-3],[3,-5],[-1,-1],[1,-2],[1,-1]],[[2330,3814],[-2,-3],[-1,2],[-1,0],[-1,4],[1,1],[1,2],[1,2],[1,3],[3,2],[3,3],[0,-3],[-2,-2],[-1,-3],[-1,-5],[-1,-3]],[[2346,3825],[-2,-2],[-2,1],[0,5],[1,5],[1,5],[2,3],[2,0],[1,1],[0,2],[4,1],[5,-3],[2,-4],[-1,-2],[-3,-5],[-3,-4],[-4,-2],[-3,-1]],[[2381,3848],[-9,-1],[-1,1],[2,2],[1,0],[6,4],[1,4],[1,6],[4,4],[2,1],[2,-1],[3,0],[1,-3],[-5,-9],[-8,-8]],[[2376,3877],[1,0],[1,0],[0,-1],[0,-2],[0,-1],[1,1],[2,-2],[1,-1],[2,-1],[-4,-3],[-3,-3],[-1,0],[-1,0],[0,3],[2,1],[-1,1],[-1,-1],[-4,3],[1,3],[2,0],[1,3],[1,0]],[[2413,3884],[0,-2],[-1,-3],[-2,-1],[0,-2],[-2,1],[0,4],[0,2],[-1,0],[-1,6],[1,3],[1,-2],[3,-3],[0,-3],[2,0]],[[2398,3943],[2,-1],[6,2],[10,6],[6,0],[3,-6],[-11,-9],[-13,-45],[-10,-10],[-1,2],[0,6],[0,10],[-2,5],[-3,-1],[-6,-6],[-13,-1],[-6,-2],[-8,-3],[-6,12],[-3,7],[0,6],[2,3],[2,1],[4,1],[3,2],[7,9],[7,6],[5,3],[11,5],[7,6],[3,0],[2,-2],[1,-4],[1,-2]],[[2335,3948],[3,-19],[1,-39],[1,-4],[1,-3],[0,-4],[0,-12],[-1,-4],[-2,-3],[-2,-4],[-3,-2],[-8,-4],[-1,-3],[-7,-18],[-2,-2],[-7,-4],[-2,-3],[-8,-12],[-4,-4],[-8,-5],[-8,-5],[-5,0],[0,5],[4,24],[-4,-4],[-3,0],[-3,1],[-6,-4],[0,2],[1,5],[1,3],[10,11],[7,5],[4,1],[4,0],[3,1],[4,4],[-3,0],[-3,1],[-5,3],[-7,-4],[-5,4],[-4,9],[-2,10],[1,5],[1,4],[2,4],[3,3],[-2,7],[2,9],[3,9],[5,8],[3,10],[-2,9],[-7,15],[4,0],[3,-3],[3,-2],[3,-2],[5,1],[6,5],[8,2],[6,3],[6,3],[7,-1],[9,-12]],[[2425,3959],[-2,-1],[0,9],[0,7],[0,1],[2,2],[2,1],[2,-5],[0,-6],[-4,-8]],[[2439,3982],[-5,-6],[-3,-2],[0,3],[0,3],[-1,0],[-1,0],[0,2],[-1,1],[1,1],[-1,1],[1,3],[3,1],[2,0],[5,-1],[0,-6]],[[2420,3990],[-1,-4],[-1,-3],[2,-2],[0,-5],[0,-8],[-2,-5],[-5,-1],[-2,-2],[1,-4],[-2,1],[-4,4],[-1,6],[2,6],[-1,3],[-3,3],[0,3],[5,9],[1,-1],[1,0],[2,3],[3,2],[3,-2],[2,-3]],[[2701,4088],[-18,-5],[-4,-3],[-5,-5],[-2,-5],[-3,-12],[-5,-10],[-9,-13],[-2,-3],[-5,-12],[-4,-6],[-7,-8],[-4,-7],[-3,-8],[-1,-12],[-2,-5],[-3,-2],[-4,-1],[-5,-1],[-4,-2],[-3,-5],[-4,-9],[-6,-22],[-2,-7],[0,-5],[1,-5],[1,-5],[3,-8],[2,-5],[7,-9],[4,-5],[3,-8],[2,-7],[4,-11],[2,-5],[-1,-7],[-2,-6],[-6,-10],[-3,-9],[0,-6],[1,-5],[5,-11],[3,-7],[1,-9],[-2,-4],[-4,-2],[-4,1],[-15,6],[-3,-2],[-3,-3],[-6,-11],[-5,-5],[-5,-3],[-9,3],[-4,1],[-4,-2],[-10,-8],[-5,-3],[-4,-2],[-5,0],[-22,1],[-9,-1]],[[2504,3748],[-12,10],[-21,21],[-7,3],[-5,-2],[-3,-3],[-4,-2],[-4,-1],[-4,-3],[-18,-6],[-7,-4],[-8,-3],[-5,1],[-5,2],[-3,3],[-9,13],[-3,4],[-1,0]],[[2385,3781],[2,2],[2,1],[1,2],[0,7],[0,1],[23,31],[3,12],[1,3],[5,3],[1,2],[1,5],[-1,4],[0,4],[3,9],[2,1],[8,-10],[3,5],[1,6],[-1,13],[1,3],[8,14],[7,5],[3,12],[-1,12],[-5,6],[2,5],[4,2],[9,0],[-2,6],[-8,7],[-1,6],[2,4],[23,24],[5,8],[4,12],[-9,-1],[-53,-12],[-5,-3],[-4,3],[3,6],[5,6],[23,14],[6,7],[4,3],[5,-1],[5,2],[3,1],[3,0],[0,4],[-4,2],[-4,5],[-2,5],[-1,5],[1,3],[1,4],[4,6],[1,2],[-1,2],[-1,2],[-1,3],[-4,9],[-24,25],[-15,19],[-10,7],[-2,8],[-1,18]],[[2543,4209],[12,-5],[26,-18],[8,-1],[4,1],[2,6],[4,12],[0,4],[-1,5],[-6,9],[-2,5],[-2,11],[0,5],[1,3],[10,3],[7,4],[5,2],[5,0],[10,-7],[11,-11],[5,-7],[10,-24],[3,-6],[6,-9],[3,-6],[3,-14],[5,-11],[1,-6],[1,-4],[1,-22],[1,-6],[5,-13],[20,-21]],[[2730,3486],[1,-8],[-4,6],[1,9],[2,-2],[0,-5]],[[2862,4017],[1,0],[3,0],[-2,-4],[-2,-4],[-1,0],[0,2],[2,0],[-3,0],[-2,0],[1,1],[-2,2],[1,2],[-1,1],[2,1],[1,1],[2,-2]],[[2877,4046],[0,-2],[-1,-2],[-2,-1],[-1,-1],[-1,-8],[0,-7],[-3,-2],[-4,8],[-4,2],[-2,-7],[-5,-3],[-4,-9],[-4,-4],[-1,-2],[-1,-3],[0,-2],[1,-3],[-2,-5],[-5,-13],[-2,-3],[-5,-2],[-6,1],[-2,-2],[-1,-8],[-6,-13],[1,-6],[3,-5],[6,0],[2,-2],[6,-8],[-7,-8],[-7,-2],[-5,2],[-6,2],[-1,-10],[5,-7],[5,-9],[-8,-7],[-3,-3],[-4,-1],[-3,-1],[-1,-4],[-2,-13],[-1,-10],[-1,-3],[-2,-1],[-3,-3],[-3,-9],[-4,-23],[-6,-17],[-3,-23],[-7,-28],[-11,-44],[-12,-50],[-4,-14],[1,-8],[0,-5],[2,-12],[4,-8],[9,-4],[-1,-5],[-5,-7],[-1,-4],[-8,-52],[2,-14],[-10,-10],[-4,-6],[-2,-8],[-1,0],[-4,-9],[-1,-5],[-1,-6],[1,-3],[1,-1],[1,-2],[0,-10],[-1,-3],[-4,-5],[-1,-3],[-3,-23],[-2,-4],[-4,-7],[-2,-4],[0,-4],[-1,-2],[-2,-3],[-1,2],[-1,1],[-2,1],[1,3],[1,1],[0,2],[-13,-3],[-6,0],[-5,3],[-2,3],[1,8],[-1,5],[-2,3],[-6,8],[-2,4],[-2,0],[-2,1],[-7,-2],[-6,5],[-3,4]],[[2645,3460],[1,1],[0,2],[9,15],[1,7],[1,7],[1,11],[0,5],[-2,5],[-3,7],[-6,5],[-10,2],[-3,0],[-3,1],[-2,0],[-10,7],[-7,2],[-4,4],[-6,14],[-2,5],[0,4],[0,5],[-1,3],[-2,5],[-8,11],[-4,6],[-22,11],[-2,3],[-3,5],[-1,11],[1,21],[-2,8],[-9,10],[-7,5],[-7,7],[-6,10],[-20,40],[-4,4],[-3,8],[4,11]],[[2701,4088],[6,-5],[4,-3],[9,-1],[6,0],[6,1],[9,6],[5,0],[4,-1],[4,-3],[3,-4],[1,-3],[0,-5],[0,-4],[-1,-3],[1,-4],[2,-4],[2,-2],[4,-2],[4,0],[6,3],[4,3],[6,2],[30,2],[4,1],[2,2],[2,5],[5,12],[1,3],[3,3],[4,2],[5,-1],[6,-2],[4,-1],[5,-3],[3,-5],[3,-14],[1,-7],[1,-6],[2,-3],[10,-1]],[[3067,4145],[-5,-2],[-3,1],[1,1],[5,3],[2,-3]],[[3026,4222],[-4,-4],[-1,3],[5,1]],[[3052,4222],[-1,-4],[-1,2],[2,4],[2,-1],[-2,-1]],[[3006,4253],[2,0],[1,0],[2,0],[1,1],[1,-1],[0,-2],[-1,-3],[1,-2],[2,0],[2,1],[0,-2],[0,-3],[2,-1],[0,-1],[-5,2],[-3,2],[0,1],[-1,3],[-1,2],[-5,0],[-1,3],[1,2],[2,-2]],[[3038,4267],[-1,-2],[-2,0],[0,-2],[0,-1],[1,-3],[-2,-1],[-1,2],[0,2],[-1,2],[0,1],[-2,1],[-2,0],[2,2],[2,-1],[3,2],[2,2],[1,0],[1,2],[0,1],[1,-1],[1,-5],[-3,-1]],[[3071,4293],[-1,-3],[-2,1],[0,2],[2,2],[0,1],[-1,3],[2,-1],[1,-2],[-1,-3]],[[3035,4344],[-1,-2],[-1,2],[-4,2],[2,1],[3,0],[1,-3]],[[3029,4355],[-1,-7],[-1,4],[2,3]],[[3074,4512],[-2,0],[1,3],[1,0],[2,0],[1,0],[0,-1],[-1,-1],[-2,-1]],[[3091,4566],[-1,-3],[-2,4],[-2,0],[1,2],[4,-3]],[[3142,4597],[0,-5],[-4,-1],[-2,-6],[2,-3],[0,-1],[2,-1],[0,-2],[-1,-1],[-3,1],[-1,-2],[-2,0],[-1,2],[0,2],[0,4],[1,6],[-2,1],[-2,-2],[2,4],[1,2],[1,0],[2,0],[1,0],[1,3],[1,2],[2,0],[1,2],[1,0],[1,1],[0,-3],[-1,-3]],[[3097,4607],[-2,-2],[-5,-2],[-1,-1],[-2,1],[-2,1],[0,2],[1,1],[2,-1],[2,0],[2,0],[1,1],[3,1],[1,-1]],[[3135,4617],[-1,-1],[-1,0],[-3,-3],[-2,3],[2,6],[2,3],[1,-1],[2,-3],[0,-3],[0,-1]],[[3094,4621],[-2,-3],[-1,3],[0,2],[1,3],[-1,1],[0,4],[1,1],[5,1],[3,-1],[-2,-3],[-1,-3],[-1,-1],[-2,-4]],[[3359,4634],[-1,-2],[-2,0],[-2,2],[-1,3],[3,2],[1,1],[2,0],[0,-2],[1,-4],[-1,0]],[[3118,4615],[-6,-2],[-4,3],[-1,6],[3,6],[4,4],[2,2],[1,1],[3,1],[3,4],[2,3],[1,-1],[0,-5],[-1,-5],[0,-3],[-1,-2],[-1,-2],[0,-5],[-5,-5]],[[3431,4648],[11,-3],[7,-3],[4,-6]],[[3453,4636],[3,-33],[-1,-12],[-3,-13],[-3,-9]],[[3449,4569],[-28,-1],[-15,-7],[-6,-6],[-9,-3],[-13,0],[-14,-2],[-16,0],[-10,-4],[-5,0],[-6,0],[-4,-3],[-6,-9],[-5,-3],[-4,0],[-6,1],[-4,-2],[-2,-4],[-2,-4],[-6,-11],[-10,-27],[-3,-6],[-3,-6],[-7,-7],[-3,-6],[-2,-8],[-2,-6],[-3,-11],[0,-5],[0,-9],[-1,-5],[-2,-6],[-11,-17],[-5,-6],[-5,-3],[-7,-3],[-41,1],[-4,-3],[-2,-4],[2,-11],[1,-6],[1,-5],[3,-4],[3,-4],[2,-4],[3,-5],[2,-4],[4,-4],[3,-4],[2,-5],[-2,-6],[-6,-6],[-18,-13],[-6,-6],[-3,-5],[-2,-5],[-1,-6],[-1,-5],[0,-4],[-1,-3],[-3,-3],[-8,-7],[-4,-5],[-6,-12],[-3,-3],[-4,-1],[-4,3],[-9,11],[-4,0],[-2,-3],[0,-5],[1,-5],[6,-16],[3,-5],[1,-5],[0,-5],[0,-6],[2,-5],[6,-15],[0,-10],[1,-8],[-1,-5],[-1,-5],[-8,-15]],[[3126,4129],[-1,0],[-5,-2],[-2,1],[-14,11],[-6,3],[5,-7],[-7,1],[-5,3],[-4,0],[-2,-10],[2,-1],[3,-4],[2,-1],[-6,-3],[-5,1],[-5,4],[-5,15],[7,7],[-4,10],[4,7],[2,4],[-7,14],[-3,8],[-10,1],[-6,4],[-8,-16],[-4,1],[5,12],[-1,6],[4,5],[14,-7],[6,1],[4,6],[-7,0],[2,6],[0,7],[-2,4],[-4,2],[0,3],[7,-1],[2,1],[1,1],[2,3],[1,4],[-3,1],[-10,1],[-3,2],[-1,7],[0,5],[7,3],[-3,5],[-3,3],[-5,4],[-3,-5],[-5,-1],[-1,8],[8,3],[8,-3],[4,0],[1,-6],[5,-4],[3,-6],[6,5],[-1,9],[4,6],[7,2],[4,5],[-4,7],[-4,3],[6,6],[-6,1],[-5,-3],[-2,4],[-3,2],[-3,3],[1,6],[6,6],[6,2],[1,4],[-13,0],[-21,-5],[-6,2],[-4,3],[-4,2],[2,5],[2,2],[6,1],[2,2],[1,3],[1,13],[-6,-6],[-4,6],[0,10],[6,9],[0,3],[-5,0],[2,4],[2,3],[2,2],[3,1],[-13,10],[-6,1],[-6,0],[-3,-3],[-4,-2],[-4,3],[-10,-8],[-8,-3],[-13,-8],[-11,-7],[-9,-9],[-4,-7],[-3,-5],[-5,1],[-4,2],[3,8],[-12,-9],[-15,-10],[-5,2],[6,7],[7,5],[14,15],[13,6],[6,-3],[4,3],[-3,4],[-1,4],[6,4],[9,4],[7,-1],[6,5],[8,0],[9,10],[38,23],[5,6],[3,7],[2,5],[9,13],[3,3],[7,8],[32,16],[6,7],[8,7],[10,12],[7,19],[-1,14],[-1,13],[3,17],[2,12],[2,13],[14,3],[0,11],[5,10],[-1,19],[10,8],[15,12],[5,8],[18,5],[2,8],[2,4],[-1,9],[-7,0],[-3,0],[0,5],[6,-1],[5,-1],[4,10],[4,-7],[2,-2],[2,-3],[3,-3],[18,-26],[9,-28],[3,-8],[2,-7],[3,-5],[7,-4],[6,-4],[7,0],[8,4],[12,3],[11,4],[2,8],[9,5],[7,-1],[7,4],[6,0],[6,-3],[18,1],[8,-2],[15,-7],[8,-1],[7,3],[5,5],[4,5],[4,6],[5,7],[1,2]],[[3346,4717],[-4,-1],[-3,5],[2,1],[3,-1],[2,-4]],[[3267,4718],[4,0],[1,0],[1,-2],[-2,-5],[-16,-19],[-6,-4],[-3,4],[0,8],[1,6],[2,2],[2,0],[1,0],[-1,4],[-2,7],[2,6],[7,2],[6,-3],[1,-3],[2,-3]],[[3329,4723],[-1,-1],[-3,4],[0,2],[1,1],[1,1],[1,-2],[1,-2],[1,-2],[-1,-1]],[[3275,4747],[1,-4],[1,-3],[2,-1],[1,-1],[2,0],[3,1],[-1,-2],[-3,-2],[0,-1],[-3,-7],[-3,0],[-2,4],[-6,-2],[-5,5],[-3,0],[-1,1],[2,4],[0,4],[1,3],[1,0],[4,-1],[7,3],[2,-1]],[[3294,4746],[-5,-1],[0,5],[0,1],[3,1],[2,-1],[0,-5]],[[3257,4740],[-5,-7],[-12,1],[-11,-8],[-3,3],[3,9],[2,2],[5,2],[2,3],[0,4],[-2,3],[-2,2],[-3,0],[6,10],[7,8],[6,2],[5,-10],[3,-15],[-1,-9]],[[3443,4770],[2,-6],[3,2],[4,1],[0,-1],[-1,-1],[0,-3],[-4,1],[-1,-1],[-3,-3],[-2,-2],[0,-2],[-1,2],[0,3],[1,3],[1,1],[-1,2],[0,4],[2,0]],[[3460,4783],[-2,-5],[-1,1],[-2,4],[-1,5],[2,-1],[4,-4]],[[3705,4733],[0,-1],[-7,-20],[-4,-2],[-4,-2],[-11,5],[-46,-1],[-15,-2],[-7,-3],[-4,-4],[-5,-9],[-5,-5],[-5,-3],[-14,-3],[-4,-2],[-12,-8],[-5,-2],[-6,-1],[-4,1],[-3,2],[-4,4],[-4,4],[-6,2],[-23,-3],[-3,-3],[-5,-7],[-4,-3],[-11,-3],[-4,-3],[-3,-4],[-6,-6],[-4,-4],[-14,-11]],[[3431,4648],[9,10],[5,7],[2,8],[2,22],[0,19],[-2,8],[-3,7],[-4,6],[-5,6],[-5,4],[-5,4],[-5,8],[7,-4],[10,-5],[9,-3],[5,3],[6,-8],[9,4],[10,9],[8,9],[8,9],[20,11],[10,7],[3,5],[2,6],[3,6],[4,2],[3,1],[5,2],[3,1],[3,-1],[5,-5],[6,-2],[4,-3],[3,-2],[3,0],[5,3],[3,0],[12,-4],[2,4],[4,10],[5,-8],[2,3],[1,7],[1,4],[5,1],[3,-3],[1,-5],[2,-6],[0,-13],[1,-4],[5,-2],[3,2],[7,10],[1,4],[7,-7],[7,-3],[4,-5],[-4,-14],[12,-8],[4,-1],[4,-2],[7,-9],[5,-2],[8,2],[4,0],[2,-3],[1,-4],[3,-5],[8,-7],[1,-1]],[[3468,4802],[-1,-2],[-2,2],[-3,5],[1,6],[5,6],[1,2],[2,0],[3,-5],[0,-7],[-1,-3],[-3,-2],[-2,-2]],[[3495,4821],[1,-3],[0,-2],[-3,-1],[0,-1],[-2,-1],[-2,-3],[-3,-2],[-1,0],[-1,3],[1,2],[-1,4],[-1,5],[1,-2],[1,-1],[2,0],[0,1],[2,1],[1,2],[1,0],[1,-1],[1,-1],[2,0]],[[3578,4818],[-3,-5],[2,8],[1,3],[1,3],[2,-1],[-1,-4],[0,-4],[-2,0]],[[3456,4828],[2,-2],[0,-3],[1,0],[0,-2],[-1,-2],[-1,-1],[-2,-4],[-1,3],[-1,1],[0,4],[-2,5],[2,-1],[3,2]],[[3584,4835],[-3,-5],[-1,0],[0,5],[2,4],[2,-4]],[[3552,4859],[3,-2],[1,1],[7,-9],[2,-2],[2,0],[-1,-1],[-3,-3],[-1,0],[-3,0],[-3,2],[-5,11],[1,3]],[[3596,4860],[-6,-9],[-3,0],[-3,3],[-6,3],[-3,2],[-1,1],[1,2],[2,2],[3,0],[6,5],[3,1],[2,-2],[2,-2],[2,-1],[1,0],[0,-5]],[[3569,4865],[0,-6],[-3,7],[-1,3],[4,4],[1,-3],[-1,-5]],[[3683,4875],[-2,-13],[-7,-25],[-1,4],[-3,3],[-4,0],[-5,0],[0,3],[6,1],[2,4],[-3,3],[-7,-2],[-5,-6],[-3,-8],[-4,-7],[-6,-1],[2,17],[-2,4],[-7,4],[-5,0],[-7,-3],[-5,0],[-2,7],[3,3],[0,5],[0,5],[1,6],[9,-4],[8,3],[14,10],[4,2],[11,1],[11,4],[5,0],[-1,-5],[0,-4],[2,-5],[1,-6]],[[3100,4036],[-5,-3],[-2,2],[0,6],[-1,6],[2,6],[1,2],[2,-1],[1,-1],[1,-2],[3,-4],[0,-4],[0,-4],[-2,-3]],[[3658,4418],[-7,-10],[-10,-22],[-9,-40],[-3,-17],[-3,-13],[0,-7],[-2,-12],[0,-10],[-5,-6],[-6,16],[-5,10],[-4,-1],[-7,2],[0,10],[-9,11],[-13,21],[-4,14],[-10,5],[-9,5],[-8,11],[-6,16],[-22,3],[-30,9],[-7,8],[-22,-4],[-21,-6],[-6,-6],[-13,-8],[-26,-14],[-5,-11],[1,-8],[-5,-6],[-8,-4],[-7,-1],[-6,-1],[-3,-1],[-3,-2],[-3,-3],[-6,-10],[-1,-1],[0,8],[-2,1],[-2,2],[-6,-5],[-8,-8],[-5,-10],[2,-9],[-2,-6],[0,-4],[2,-3],[2,-3],[0,-2],[1,-2],[1,-2],[-1,-3],[-1,-2],[-2,-2],[0,-1],[-2,-11],[-4,-6],[-4,-5],[-4,-4],[1,-10],[2,-3],[-5,-4],[-2,6],[-4,0],[-8,-12],[-11,-22],[-8,-13],[-3,-7],[0,-7],[0,-4],[-3,-2],[-4,4],[-8,5],[-11,-7],[-5,-17],[-2,-18],[4,-21],[-2,-16],[-4,-3],[-9,1],[-2,-6],[1,-8],[-1,-9],[5,-4],[2,-5],[3,-4],[6,-7],[4,-7],[3,-8],[0,-9],[-8,-4],[-6,4],[-2,2],[-2,3],[-3,9],[-1,4],[-6,5],[-8,4],[-7,-2],[-4,-10],[-3,7],[-4,1],[-5,-4],[-4,-6],[-6,-4],[-7,0],[-6,3],[-5,3],[-9,10],[-5,7],[-16,-5],[-11,-12],[-3,9],[1,13],[7,12],[6,14],[10,13],[4,6],[1,6],[-21,0]],[[3449,4569],[31,-13],[13,-2],[4,1],[5,-1],[6,-3],[17,-12],[7,-3],[5,1],[4,4],[3,5],[4,3],[6,2],[14,-3],[3,-3],[3,-10],[3,-5],[1,-5],[1,-6],[3,-32],[2,-2],[11,1],[10,-2],[5,-3],[4,-4],[1,-6],[0,-5],[-1,-4],[-2,-7],[9,-21],[3,-6],[8,-4],[6,-1],[5,1],[15,-6]],[[2896,4039],[-1,-1],[-2,2],[1,3],[0,3],[0,-1],[2,-1],[1,-3],[-1,-2]],[[2894,4065],[-2,-2],[-2,1],[0,4],[2,-1],[2,-2]],[[2944,4151],[-2,-3],[-2,4],[-1,1],[2,2],[3,4],[0,-3],[0,-2],[0,-1],[0,-2]],[[2896,4166],[-2,-4],[-1,0],[-2,0],[-1,2],[1,4],[1,1],[1,1],[0,2],[1,2],[0,2],[1,2],[1,1],[3,0],[1,-1],[0,-1],[-2,-3],[-1,-3],[2,-1],[2,-2],[-5,-2]],[[2923,4220],[-3,-4],[-1,1],[0,4],[2,2],[2,-3]],[[2915,4250],[-2,-3],[0,3],[2,2],[0,-2]],[[2905,4300],[-3,-2],[-2,3],[-1,1],[3,0],[3,0],[0,-2]],[[2661,4456],[6,-2],[12,-1],[9,-11],[12,0],[15,-3],[16,3],[2,3],[11,13],[6,7],[2,10],[5,7],[7,4],[10,2],[7,0],[5,1],[6,-3],[6,-4],[7,1],[6,-1],[7,-12],[8,-17],[5,-12],[3,-9],[1,-10],[-4,-12],[3,-13],[-3,-10],[-6,-15],[-1,-10],[-3,-2],[-7,5],[-5,3],[-6,-3],[-2,-7],[1,-7],[-1,-6],[-8,-2],[-3,-2],[-2,-7],[-6,-2],[-7,0],[-2,3],[-5,6],[-9,-1],[-2,-10],[4,-32],[6,-5],[6,-3],[21,-1],[13,9],[15,-9],[3,8],[17,-8],[19,-4],[9,3],[11,8],[6,-1],[-7,-14],[-3,-10],[0,-7],[-2,-3],[-5,-2],[-6,-9],[-1,-8],[-6,-12],[11,-6],[8,7],[10,0],[4,-2],[-9,-7],[-5,-7],[-2,-6],[6,-3],[3,2],[5,-1],[3,-4],[5,0],[1,5],[0,6],[3,0],[3,-7],[2,-5],[3,-2],[3,-1],[3,1],[2,3],[1,11],[6,-13],[-2,-6],[-8,-3],[-12,1],[-5,0],[-2,-9],[-6,-7],[-1,-14],[4,-3],[6,-8],[5,0],[3,-7],[4,2],[3,1],[2,-1],[2,-3],[2,-1],[4,2],[0,-2],[1,-2],[2,1],[5,6],[8,-2],[7,-1],[1,-5],[-7,1],[-7,-4],[-5,-1],[-10,-10],[-4,-7],[1,-3],[3,-2],[1,-3],[-3,-8],[-3,-3],[-2,-1],[-3,-3],[-3,-5],[4,-1],[10,2],[2,-3],[-3,-6],[-5,-5],[-6,-3],[-4,0],[-6,-7],[-15,2],[-3,-10],[0,-12],[-1,-2]],[[2812,4506],[-6,-1],[-6,1],[1,2],[3,3],[4,1],[3,3],[1,0],[2,0],[2,-1],[1,-2],[-1,-3],[-4,-3]],[[3827,4570],[-1,-4],[0,-2],[-2,-2],[-2,-1],[0,4],[0,3],[1,-1],[2,3],[2,0]],[[3705,4733],[8,0],[9,8],[21,-1],[7,3],[4,2],[4,8],[1,-5],[-3,-5],[-2,-7],[5,1],[6,8],[6,3],[-2,-7],[-4,-7],[-1,-4],[0,-3],[1,-3],[-7,-2],[4,-1],[3,-2],[4,1],[-2,-6],[-4,-7],[-1,-5],[1,-3],[-6,-11],[0,-12],[1,-8],[-2,-2],[-2,-8],[0,-3],[0,-5],[2,-9],[1,-4],[3,-2],[4,0],[0,5],[4,2],[4,-12],[4,-8],[11,-8],[-2,-4],[4,-3],[0,-7],[0,-7],[-4,-5],[-1,-4],[-5,-3],[-3,-2],[-5,-11],[4,-3],[18,1],[0,-3],[-2,-1],[-4,-2],[-2,0],[0,-3],[10,2],[6,3],[3,-2],[-6,-4],[-9,-6],[-12,-7],[-5,-6],[-11,-2],[-3,-7],[-9,-1],[-3,-13],[-8,-2],[-2,-7],[-26,-22],[-17,-7],[-9,-9],[4,-6],[-8,-10],[-1,-6],[-3,-3],[-4,-2],[-4,1],[-5,-3],[1,-9],[0,-5],[-6,-6]],[[4524,4889],[-2,-2],[-1,3],[2,3],[2,-1],[-1,-3]],[[4531,4951],[-2,-3],[-1,3],[4,3],[-1,-3]],[[4469,5028],[-2,-1],[-3,17],[4,0],[4,-6],[1,-6],[-4,-2],[0,-2]],[[4705,5228],[-3,-16],[6,-16],[3,-4],[3,-2],[4,0],[9,2],[4,2],[5,3],[6,2],[6,0],[23,-6],[17,0]],[[4788,5193],[-2,-15],[-1,-12],[-3,-11],[-5,-15],[-6,-9],[-18,-21],[-4,-7],[-3,-19],[-1,-7],[-12,-16],[-3,-7],[-2,-8],[-3,-5],[-10,-11],[-2,-2],[-3,-1],[-16,-6],[-5,-3],[-3,-5],[-5,-18],[-2,-8],[-1,-13],[0,-8],[1,-7],[1,-3],[-1,-7]],[[4679,4949],[-13,-2],[-28,-9],[-64,-27],[-14,2],[-17,-6],[-4,-1],[-5,0],[2,6],[2,3],[4,9],[4,14],[6,8],[9,-12],[1,-3],[2,-3],[3,4],[1,1],[5,4],[5,3],[5,2],[9,8],[14,11],[6,3],[8,13],[5,-1],[0,-10],[-1,-8],[2,-1],[3,8],[-1,9],[8,-2],[2,3],[-9,4],[3,9],[1,5],[-1,4],[-7,11],[-6,5],[-4,-3],[-7,3],[-8,4],[-4,-7],[-5,2],[-1,-8],[-1,-9],[-5,-3],[0,10],[-5,-2],[-5,3],[-6,1],[-7,-2],[-4,-4],[-5,4],[-7,-3],[-7,1],[-3,1],[-6,9],[-2,3],[-6,8],[-6,3],[2,12],[6,19],[-1,12],[-3,-6],[-4,-13],[-6,-11],[-3,-6],[-1,-9],[-3,-24],[3,-6],[3,-8],[9,-5],[3,-10],[0,-8],[-9,1],[-10,5],[-12,9],[-7,5],[-3,6],[-1,8],[3,8],[2,8],[2,8],[0,7],[-3,9],[-4,7],[-5,0],[-1,11],[-1,12],[0,8],[1,8],[3,8],[3,8],[5,9],[3,8],[4,8],[1,13],[1,9],[-5,1],[-4,-14],[-3,-11],[-2,10],[0,7],[-4,2],[3,-22],[-9,-2],[-1,10],[-3,0],[0,-12],[-7,-1],[-8,2]],[[4449,5114],[-5,7],[-4,9],[-5,15],[-3,7],[-5,6],[-3,9]],[[4424,5167],[1,35],[1,10],[14,26],[9,22],[3,4],[3,2],[2,-2],[4,-3],[2,0],[3,0],[8,5],[6,4],[20,5],[7,4],[2,1],[5,1],[3,-2],[9,-8],[7,-4],[2,-3],[2,-4],[2,-6],[1,-2],[2,-2],[3,-3],[3,-3],[4,-9],[2,-3],[3,-1],[5,0],[4,-2],[4,-3],[10,-10],[3,-1],[4,-1],[6,0],[21,12],[5,1],[4,0],[14,-9],[6,-3],[5,-3],[7,-7],[5,-3],[5,1],[14,7],[8,7],[3,3],[15,8]],[[4711,5743],[14,-14],[3,-8],[2,-7],[-1,-7],[-3,-13],[-2,-5],[-3,-5],[-8,-11],[-3,-7],[0,-6],[0,-4],[1,-6],[-2,-5],[-4,-13],[-3,-10],[2,-8],[4,-7],[5,-6],[3,-7],[0,-6],[-1,-6],[-6,-14],[-13,-22],[-11,-17],[-4,-8],[-3,-5],[-5,-2],[-6,1],[-6,0],[-6,-3],[-5,-6],[-12,-20],[-5,-11],[1,-5],[2,-3],[8,-1],[4,-2],[2,-4],[3,-3],[3,-3],[9,-3],[4,-3],[3,-5],[9,-24],[2,-5],[8,-11],[2,-6],[1,-5],[-1,-15],[6,-24],[1,-3],[1,-1],[2,-2],[6,-4],[8,-11],[3,-11],[0,-8],[-1,-8],[1,-6],[4,-14],[-1,-4],[-2,-2],[-7,1],[-2,-2],[-2,-3],[4,-12],[1,-8],[-2,-7],[-3,-6],[-5,-14]],[[4424,5167],[-18,9],[-11,7],[-9,9],[-3,5],[-3,9],[-3,3],[-4,1],[-38,-14]],[[4335,5196],[-7,14],[0,16],[6,24],[1,12],[1,6],[2,17],[-3,28],[-6,22],[-4,9],[-3,7],[-3,1],[-3,-2],[-4,0],[-5,4],[-4,11],[-2,7],[-1,9],[-10,22]],[[4290,5403],[10,23],[5,22],[2,5],[4,4],[4,2],[4,0],[5,0],[11,-5],[5,-1],[5,0],[4,0],[4,-1],[7,-6],[3,0],[1,4],[2,4],[4,3],[34,8],[7,0],[11,-3],[6,1],[7,2],[6,2],[10,0],[3,3],[5,10],[4,6],[2,5],[0,7],[-3,9],[-4,8],[-5,5],[-4,3],[-8,3],[-4,2],[-2,4],[-3,4],[0,5],[0,6],[1,8],[1,19],[3,12],[2,5],[1,4],[-1,7]],[[4439,5602],[8,15],[3,19],[2,7],[16,27],[2,7],[-1,5],[-7,9],[-3,4],[-3,8]],[[4456,5703],[7,-2],[3,1],[3,3],[2,4],[1,5],[2,6],[2,5],[5,2],[9,-2],[6,0],[8,-3],[4,-2],[3,-4],[1,-4],[0,-3],[-2,-9],[1,-4],[4,-1],[6,4],[7,10],[2,2],[4,2],[3,3],[3,5],[1,5],[1,5],[2,3],[2,2],[4,3],[5,5],[16,21],[5,4],[5,2],[4,-2],[4,-2],[4,0],[21,10],[4,1],[2,-1],[2,-3],[-1,-3],[0,-3],[0,-3],[3,-1],[4,1],[3,2],[4,4],[4,1],[5,-1],[10,-7],[8,-3],[20,-4],[16,-9],[13,-5]],[[4543,6101],[0,-4],[0,-4],[-2,-4],[-5,-3],[-6,0],[-6,-3],[-4,-3],[-3,0],[-5,-2],[-1,0],[-3,5],[-7,9],[-3,8],[2,3],[3,-1],[1,-4],[2,-1],[2,2],[2,1],[3,0],[3,2],[2,2],[2,0],[3,-1],[2,-2],[3,-3],[3,0],[3,2],[3,5],[5,2],[2,-3],[-1,-3]],[[4543,6013],[-1,0],[-11,-2],[-5,0],[-4,-1],[-9,-5],[-4,-1],[-4,0],[-4,0],[-3,-2],[-3,-4],[-8,-10],[-3,-8],[-9,-26],[-2,-8],[-1,-11],[-4,-17],[-2,-5],[-7,-7],[-2,-4],[0,-6],[1,-5],[2,-5],[0,-4],[0,-5],[-6,-20],[1,-9],[1,-7],[3,-14],[0,-7],[-1,-8],[-2,-6],[-2,-7],[-3,-27],[0,-9],[1,-8],[2,-5],[2,-7],[0,-8],[-3,-12],[0,-6],[3,-14]],[[4439,5602],[-21,-5],[-6,1],[-5,4],[-11,16],[-7,7],[-11,8],[-12,2],[-10,1],[-5,-1],[-4,-2],[-6,0],[-13,7],[-6,2],[-7,1],[-4,2],[-4,3],[-2,5],[-1,6],[-3,13],[-1,5],[-1,3],[-2,3],[-1,1],[-11,9],[-1,1],[-4,6]],[[4280,5700],[16,18],[7,11],[15,9],[12,12],[15,19],[68,107],[16,32],[23,65],[1,9],[0,11],[-2,2],[-3,3],[1,5],[3,8],[2,13],[-3,9],[-5,6],[-4,16],[-3,4],[-1,9],[3,24],[-2,7],[-4,4],[-3,-1],[-1,-6],[-7,1],[-1,6],[1,12],[2,11],[3,7],[5,6],[-3,5],[5,6],[5,8],[2,8],[-3,5],[-1,13],[9,16],[11,7],[19,12],[12,4],[8,-5],[10,1],[35,22],[9,3],[6,9],[7,7],[46,17],[13,3],[15,-6],[3,-5],[-3,-9],[1,-6],[4,-4],[-1,-6],[-1,-4],[-9,-3],[-5,1],[-7,1],[-6,-3],[-5,-3],[-2,-8],[-3,-15],[4,-11],[6,-1],[-1,-7],[-1,-6],[-2,-5],[-6,-7],[-2,-4],[-7,0],[-14,4],[-18,-8],[-5,-10],[-7,-11],[-1,-9],[-5,-4],[-7,-3],[-2,-6],[-4,-3],[-11,5],[-6,5],[-5,5],[4,5],[1,3],[-3,0],[-3,-4],[-4,-2],[-1,-4],[-3,-7],[-8,-11],[-4,-14],[5,-2],[-1,-10],[-1,-4],[-7,1],[0,-11],[-2,-5],[4,-4],[6,2],[7,4],[6,-1],[10,-13],[5,-2],[8,4],[7,18],[4,4],[3,-2],[2,-9],[-2,-26],[2,-27],[-3,-4]],[[4494,4860],[-3,-2],[-2,3],[-1,4],[6,3],[2,3],[3,-1],[0,-3],[-2,-4],[-3,-3]],[[4488,4876],[-6,-2],[-2,2],[6,3],[7,5],[2,3],[5,1],[-3,-4],[1,-3],[-5,-1],[-5,-4]],[[4449,5114],[-2,-1],[-7,2],[-14,-13],[-7,-7],[-3,-7],[0,-3],[-2,-5],[0,-2],[0,-3],[6,-1],[-5,-5],[0,-8],[-2,-11],[-8,-16],[-16,-25],[-10,-16],[-3,-21],[-1,-9],[-1,-10],[1,-2],[3,-7],[1,-2],[4,-2],[-1,-6],[-1,-6],[0,-5],[3,-6],[6,-3],[14,0],[6,-2],[6,-6],[4,-6],[5,-5],[24,-20],[16,-8],[4,-4],[3,1],[5,0],[4,-1],[3,-3],[2,-6],[1,-5],[1,-4],[3,-5],[4,-2],[4,1],[3,0],[2,-5],[1,-5],[-3,-17],[-4,2],[-4,1],[-3,-2],[-2,-5],[1,-3],[2,-2],[4,-2],[4,1],[-5,-6],[-2,-3],[-2,-4],[3,-5],[2,-7],[1,-9],[-2,-7],[-3,-3],[-11,-5],[-5,-2],[-6,1],[-8,2],[-6,4],[0,6],[4,2],[7,-2],[7,-3],[4,-4],[-1,3],[0,5],[-1,2],[4,-3],[2,9],[-3,7],[-6,2],[-6,-2],[0,-3],[0,-2],[0,-1],[0,-4],[-11,10],[-6,-6],[-10,-2],[-7,2],[2,7],[5,10],[-6,1],[-10,-4],[-8,-5],[6,-2],[-1,-6],[-3,-5],[-11,-6],[-5,-4],[-5,-1],[-5,8],[-2,-3],[-2,-1],[-1,-2],[0,-4],[-9,6],[-3,1],[-2,-6],[-1,-4],[-2,-3],[2,-7],[-3,-1],[-10,5],[-15,-12],[-3,-4],[-11,0],[-15,-10],[-12,-14],[-1,-13],[4,-4],[3,-1],[0,-3],[-1,-6],[-2,-3],[-3,-2],[-3,-1],[-2,-1],[-3,3],[-4,8],[-3,2],[-2,-2],[-5,-10],[-4,-3],[0,-4],[5,0],[3,-2],[2,-3],[1,-6],[6,-7],[3,-5],[-1,-3],[-1,-2],[0,-13],[0,-4],[-5,-2],[-4,2],[-3,5],[-2,5],[-4,-5],[-4,-5],[0,-3],[7,-1],[2,-6],[-2,-5],[-5,3],[-2,-8],[-2,-3],[-11,-2],[-2,-2],[-2,-3],[-3,-6],[-2,-1],[-4,-1],[-7,1],[-11,-21],[-17,-52],[-7,-22]],[[4205,4491],[-9,5],[-5,3],[-4,5],[-3,4],[-3,5],[-6,6],[-12,18],[-4,8],[-2,7],[0,3],[1,6]],[[4158,4561],[9,6],[2,6],[3,9],[3,3],[4,0],[2,2],[2,4],[10,7],[5,9],[4,8],[2,8],[4,10],[4,6],[6,3],[17,-1],[3,1],[1,3],[-3,8],[-2,7],[8,35],[0,6],[-1,24],[4,18],[0,6],[-2,6],[-3,7],[-1,6],[2,4],[0,5],[-8,23],[-3,6],[-1,6],[1,8],[3,7],[4,5],[6,2],[14,3],[7,4],[8,9],[2,6],[1,7],[-1,4],[-2,3],[-7,1],[-3,3],[-3,8],[-3,3],[-3,1],[-5,0],[-5,0],[-5,3],[-7,5],[-5,5],[-2,5],[0,7],[2,7],[-1,7],[-1,3],[-4,4],[-1,1],[0,2],[8,3],[3,4],[-2,10],[-1,7],[-1,5],[-2,2],[-1,2],[-5,2]],[[4218,4970],[-10,27]],[[4208,4997],[25,12],[6,9],[4,6],[-4,10],[1,5],[3,3],[4,1],[18,-5],[19,0],[23,8],[10,6],[6,6],[3,5],[4,5],[3,5],[2,6],[3,8],[1,7],[2,18],[5,19],[3,32],[0,5],[-2,4],[-9,15],[-3,9]],[[5070,5908],[-6,-3],[-10,-3],[-6,-3],[-3,-3],[-8,-2],[-12,-2],[-7,-2],[-4,-2],[-2,-3],[-1,-5],[0,-7],[-1,-5],[-3,-3],[-12,-4],[-4,-2],[-2,-4],[0,-5],[-2,-4],[-1,-3],[-3,-5],[-2,-5],[-2,-12],[-5,-19],[-1,-10],[-1,-7],[1,-9],[3,-6],[6,-8],[10,-8],[4,-1],[4,0],[6,2],[6,0],[4,1],[9,4],[4,2],[5,0],[5,0],[5,-3],[5,-5],[3,-8],[1,-21],[1,-3],[1,-4],[-1,-6],[-3,-5],[-3,-4],[-6,-5],[-2,-5],[0,-7],[2,-13],[3,-10],[0,-9],[-1,-4],[-2,-3],[-6,-1],[-2,-1],[0,-6],[2,-5],[5,-5],[4,-3],[3,-4],[0,-6],[0,-9],[1,-10],[0,-5],[-1,-5],[1,-5],[4,-7],[23,-22]],[[5076,5553],[0,-9],[5,-25]],[[5081,5519],[-17,-17],[-5,-2],[-4,-1],[-4,1],[-3,1],[-3,4],[-1,6],[-2,4],[-3,2],[-4,1],[-5,1],[-8,2],[-4,0],[-17,-6],[-4,1],[-3,4],[-1,5],[0,4],[0,4],[-2,3],[-2,3],[-10,6],[-9,3],[-3,0],[-4,-3],[-3,-6],[-17,-35],[-2,-4],[-3,-3],[-4,0],[-7,5],[-4,-1],[-3,-3],[-11,-30],[0,-4],[2,-6],[3,-4],[2,-4],[-2,-5],[-7,-11],[-2,-7],[1,-11],[3,-12],[5,-10]],[[4914,5394],[-3,-9],[-2,-10],[-1,-4],[-3,-3],[-5,-2],[-3,-3],[-2,-6],[0,-6],[1,-6],[-1,-6],[-1,-8],[1,-5],[1,-5],[-1,-5],[-2,-6],[-6,-6],[-1,-5],[0,-4],[3,-5],[2,-4],[1,-5],[-2,-6],[-3,-7],[-9,-9],[-5,-3],[-10,-3],[-3,-2],[-5,-6],[-3,-5],[-2,-2],[-4,-3],[-8,-2],[-7,-4],[-14,-14],[-6,-3],[-12,-14],[-11,-5]],[[4711,5743],[5,8],[9,9],[4,5],[2,5],[5,16],[4,10],[5,7],[2,6],[-1,4],[-1,5],[1,5],[4,5],[5,6],[5,8],[2,7],[1,8],[1,11],[1,10],[0,50]],[[4765,5928],[13,6],[4,3],[5,4],[11,21],[3,6],[1,6],[0,9],[0,4],[1,4],[3,3],[2,1],[3,1],[3,1],[4,-1],[5,-1],[5,-4],[4,-1],[5,-1],[5,-1],[5,-3],[3,-3],[3,-4],[0,-4],[1,-5],[-1,-11],[0,-3],[2,-3],[10,-9],[4,2],[5,7],[4,3],[5,1],[15,1],[6,1],[4,3],[10,6],[2,1],[2,-1],[4,-1],[6,-3],[4,1],[2,3],[1,12],[1,5],[3,6],[3,3],[9,5],[9,19],[5,5],[5,5],[13,7],[19,6],[6,0],[6,-1],[5,-1],[6,-4],[1,-1],[1,-5],[5,-31],[2,-7],[7,-10],[14,-13],[4,-4],[3,-6],[0,-7],[0,-27],[4,-15]],[[5141,5279],[20,4],[4,-1],[3,-3],[1,-3],[0,-8],[0,-4],[1,-3],[1,-4],[1,-9],[1,-6],[0,-5],[-1,-2],[-1,-4],[-6,-7],[-2,-6],[0,-9],[1,-12],[4,-10],[6,-12],[3,-5],[2,-2],[3,-3],[8,-3],[6,-2],[7,-3]],[[5203,5157],[-2,-4],[-3,-16],[-1,-10],[10,-2],[-1,-9],[-2,-9],[-3,-6],[4,-11],[10,-4],[4,-11],[2,-17],[-3,-16],[-7,-2],[-6,-5],[-4,-6],[-1,-7],[-3,-9],[-5,-8],[-3,-6],[-2,-5],[-6,-2],[-2,-4],[-3,-4],[-4,-6],[2,-5],[-2,-4],[-3,-6],[-1,-8],[1,-9],[2,-7],[-4,-2],[-3,0],[-3,3],[-7,4],[-15,-15],[-11,-7],[-8,-8],[-5,3],[-5,5],[-3,6],[-8,10],[2,7],[-1,4],[-2,2],[-3,1],[-2,2],[-2,4],[0,9],[-1,9],[4,4],[2,5],[4,1],[-5,15],[-3,14],[3,8],[1,8],[0,1],[0,9],[-2,5],[2,7],[5,5],[4,1],[-4,7],[-1,4],[-3,12],[-1,11],[5,10],[3,11],[13,-1],[9,-2],[7,0],[6,0],[4,5],[-17,22],[-5,10],[-12,11],[-19,6],[-15,2],[-11,-6],[-8,-5],[-16,-1],[-11,-8],[-8,-21],[-10,-9],[-1,-15],[4,-4],[0,10],[5,3],[3,-1],[-6,-17],[-14,-10],[-13,-7],[-9,-5],[-11,-7],[-4,-7],[-3,-7],[-3,-7],[-3,-8],[1,-5],[4,-9],[-5,-8],[-4,-5],[-7,-15],[-14,-12],[-11,-13],[-4,-24],[-3,-9],[2,-9],[8,-3],[5,-6],[-2,-4],[-14,3],[-46,25],[-26,6],[-24,0],[-32,-13],[-35,15],[-29,3],[-15,0],[-26,-3]],[[4914,5394],[6,-7],[0,-5],[2,-13],[5,-18],[1,-8],[1,-20],[-1,-5],[-2,-9],[0,-5],[1,-12],[0,-7],[-3,-12],[0,-5],[1,-6],[0,-5],[0,-4],[0,-5],[2,-5],[3,-3],[5,-1],[7,2],[7,2],[7,-1],[5,-4],[3,-6],[5,-28],[3,-7],[2,-6],[5,-5],[7,-7],[3,-3],[5,-1],[4,0],[5,2],[5,5],[3,5],[2,3],[1,2],[1,3],[0,4],[0,5],[-1,6],[-1,12],[1,17],[3,17],[2,24],[2,7],[2,6],[3,3],[4,0],[12,-11],[6,-4],[7,-2],[5,-3],[2,-4],[5,-4],[8,-3],[43,7],[23,7]],[[4543,6013],[-5,-8],[-1,-12],[-12,-20],[5,-16],[16,-12],[9,-10],[15,-6],[9,-7],[13,-2],[14,4],[19,-4],[11,3],[6,9],[10,8],[4,13],[4,8],[2,8],[2,7],[-2,9],[4,12],[7,5],[17,10],[28,7],[9,2]],[[4727,6021],[0,-2],[7,-9],[11,-7],[4,-5],[3,-6],[13,-64]],[[5431,8065],[3,0],[1,0],[0,-3],[-3,-3],[-2,0],[-1,1],[-1,2],[1,2],[2,1]],[[5285,8139],[2,-1],[6,0],[2,-1],[1,-3],[-3,-4],[-9,-5],[-1,1],[-2,7],[0,3],[1,3],[3,0]],[[5332,8397],[-13,-13],[-3,2],[-3,4],[-2,5],[1,5],[-2,4],[0,4],[0,10],[-1,4],[-3,5],[-1,5],[1,9],[3,9],[5,7],[4,4],[4,0],[7,2],[4,1],[4,1],[9,7],[3,2],[6,-6],[-4,-9],[-11,-17],[-2,-13],[0,-11],[-1,-11],[-5,-10]],[[7201,9069],[-5,-2],[-3,2],[1,7],[4,5],[10,4],[4,4],[-42,23],[28,-6],[7,-4],[11,-8],[5,-5],[1,-5],[-4,-2],[-12,-4],[-3,-3],[-2,-6]],[[6930,9264],[-2,0],[-1,0],[3,0]],[[6775,9360],[-11,-4],[-14,3],[-27,11],[1,3],[6,0],[8,-1],[7,-3],[5,-4],[5,-3],[14,0],[6,-2]],[[5915,9484],[-3,0],[0,4],[3,2],[2,1],[0,2],[5,5],[1,-2],[2,-3],[-4,-7],[-6,-2]],[[5955,9496],[-4,-6],[-6,1],[-2,5],[4,1],[2,1],[3,1],[3,-3]],[[5903,9804],[-5,-1],[-5,1],[-18,12],[-10,9],[-6,11],[5,9],[-2,3],[-1,5],[-2,2],[12,13],[4,3],[7,2],[11,-4],[10,-7],[8,-9],[11,-16],[3,-7],[-2,-5],[-4,-4],[-2,-6],[-2,-2],[-12,-9]],[[5819,9962],[4,0],[5,2],[6,2],[5,-3],[2,-9],[-5,-47],[-3,-14],[-5,-13],[-2,6],[1,3],[1,4],[-8,16],[-3,11],[-2,9],[2,23],[-1,5],[-10,15],[3,2],[2,1],[1,-1],[2,-2],[1,-2],[4,-8]],[[6145,9969],[12,-25],[13,-14],[28,-21],[12,-13],[103,-131],[24,-53],[5,-9],[11,-8],[16,-28],[62,-74],[11,-6],[13,-23],[20,-14],[24,-27],[28,-24],[6,-2],[6,-3],[12,-14],[6,-5],[14,-4],[3,-2],[6,-14],[0,-3],[9,-10],[3,-3],[47,-30],[72,-30],[0,-3],[-26,4],[-5,-4],[2,-3],[7,-8],[2,-3],[5,-18],[3,2],[1,2],[5,-5],[4,-3],[4,-2],[47,-1],[3,-1],[9,11],[6,5],[5,2],[39,-3],[10,-5],[6,-5],[0,-2],[-4,-1],[-6,-3],[-4,-6],[-7,-23],[11,-5],[4,0],[5,2],[3,5],[4,7],[3,8],[1,7],[4,13],[9,4],[7,-6],[-3,-13],[4,-14],[4,-6],[5,-2],[2,-3],[6,-16],[3,-3],[2,-2],[14,-11],[5,-3],[12,-3],[45,-9],[55,-4],[15,3],[14,9],[37,43],[29,36],[4,5],[23,15],[15,17],[6,2],[5,5],[16,31],[12,12],[7,9],[3,9],[1,2],[3,2],[3,0],[3,-9],[5,-11],[2,-5],[0,-20],[-7,-17],[-19,-27],[-4,-9],[-3,-23],[-3,-7],[-29,-40],[-8,-15],[-7,-16],[-6,-17],[3,-9],[-1,-9],[-4,-9],[-3,-10],[-5,-7],[-1,-6],[0,-6],[1,-3],[13,-31],[5,-8],[21,-23],[4,-7],[4,-8],[2,-9],[1,-10],[1,-4],[5,-4],[1,-8],[4,-11],[9,-40],[7,-17],[10,-16],[16,-13],[-10,-2],[-21,19],[-9,2],[-3,-4],[-1,-5],[2,-5],[5,-2],[6,-1],[6,-3],[1,-3],[-5,-2],[6,-8],[9,-5],[11,-3],[27,-2],[8,-4],[8,-8],[1,6],[-3,4],[-3,3],[-2,7],[2,3],[12,11],[14,16],[4,3],[8,3],[4,2],[2,3],[1,4],[2,3],[4,3],[5,1],[15,-1],[3,1],[4,4],[2,1],[2,0],[1,-1],[1,-1],[1,-1],[4,0],[11,-4],[4,-2],[-2,-5],[-3,-1],[-7,0],[-3,-2],[-6,-9],[-4,-2],[-13,-3],[-3,-2],[-5,-6],[-3,-1],[-9,2],[-5,-1],[-3,-3],[-2,-4],[-3,-5],[-8,-9],[-3,-4],[-2,-5],[-2,-11],[-2,-6],[-2,-3],[-9,-13],[4,-3],[-4,-1],[-6,1],[-7,2],[-8,5],[-6,0],[-10,-4],[-32,0],[-8,-4],[-7,-8],[-8,-4],[-25,-4],[-5,-2],[-4,-3],[-2,-7],[1,-8],[4,-2],[5,0],[5,-2],[-3,-4],[-3,-2],[-12,-2],[-1,-2],[-1,-3],[-2,-3],[-7,-5],[-8,-1],[-16,6],[6,-12],[2,-5],[-1,-6],[-3,-3],[-5,-2],[-21,-3],[-11,0],[-10,4],[-9,9],[0,5],[1,5],[-1,5],[-6,3],[-4,0],[-2,0],[-2,1],[-2,-1],[-2,-3],[-4,-6],[-2,-1],[-3,-2],[-3,-6],[-3,-7],[-1,-6],[2,-6],[4,-5],[5,-5],[4,-5],[-13,-4],[-46,11],[-25,-2],[-8,-5],[-10,2],[-24,9],[-3,2],[-3,4],[-1,4],[-1,5],[-3,5],[-4,2],[-7,-1],[-45,-12],[-45,-23],[-50,-39],[-31,-40],[-49,-45],[-21,-27],[-41,-69],[-32,-63],[-5,-20],[-2,-22],[3,-26],[1,-11],[-1,-9],[-1,-11],[-9,-38],[-4,-9],[-8,-9],[-5,-21],[-3,-6],[-5,2],[-8,6],[-6,7],[-3,5],[-3,9],[-8,9],[-8,8],[-50,36],[-65,25],[-68,43],[-28,10],[-58,44],[-18,21],[-18,22],[-34,5],[-26,19],[-18,22],[-5,4],[-7,2],[-23,13],[-29,9],[-29,-1],[-28,-7],[-39,-17],[-54,-45],[-9,-4],[-6,-7],[-4,-1],[-4,-1],[-3,-1],[-4,-2],[-25,-19],[-5,-7],[-19,-29],[-5,-5],[-3,-1],[-4,-1],[-4,0],[-4,2],[-3,3],[-2,4],[-2,4],[1,2],[13,-3],[3,2],[1,5],[-4,3],[-9,3],[-7,5],[-2,4],[-2,3],[-4,19],[-54,67],[-15,7],[-8,0],[-21,-4],[-23,5],[-8,-1],[-14,-7],[-13,-12],[-11,-16],[-18,-33],[-7,-19],[-5,-20],[-2,-21],[3,-21],[9,-12],[33,-19],[11,-9],[24,-29],[6,-3],[7,2],[12,4],[21,2],[6,2],[7,3],[19,-14],[5,-13],[15,-24],[6,-5],[12,-10],[5,-5],[22,-31],[5,-5],[7,-4],[7,-2],[8,-1],[8,-2],[7,-5],[25,-25],[5,-9],[-3,-4],[-15,-2],[-7,-3],[-6,-5],[-19,-21],[-12,-6],[-15,5],[-28,17],[-16,6],[-16,-1],[-14,-9],[-7,-2],[-3,7],[2,6],[6,5],[3,4],[-2,9],[-6,6],[-8,2],[-7,-1],[-7,-6],[-3,-8],[-5,-20],[-4,-8],[-19,-11],[-3,-4],[-4,-3],[-17,-5],[-5,-3],[-7,-17],[4,-38],[-4,-15],[-10,-8],[-41,-15],[-5,-4],[-5,-7],[-5,-9],[-2,-10],[-4,-7],[-8,1],[-15,8],[-3,0],[-6,-3],[-3,-1],[-4,2],[-8,7],[-3,1],[-5,4],[-3,9],[-5,19],[-9,27],[-2,10],[2,10],[6,14],[5,29],[17,30],[4,19],[1,2],[7,-1],[3,0],[3,5],[1,4],[0,10],[0,3],[-2,4],[0,3],[1,2],[2,2],[4,2],[0,6],[1,7],[1,3],[-2,8],[-2,8],[-1,9],[3,7],[-11,14],[-16,32],[-11,11],[-32,16],[-6,8],[-1,2],[-1,2],[-7,14],[-3,2],[-10,4],[-14,13],[-4,5],[-3,12],[-3,18],[2,9],[3,10],[14,23],[3,11],[4,21],[0,21],[-5,34],[3,18],[11,17],[13,7],[31,2],[8,2],[5,3],[14,19],[3,2],[3,2],[4,0],[3,2],[2,5],[9,18],[4,6],[5,2],[8,-6],[7,-13],[5,-5],[7,-2],[7,6],[2,11],[0,10],[3,5],[6,4],[4,8],[8,19],[5,7],[22,24],[14,10],[6,7],[2,9],[-4,7],[-4,7],[-3,11],[-2,6],[-16,24],[-10,12],[-13,11],[-9,13],[-3,19],[10,34],[16,0],[8,2],[6,5],[1,4],[1,5],[2,4],[2,3],[5,-1],[4,-3],[3,-4],[3,-2],[5,-2],[28,-22],[6,-6],[9,-13],[7,-6],[23,-11],[3,-4],[5,-7],[3,-2],[5,-2],[33,6],[24,10],[8,1],[3,-2],[-3,-6],[-3,-8],[6,-9],[3,-1],[12,-2],[14,-5],[8,-2],[6,-5],[4,-1],[6,1],[5,1],[8,5],[25,20],[21,25],[9,13],[8,18],[6,20],[0,22],[-5,12],[-18,29],[-3,13],[1,9],[4,8],[5,8],[-6,19],[-3,4],[1,9],[-7,20],[-2,11],[2,8],[4,12],[9,16],[5,6],[8,5],[7,4],[14,2],[6,2],[6,4],[18,16],[10,13],[8,16],[6,22],[3,19],[1,19],[-5,98],[3,17],[27,52],[14,80],[1,21],[-4,58],[-9,55],[-11,33],[-43,97],[-4,20],[3,21],[2,3],[6,8],[3,5],[1,5],[1,4],[1,4],[7,12],[0,8],[-3,15],[-1,7],[1,8],[3,7],[5,6],[4,-2],[2,-4],[1,-5],[0,-6],[2,-5],[4,0],[7,3],[15,2],[16,4],[11,9],[4,1],[2,2],[0,6],[0,6],[1,5],[5,8],[8,7],[8,2],[5,-5],[6,-13],[3,-6],[5,-3],[5,-3]],[[4290,5403],[-29,13],[-7,-2],[-6,-3],[-1,-4],[0,-3],[2,-7],[1,-3],[0,-8],[3,-8],[1,-5],[-1,-5],[-3,-6],[-4,-1],[-4,1],[-5,0],[-1,-3],[-1,-4],[1,-5],[-1,-5],[-2,-4],[-4,1],[-4,-1],[-4,-1],[-9,-4],[-8,-8],[-4,-2],[-4,0],[-4,3],[-3,4],[-2,2],[-3,1],[-1,-2],[-2,-4],[-6,-35],[-3,-6],[-2,-5],[-3,-4],[-3,-1],[-4,1],[-4,2],[-8,-1],[-6,-4],[-18,-18]],[[4124,5259],[-18,-3],[-48,16],[-6,4],[-3,4],[-3,5],[-5,6],[-11,15],[-1,6],[-1,5],[3,6],[0,3],[-2,4],[-2,4],[-1,5],[1,4],[3,4],[4,3],[4,3],[1,2]],[[4039,5355],[0,-4],[0,-4],[0,-2],[3,-1],[2,2],[2,3],[4,8],[0,-8],[-2,-9],[1,-6],[6,-3],[9,0],[3,0],[3,2],[7,4],[3,6],[6,7],[8,5],[6,-4],[-1,-2],[-8,-4],[-2,-13],[-4,-3],[7,-3],[17,5],[9,-1],[4,4],[4,7],[0,9],[-9,-5],[-4,9],[-6,2],[5,8],[10,4],[3,-3],[3,-7],[7,0],[5,-9],[6,-2],[7,4],[-3,2],[-3,3],[-4,10],[1,4],[3,1],[4,-4],[4,2],[5,3],[-1,3],[-2,2],[-3,4],[-1,6],[-1,2],[-5,7],[-1,6],[4,0],[5,-5],[5,-4],[4,-3],[11,3],[3,-5],[3,-3],[6,5],[4,5],[6,-2],[3,2],[1,7],[-6,5],[3,10],[0,7],[-1,5],[-4,-1],[-1,13],[9,5],[12,12],[4,-9],[0,-3],[2,-8],[3,-8],[-2,-6],[-3,0],[-2,-5],[6,-5],[1,-5],[7,1],[2,8],[2,2],[1,3],[-1,7],[3,5],[0,4],[1,9],[2,8],[0,7],[-4,9],[-4,8],[-2,6],[-7,6],[-11,15],[-6,7],[0,13],[0,11],[-8,11],[-4,6],[2,12],[8,6],[4,6],[5,15],[5,11],[4,14],[16,24],[4,11],[4,6],[5,12],[-5,10],[2,3],[6,1],[6,-1],[11,6],[10,9]],[[3826,4709],[0,-1],[-2,3],[0,2],[1,2],[2,1],[-1,3],[1,1],[3,-3],[-1,-6],[-2,-2],[-1,0]],[[3858,4794],[0,-8],[3,-6],[8,-10],[2,-8],[-6,-3],[-10,-3],[-7,-6],[-10,-4],[-7,-4],[-11,-12],[-15,-4],[-8,-1],[0,9],[-7,4],[-1,2],[3,8],[4,6],[-12,-4],[-7,10],[-3,11],[4,6],[5,12],[7,-2],[5,3],[25,55],[8,6],[6,4],[2,3],[2,4],[3,8],[2,4],[4,9],[13,8],[5,2],[8,14],[6,10],[6,3],[9,-8],[0,-6],[-3,-6],[-5,-7],[-3,-10],[-4,-11],[-8,-10],[-8,-14],[-10,-16],[-2,-18],[0,-4],[1,-5],[0,-6],[6,-5]],[[3722,4946],[0,-3],[0,-2],[1,-1],[0,-2],[0,-2],[-4,-1],[-2,-1],[1,2],[1,1],[0,1],[-1,0],[-1,1],[-4,-4],[-3,2],[1,1],[0,3],[0,1],[1,1],[0,3],[1,0],[1,-1],[2,-2],[0,2],[1,1],[0,-1],[1,0],[1,1],[1,3],[2,-3]],[[3749,4942],[-1,-2],[-2,4],[-1,2],[0,3],[1,1],[1,1],[2,-1],[3,-2],[0,-4],[-3,-2]],[[3734,4952],[0,-2],[1,2],[1,1],[2,1],[0,-5],[0,-1],[0,-2],[-1,-3],[-1,0],[-2,2],[-2,1],[-2,2],[-2,1],[0,2],[-2,0],[2,2],[3,1],[1,1],[3,1],[1,-1],[-2,-1],[0,-2]],[[3841,5408],[1,-16],[0,-5],[-1,-5],[0,-8],[1,-6],[2,-6],[3,-7],[9,-14],[7,-6],[7,-2],[5,2],[10,7],[4,1],[3,1],[4,-3],[3,-5],[1,-10],[1,-30],[-1,-5],[-1,-5],[-2,-5],[-2,-4],[-3,-3],[-3,-2],[-3,0],[-3,1],[-3,1],[-7,6],[-5,2],[-3,0],[-3,-3],[-1,-6],[-1,-5],[-1,-18],[0,-3],[2,-4],[3,-4],[6,-4],[11,-4],[4,-2],[4,-4],[4,-6],[12,-5],[5,-3],[5,0],[7,5],[3,1],[7,0],[2,-1],[2,-2],[4,-15],[5,-11],[4,-7],[8,-6],[6,1],[5,-1],[5,-2],[4,-4],[2,-5],[4,-2],[8,2],[4,-2],[12,-10],[3,-3],[2,-6],[2,-5],[-2,-6],[-6,-7],[-5,-5],[-5,-2],[-2,-2],[0,-4],[1,-3],[7,-8]],[[4002,5101],[1,-21],[10,-13],[11,-6],[2,-4],[0,-6],[0,-12],[0,-7],[-1,-7],[-1,-9],[0,-10],[3,-15],[2,-15],[-1,-3],[0,-2],[-1,-1],[-3,-5],[-6,-6]],[[4018,4959],[-5,-3],[-6,-2],[-5,3],[-8,9],[-7,0],[-10,-1],[0,-12],[-11,-1],[1,11],[-12,-5],[8,-19],[-10,3],[-3,10],[-6,-1],[0,-11],[-24,-5],[-10,-6],[-11,-2],[-9,8],[-12,0],[-6,1],[-8,11],[-9,5],[-6,6],[-18,14],[-11,5],[-12,12],[-6,4],[-15,5],[-42,-5],[-2,1],[-2,2],[-2,0],[-2,-1],[-1,-2],[-2,-1],[-2,-1],[-2,-1],[-5,1],[-3,1],[-2,4],[1,7],[-2,-1],[-2,-1],[-2,-3],[-1,-3],[0,-4],[-1,0],[-1,0],[-2,-1],[-9,-13],[-2,-3],[-5,1],[-3,2],[-3,3],[-3,1],[-4,-2],[-3,-4],[-2,-5],[1,-5],[-9,-1],[-7,3]],[[3680,5381],[4,6],[12,4],[17,8],[10,7],[12,9],[18,-6],[18,2],[14,0],[25,1],[10,0],[4,-2],[7,-2],[3,-6],[7,6]],[[4124,5259],[9,-9],[18,-25],[1,-7],[-4,-17],[1,-6],[4,-21],[1,-8],[0,-8],[-7,-53],[0,-2],[3,-10],[5,-9],[4,-13],[1,-6],[0,-7],[0,-7],[1,-5],[2,-3],[3,-2],[4,-2],[5,0],[5,1],[4,-3],[2,-5],[2,-5],[3,-2],[8,-5],[4,-5],[3,-5],[1,-4],[1,-9]],[[4218,4970],[-2,-6],[-3,-2],[-4,-2],[-3,1],[-4,3],[-7,5],[-10,5],[-7,0],[-7,-3],[-5,-5],[-8,-4],[-5,0],[-5,2],[-3,3],[-13,5],[-5,3],[-4,3],[-6,7],[-5,5]],[[4112,4990],[3,12],[-2,12],[-3,6],[-6,10],[-11,25],[-4,5],[-4,2],[-4,0],[-4,3],[-5,12],[-2,2],[-3,-2],[-2,-3],[-1,-3],[1,-4],[1,-4],[-2,-3],[-6,0],[-11,7],[-6,6],[-5,8],[-4,9],[-4,4],[-5,2],[-12,1],[-9,4]],[[3841,5408],[5,0],[2,-5],[4,1],[5,-2],[4,-2],[7,7],[2,1],[3,2],[-1,6],[9,7],[7,1],[6,1],[5,4],[13,11],[0,6],[16,6],[16,4],[8,1],[6,5],[7,-7],[4,-9],[5,-4],[5,-9],[4,-10],[0,-8],[-2,-7],[-6,5],[-7,-5],[-4,-10],[-1,-6],[-3,-4],[-9,-13],[-6,-10],[0,-9],[3,-3],[3,1],[1,8],[4,4],[4,8],[5,3],[1,-9],[4,-2],[2,-2],[-3,-2],[-3,-1],[-4,1],[-1,-8],[21,-13],[4,2],[3,3],[4,-7],[-2,-7],[-2,-4],[-3,-9],[0,-3],[1,-6],[4,4],[3,7],[4,8],[6,-1],[8,-4],[2,2],[0,12],[-9,-2],[-8,4],[-4,12],[8,8],[4,2],[9,0],[5,1],[3,4],[3,5],[1,5],[8,6],[-2,-8],[-2,-7],[6,-3],[4,-3],[-1,-7]],[[4158,4561],[-10,16],[-6,2],[-5,1],[-4,-1],[-4,-2],[-4,-1],[-3,0],[-13,4],[-5,1],[-4,-1],[-5,-3],[-5,-6],[-3,-1],[-3,0],[-3,3],[-2,5],[-2,7],[2,13],[2,9],[1,9],[-2,10],[-7,10],[-2,8],[-2,6],[-2,3],[-4,3],[-2,4],[-2,7],[3,8],[8,13],[4,9],[9,13],[5,12],[3,5],[3,3],[3,2],[13,0],[3,4],[0,5],[-5,11],[-8,11],[-2,6],[-1,18],[-4,23]],[[4093,4810],[4,1],[2,3],[2,3],[-1,9],[2,12],[1,7],[-1,8],[-3,13],[-5,11],[-3,5],[-4,5],[-2,3],[0,4],[8,22],[7,35],[2,7],[3,7],[7,25]],[[3967,4839],[-10,-9],[-5,3],[-1,4],[11,11],[5,-9]],[[4093,4810],[-15,-2],[-24,-16],[-6,-1],[-5,0],[-4,1],[-7,0],[-40,-14],[-7,-3],[-40,-11],[-22,1],[-6,2],[-5,9]],[[3912,4776],[6,9],[34,11],[15,16],[8,10],[13,14],[10,18],[7,8],[0,11],[0,5],[6,2],[2,5],[3,3],[2,8],[0,11],[0,13],[-2,12],[-1,11],[3,16]],[[4160,4388],[-1,-2],[-7,-5],[-1,0],[-3,4],[-3,2],[-1,0],[-2,0],[1,4],[2,3],[9,-1],[6,-2],[1,0],[-1,-3]],[[4205,4491],[-1,-2],[-4,-14],[-6,-5],[-1,-8],[-7,-4],[1,-6],[7,-5],[-5,-7],[-11,-14],[-5,-3],[-3,-6],[-19,-7],[-6,-4],[-3,-4],[-5,-11],[2,-9],[0,-6],[-6,2],[-4,-5],[-2,8],[6,8],[-2,6],[-31,4],[-10,2],[-47,22],[-15,4],[-12,11],[-3,4],[-4,6],[0,6],[2,5],[-4,9],[-2,2],[-1,1],[-4,5],[-5,1],[-5,6],[5,11],[12,2],[7,1],[-3,6],[-17,15],[-6,4],[-3,5],[-6,0],[-9,8],[-11,0],[0,8],[-11,7],[-8,11],[-6,18],[-11,8],[-6,-2],[-11,-2],[-2,-2],[0,4],[2,3],[-3,3],[2,2],[5,0],[0,6],[-3,5],[5,6],[5,5],[-2,2],[-6,0],[0,9],[5,7],[7,0],[5,3],[8,5],[3,7],[0,7],[-3,4],[-6,5],[-8,3],[-5,1],[7,16],[0,1],[3,1],[1,1],[1,2],[0,5],[-3,6],[8,1],[13,-1],[1,6],[-4,8],[-4,9],[-6,0],[-4,20],[-5,6],[-9,9],[-10,3],[4,9],[4,6]],[[5772,5444],[1,0],[3,-3],[2,-4],[-3,-11],[-3,-4],[-4,4],[-3,4],[-3,4],[-8,-2],[-11,-6],[-16,-6],[-1,7],[-18,-4],[-21,-17],[-36,-41],[-20,-35],[-12,-51],[6,-24],[3,-13],[-3,-19],[-2,-18],[-1,-11],[-6,-10],[-9,2],[-6,-11],[1,-7],[-4,-5],[-5,1],[-3,6],[-5,-7],[-9,2],[-5,-11],[-12,2],[-14,1],[-7,2],[-9,-12],[-2,-10],[-8,-7],[-6,-1],[-11,-9],[-10,-8],[-3,-6],[-2,-9],[-4,-6],[0,-8],[0,-9],[-3,-6],[-3,-4],[-6,-5],[-8,-2],[-6,-1],[-4,2],[-5,-1],[-4,-2],[-1,3],[-5,3],[0,4],[0,7],[-4,4],[-10,5],[-7,1],[-2,4],[0,5],[4,0],[6,-1],[4,0],[4,1],[4,2],[2,4],[4,1],[6,-2],[3,2],[1,4],[-1,6],[-4,4],[-6,3],[0,4],[3,5],[1,5],[0,5],[-3,9],[-1,5],[0,17],[-5,10],[1,6],[-1,7],[1,7],[9,7],[4,4],[1,11],[-6,12],[0,10],[-13,5],[-8,4],[-1,2],[7,0],[7,5],[0,9],[5,5],[2,8],[15,-5],[5,6],[0,7],[-2,14],[4,5],[9,4],[6,6],[7,2],[8,6],[4,9],[7,10],[10,14],[6,-1],[2,7],[2,5],[-5,0],[-1,9],[-2,8],[-5,5],[-5,8],[-5,4],[-7,9],[-4,-1],[-4,5],[-11,2],[-10,-5],[6,-12],[-8,-5],[-5,-5],[-2,4],[-4,1],[-3,3],[-2,0]],[[5451,5396],[4,14],[2,5],[1,12],[-7,37]],[[5451,5464],[4,34],[-1,9],[-2,9],[-3,5],[-6,11],[-3,7],[-11,37],[-3,9],[-11,20]],[[5415,5605],[6,0],[7,-3],[4,2],[20,-34],[21,-31],[12,-12],[51,-27],[14,-5],[6,-1],[42,4],[8,2],[7,11],[8,3],[22,3],[29,-1],[6,-3],[18,-14],[15,-5],[7,-4],[6,-6],[14,-22],[7,-8],[7,-6],[8,-4],[11,-1],[1,1]],[[5752,5962],[-2,-5],[-13,-24],[-3,-8],[-16,-70],[-17,-36],[-5,-16],[-5,-34],[0,-7],[5,-18],[0,-7],[-2,-12],[-13,-16],[-4,-10],[0,-17],[4,-40],[10,-30],[12,-38],[46,-96],[13,-22],[4,-8],[3,-3],[3,-1]],[[5415,5605],[-6,2],[-3,2],[-4,4],[-8,13],[-3,7],[-1,5]],[[5390,5638],[-7,24]],[[5383,5662],[5,-1],[3,0],[8,2],[14,6],[12,8],[3,3],[5,11],[3,7],[7,9],[6,3],[5,-1],[3,1],[4,1],[4,9],[15,16],[4,2],[3,1],[6,-2],[3,0],[3,0],[9,4],[5,5],[10,4],[9,2],[9,-3],[4,1],[5,4],[3,7],[6,20],[4,8],[6,11],[2,8],[0,11],[-2,39],[-3,17],[0,8],[2,5],[5,5],[5,5],[3,4],[-4,12],[-1,8],[0,22],[-2,15],[0,9],[0,7],[-2,10],[-1,13]],[[5571,5998],[16,-9],[6,-5],[8,-10],[8,-8],[8,-9],[9,-10],[14,-10],[6,-1],[4,3],[5,7],[3,3],[3,5],[5,7],[11,8],[1,4],[-1,6],[-1,6],[-1,5],[1,5],[2,4],[2,0],[3,-2],[1,-4],[4,-4],[5,-4],[23,-11],[4,-2],[32,-10]],[[5426,5340],[-2,-4],[-11,-9],[-10,-9],[-9,-1],[-6,3],[-5,-2],[-3,-5],[6,-3],[6,-4],[2,-3],[-2,-6],[2,-8],[-4,0],[-8,4],[-4,-4],[2,-6],[4,-5],[0,-18],[-2,-6],[0,-8],[0,-5],[3,-6],[2,6],[4,-3],[5,-11],[13,-2],[4,-7],[-6,-7],[1,-2],[0,-2],[1,-1],[-2,-8],[-12,1],[-8,-7],[-1,-7],[3,-9],[3,-4],[1,-5],[-3,-1],[-3,-1],[-8,2],[-5,-4],[-3,1],[-1,4],[1,5],[0,10],[-4,13],[7,5],[-2,3],[-5,2],[-2,7],[-9,14],[-1,4],[-2,5],[-4,0],[-1,9],[-6,-2],[-6,1],[-6,-2],[-7,6],[-17,2],[-27,-6],[-15,-4],[-16,-5],[-16,-10],[-12,-13],[-1,-24],[5,-22],[-12,6],[-9,-15]],[[5141,5279],[2,10],[8,16],[6,6],[6,4],[7,3],[29,19],[3,4],[3,6],[2,6],[3,21],[1,6],[-2,16],[3,10]],[[5212,5406],[8,-1],[12,-9],[6,-4],[14,-15],[7,-4],[10,-3],[14,-1],[11,-3],[7,-5],[6,-8],[3,-5],[10,-17],[2,-1],[1,0],[1,0],[1,2],[0,2],[1,5],[-1,15],[1,4],[3,0],[1,2],[1,2],[-2,3],[-8,10],[-2,3],[0,2],[3,1],[5,-4],[3,0],[1,3],[1,3],[3,2],[3,2],[5,1],[4,-1],[37,-22],[2,-3],[2,-2],[10,-8],[27,-12],[1,0]],[[5451,5464],[-19,6],[-15,2],[-6,-2],[-3,-2],[-3,-4],[-2,-1],[-3,0],[-21,1],[-5,-2],[-3,-3],[-4,-4],[-22,-3],[-2,3],[-1,4],[-1,4],[-2,1],[-3,0],[-4,-2],[-9,-6],[-4,-2],[-6,-2],[-8,0],[-8,1],[-31,22],[-6,4],[-68,20],[-5,3],[-10,8],[-3,1],[-3,-1],[-13,-9],[-10,-10]],[[5148,5491],[-17,1],[-13,4],[-10,4],[-27,19]],[[5076,5553],[5,6],[5,8],[1,1],[1,5],[2,4],[3,3],[4,2],[6,2],[24,17],[32,18],[20,9],[5,4],[2,5],[0,7],[0,5],[1,5],[2,5],[13,24],[6,10],[1,1],[8,-1],[13,-5],[5,-1],[2,-1],[11,-6],[23,-6],[24,-3],[11,-5],[10,-7],[9,-9],[13,7],[16,-1],[15,-5],[21,-13]],[[5383,5662],[-5,11],[-10,12],[-6,4],[-27,6],[-7,1],[-4,-1],[-5,-2],[-4,-1],[-6,5],[-7,10],[-3,5],[-3,6],[-9,12],[-4,4],[-1,5],[-1,5],[1,4],[1,4],[1,3],[3,6],[3,3],[5,10],[1,7],[3,8],[0,5],[2,6],[2,4],[2,5],[2,3],[1,3],[2,6],[4,3],[2,5],[1,5],[-1,6],[-3,5],[-4,2],[-19,3],[-3,1],[-4,3],[-10,8],[-2,6],[1,6],[2,8],[4,13],[1,7],[0,18],[1,5],[3,6],[3,4],[3,5],[2,4],[1,3],[-1,4],[-2,3],[-3,3],[-4,6],[-1,5],[1,5],[7,14]],[[5289,5987],[15,11],[12,15],[6,3],[15,5],[54,37],[23,11],[5,1],[9,1],[10,11],[12,12],[8,4],[10,2],[13,-2],[45,-16],[5,-3],[17,-16],[4,-3],[2,-2],[2,-5],[1,-6],[2,-5],[3,-3],[5,-4],[2,-1],[0,-1],[1,-5],[2,-22],[-1,-8]],[[5968,81],[-2,0],[-2,1],[-1,3],[2,3],[3,-1],[1,-3],[-1,-3]],[[9998,114],[-1,-1],[-2,1],[0,3],[3,2],[1,-2],[-1,-3]],[[9993,125],[-4,-7],[-4,9],[4,2],[4,-4]],[[5914,324],[-4,-4],[0,16],[1,6],[2,6],[4,2],[6,1],[6,0],[3,-2],[3,-5],[-3,-2],[-5,-1],[-4,-1],[-3,-5],[-6,-11]],[[5912,645],[-3,-3],[-4,4],[-1,6],[1,5],[5,1],[3,-3],[0,-5],[-1,-5]],[[6185,1240],[3,-1],[4,0],[0,-3],[-3,-4],[0,-3],[3,-2],[5,-1],[0,-3],[-1,-2],[-1,0],[0,-1],[0,-3],[3,2],[1,0],[1,-2],[1,-4],[-4,0],[-1,-3],[-1,-4],[2,-5],[-7,6],[-6,14],[-9,27],[2,1],[1,-1],[3,-2],[2,-4],[2,-2]],[[6217,1417],[-2,-15],[-6,-5],[-6,5],[-6,13],[11,-7],[-1,4],[-2,4],[-2,3],[-2,2],[4,2],[5,1],[4,-2],[3,-5]],[[6212,1427],[-2,0],[-2,0],[-3,2],[-1,2],[-2,1],[-2,1],[0,1],[0,3],[0,3],[1,1],[1,-2],[8,-5],[2,-3],[1,-2],[-1,-2]],[[6202,1449],[-2,-3],[-2,6],[1,7],[1,5],[4,0],[1,-5],[-1,-5],[-2,-5]],[[5778,1487],[-3,-7],[-1,7],[2,2],[2,-2]],[[6207,1608],[1,-4],[-2,6],[1,-2]],[[6201,1665],[1,-8],[-5,6],[1,4],[3,-2]],[[6185,1691],[-1,-2],[-5,5],[0,1],[3,1],[3,-1],[0,-4]],[[6175,1716],[-2,-4],[0,5],[1,1],[1,-2]],[[6166,1716],[-1,-4],[-1,5],[1,1],[1,-2]],[[5597,2996],[-3,-1],[-2,3],[0,3],[2,2],[3,0],[3,-3],[-3,-4]],[[5510,3446],[-1,0],[0,1],[1,-1]],[[5509,3447],[-1,-1],[0,1],[0,1],[1,-1]],[[5417,3925],[5,-14],[-6,5],[1,9]],[[5395,4233],[3,-8],[-4,0],[-2,3],[-2,6],[2,1],[3,-2]],[[5445,4193],[-3,-3],[-5,0],[-6,3],[-5,5],[-3,10],[-11,18],[-1,7],[4,6],[5,2],[8,-7],[7,-5],[8,-4],[8,-4],[4,-9],[-2,-6],[-8,-13]],[[5373,4570],[-4,-2],[-5,1],[-4,4],[0,8],[4,7],[5,0],[3,-3],[1,-2],[3,-6],[-1,-3],[-2,-4]],[[5345,4654],[-9,-1],[-6,12],[2,15],[9,9],[11,0],[6,-11],[-4,-14],[-9,-10]],[[5219,4724],[-4,-1],[-3,2],[0,3],[2,4],[1,3],[0,2],[0,2],[2,8],[3,2],[5,-2],[2,-4],[2,-8],[-2,-2],[-4,-1],[-4,-8]],[[5245,4788],[-4,-4],[-2,1],[-3,-1],[0,3],[3,3],[1,1],[0,2],[1,0],[1,-1],[3,-4]],[[5264,4793],[-5,-6],[-4,8],[0,6],[3,16],[2,4],[3,3],[4,6],[3,1],[0,-8],[-2,-15],[-4,-15]],[[5269,4857],[-2,-2],[-1,2],[1,1],[2,-1]],[[5266,4880],[-4,-5],[-4,6],[5,4],[3,-5]],[[5319,4953],[-4,-1],[-6,0],[-20,11],[-3,9],[0,22],[2,14],[14,-4],[5,-4],[7,-4],[4,-7],[2,-9],[0,-11],[0,-11],[-1,-5]],[[5227,5122],[1,-3],[-2,1],[-1,1],[2,1]],[[5451,5396],[-4,3],[-3,-4],[-2,-7],[-4,4],[-1,7],[-4,0],[-2,-9],[-4,-7],[-5,7],[1,10],[-4,6],[-2,-10],[3,-14],[6,-10],[0,-6],[4,-13],[-4,-6],[1,-6],[-1,-1]],[[5212,5406],[-28,20],[-14,17],[-3,7],[-4,7],[-7,25],[-8,9]],[[5793,7543],[-6,-7],[-7,-6],[-5,-7],[-5,-10],[1,-5],[1,-4],[0,-5],[0,-3],[-1,-5],[-1,-7],[1,-6],[-2,-6],[-3,-7],[-1,-5],[0,-6],[1,-6],[0,-29],[1,-5],[0,-4],[1,-9],[2,-8],[5,-14],[0,-6],[-2,-4],[-3,-2],[-4,0],[-4,1],[-4,0],[-4,-1],[-3,-3],[-3,-4],[-1,-5],[0,-5],[1,-6],[2,-3],[8,-7],[3,-5],[-1,-4],[-1,-5],[-5,-9],[-2,-5],[-3,-7],[4,-12],[2,-8],[2,-7],[0,-8],[-1,-6],[-2,-5],[-4,-10],[-14,-18],[-3,-7],[-3,-8],[-5,-17],[-12,-26],[-6,-20],[1,-6],[1,-6],[6,-15],[3,-15],[2,-5],[3,-3],[3,-6],[2,-3],[3,-3],[6,-6],[3,-3],[2,-4],[1,-6],[0,-6],[1,-5],[3,-3],[2,-3],[2,-4],[0,-3],[-3,-2],[-4,-3],[-3,-4],[-4,-10],[-1,-6],[1,-7],[2,-6],[5,-5],[4,-3],[3,-4],[1,-5],[-1,-5],[-7,-16],[-5,-25]],[[5739,6941],[-8,-3],[-2,-3],[-5,-5],[-5,-5],[-17,-13],[-21,-8],[-6,0],[-5,1],[-4,4]],[[5666,6909],[-17,5],[-10,11],[-5,11],[-3,11],[-6,6],[-20,13],[-7,1],[-11,1],[-24,5],[-5,3],[-4,4],[-2,3],[-4,2],[-5,0],[-7,1],[-8,5],[-11,9],[-11,13],[-3,1],[-4,1],[-6,-2],[-3,-2],[-4,-1],[-3,0],[-25,8],[-1,0],[-1,0]],[[5456,7018],[4,8],[1,9],[1,19],[2,15],[4,17],[5,12],[10,5],[10,13],[8,38],[10,45],[3,90],[0,14],[-7,19],[0,11],[-3,15],[-8,12],[-12,14],[-14,8],[-15,-2],[-4,-5],[-3,-6],[-3,-4],[-6,-2],[-21,0],[-3,4],[-4,12],[-3,5],[-7,10],[-1,10],[5,3],[-6,4],[-1,13],[0,8],[14,-11],[19,-9],[7,-1],[14,11],[12,16],[24,50],[5,20],[-2,10],[5,15],[2,6],[3,45],[2,11],[-4,6],[-5,4],[-11,12],[-6,7],[0,5]],[[5477,7629],[12,2],[5,-1],[5,4],[4,4],[7,6],[5,1],[6,-1],[5,-3],[8,-3],[58,0],[9,4],[9,8],[9,3],[8,0],[4,-2],[2,-3],[2,-5],[13,-7],[17,-15],[5,-2],[2,2],[3,3],[5,3],[6,0],[4,-1],[4,-2],[5,-3],[5,0],[4,1],[9,5],[4,0],[5,0],[10,10],[8,4],[5,4],[5,9],[5,5],[10,3],[6,-1],[15,-7],[4,-3],[4,-4],[1,-2],[1,-2],[0,-2],[0,-2],[0,-3],[-2,-2],[-1,-2],[0,-1],[3,-3],[2,-3],[2,-4],[1,-14],[0,-6],[-2,-5],[-2,-5],[-1,-4],[-1,-9],[-3,-10],[0,-6],[0,-6],[-3,-13]],[[6036,7639],[-2,-1],[-28,-19],[-3,-5],[-1,-5],[-1,-4],[-2,-5],[-4,-3],[-5,-2],[-8,1],[-13,5],[-6,-1],[-7,-2],[-16,-8],[-8,-2],[-7,1],[-3,3],[-4,3],[-4,0],[-19,-10],[-50,-33],[-20,-21],[-4,-2],[-4,-1],[-4,1],[-4,2],[-16,12]],[[5477,7629],[-1,3],[1,20],[0,20],[-1,11],[-3,4],[-1,8],[-4,7],[-13,-1],[-6,3],[1,9],[6,7],[7,8],[8,2],[4,11],[7,4],[3,7],[6,12],[3,11],[16,12],[7,-1],[9,-8],[4,-2],[4,0],[6,2],[5,6],[14,11],[6,-3],[7,2],[6,6],[4,8],[8,28],[4,29],[3,9],[-1,11],[2,10],[1,13],[6,-11],[3,-3],[4,-2],[2,-4],[4,1],[-2,12],[-2,4],[2,3],[3,1],[4,-2],[3,0],[-1,4],[-2,2],[-6,0],[-4,0],[-5,0],[-2,2],[-1,3],[-3,-2],[-2,-2],[-1,2],[0,12],[0,5],[-7,14],[-6,3],[-6,1],[-5,1],[-1,5],[3,3],[9,0],[7,-2],[5,7],[3,10],[1,9],[-1,5],[0,4],[1,12],[3,5],[-1,5],[1,4],[6,-6],[6,-5],[4,-1],[6,-8],[8,-12],[9,-7],[7,0],[8,7],[5,10],[8,3],[14,-3],[13,-12],[3,-10],[-2,-13],[-1,-13],[-1,-5],[0,-6],[2,-10],[1,-14],[5,-15],[6,-53],[9,-19],[16,-9],[15,2],[10,13],[7,8],[6,14],[-1,4],[-1,5],[1,3],[1,2],[-2,1],[-3,-1],[-2,1],[-2,3],[2,2],[4,0],[0,4],[0,3],[3,3],[0,3],[1,2],[3,9],[2,1],[5,-1],[3,-6],[8,-1],[3,-1],[3,-6],[3,-4],[5,-5],[0,-3],[-1,-1],[-1,-2],[0,-4],[1,-1],[4,-1],[6,-2],[8,-5],[4,-2],[4,1],[3,-3],[2,-5],[3,-6],[3,-2],[6,-4],[5,0],[6,2],[6,6],[7,10],[13,35],[3,13],[2,31],[2,8],[-1,4],[2,5],[4,4],[3,4],[1,9],[-2,14],[-5,12],[-6,13],[-10,12],[-7,6],[-7,0],[-3,-6],[-2,-4],[-3,-4],[0,-2],[2,-1],[2,4],[2,2],[1,1],[0,-1],[-1,-3],[-3,-5],[-11,-10],[-6,-2],[-7,-7],[-4,-6],[-8,1],[-9,5],[-5,-1],[-4,1],[-5,-3],[-5,-7],[-13,0],[-5,-5],[-5,1],[-4,-1],[-11,-8],[-5,-8],[-5,0],[-11,7],[0,19],[0,5],[4,5],[3,13],[-2,8],[4,12],[2,12],[2,8],[0,4],[3,4],[3,13],[1,10],[3,15],[6,5],[10,17],[4,5],[1,2],[2,9],[0,6],[-2,5],[1,2],[1,5],[2,3],[4,-6],[8,-5],[4,-6],[5,-5],[5,-4],[3,-1],[6,-2],[14,-1],[14,-8],[11,-14],[5,-8],[7,-5],[1,-4],[4,-5],[13,-9],[13,-7],[13,0],[10,4],[11,5],[9,9],[7,7],[5,6],[4,5],[1,-2],[1,-3],[-2,-3],[1,-4],[0,-2],[-3,-2],[1,-2],[1,-2],[-1,-4],[-4,-6],[-1,-7],[-3,-10],[-3,-8],[-4,-26],[-2,-12],[0,-4],[-4,-28],[1,-11],[1,-4],[-1,-6],[0,-6],[1,-5],[-4,-29],[1,-25],[1,-20],[1,-6],[4,-48],[5,-43],[5,-26],[10,-35],[4,-9],[3,-6],[9,-11],[4,-3],[5,0],[4,3],[5,2],[2,-5],[3,-5],[11,-9],[18,-24]],[[5795,6447],[9,-18],[11,-24],[3,-16],[2,-7],[3,-5],[1,-6],[0,-9],[-1,-4],[-3,-6],[-1,-3],[2,-3],[4,-7],[1,-4],[4,-126],[-1,-16],[-7,-34],[0,-14],[-3,-6],[0,-44],[0,-5],[-6,-15],[-4,-41],[-5,-17],[-11,-12],[-3,-2],[-8,-2],[-10,-8],[-8,-3],[-5,-6],[-3,-2],[-2,-2],[-1,-5],[0,-9],[-1,-4]],[[5289,5987],[-29,9],[-8,0],[-6,2],[-3,2],[-1,8]],[[5242,6008],[4,7],[1,18],[3,13],[0,5],[-2,24],[0,12],[1,6],[0,5],[-2,4],[-7,17],[-1,3],[-3,0],[-3,-1],[-3,0],[-2,3],[-4,8],[-1,6],[1,7],[9,20],[2,6],[5,27],[0,6],[-2,6],[-2,4],[-2,5],[-1,4],[1,5],[2,5],[4,5],[6,3],[12,0],[20,7],[5,0],[9,-2],[4,1],[4,13],[3,4],[5,3],[15,-1],[5,1],[7,2],[4,1],[9,-2],[3,1],[1,5],[-1,21],[-1,7],[-2,5],[-2,4],[-1,3],[0,5],[1,5],[3,6],[16,20],[22,39],[7,7],[12,19]],[[5406,6415],[13,-2],[4,-3],[4,-2],[6,0],[6,3],[8,0],[9,-3],[3,0],[5,1],[4,3],[5,-1],[4,-6],[7,-12],[4,-5],[4,-3],[3,-1],[2,0],[10,1],[4,0],[4,-2],[3,-3],[7,-8],[3,-3],[5,0],[4,2],[6,6],[4,1],[3,1],[4,-1],[3,-1],[3,0],[4,1],[3,1],[2,2],[10,10],[3,5],[1,9],[-2,15],[-1,19],[1,16],[1,9],[0,18]],[[5582,6482],[16,-9],[11,0],[12,4],[4,0],[13,-5],[4,-4],[4,-4],[5,-11],[4,-3],[4,-1],[2,0],[19,4],[13,-4],[5,-3],[7,-2],[6,-5],[3,-6],[1,-6],[-1,-11],[1,-3],[1,-4],[3,-4],[12,-10],[10,-4],[5,1],[2,2],[-4,4],[1,1],[16,0],[5,2],[2,4],[1,5],[1,13],[0,4],[-1,10],[1,4],[3,3],[5,2],[15,1],[2,0]],[[6023,6949],[-2,1],[-12,3],[-9,4],[-9,2],[-8,0],[-5,-1],[-5,-5],[-1,-6],[0,-8],[1,-7],[0,-5],[-1,-4],[-1,-3],[-3,-4],[-2,-3],[-3,-4],[-1,-4],[0,-5],[0,-4],[0,-10],[0,-4],[-1,-4],[-1,-3],[-9,-9],[-3,-2],[-17,9],[-7,2],[-4,2],[-3,-2],[-2,-2],[-2,-4],[-3,-3],[-9,-5],[-3,-3],[-5,-7],[-3,-2],[-3,0],[-12,10],[-11,5],[-4,6],[-7,11],[0,4],[2,4],[5,5],[1,1],[0,2],[-3,3],[-5,3],[-12,2],[-22,0],[-4,1],[-6,2],[-22,16],[-29,15],[-19,2]],[[6036,7639],[3,-4],[10,-13],[2,-9],[5,-5],[4,-7],[1,-5],[5,-11],[1,-3],[1,-6],[2,-4],[6,-8],[8,-18],[4,-12],[-2,-5],[-4,-1],[-3,-4],[-1,-5],[1,-4],[4,-4],[9,-4],[3,-3],[4,-10],[-3,-5],[-6,-6],[-3,-10],[1,-11],[4,-7],[21,-21],[4,-3],[3,-1],[3,-2],[2,-10],[1,-5],[1,-5],[-2,-5],[-4,-6],[-1,-3],[4,-8],[2,-4],[2,-3],[2,-4],[1,-14],[1,-6],[8,-29],[1,-2],[-1,-3],[1,-3],[1,-4],[-1,-3],[-4,-5],[-1,-2],[-2,-11],[-1,-21],[-1,-7],[-4,-10],[-2,-6],[2,-7],[15,18],[8,1],[-2,-4],[-1,-3],[1,-3],[2,-2],[-3,-8],[1,-5],[9,-10],[2,-1],[1,-2],[1,-3],[-1,-5],[-1,-1],[-2,-2],[-1,-3],[-2,-2],[-11,-16],[-5,-3],[-11,-5],[-4,-5],[6,-8],[8,1],[7,7],[3,8],[3,3],[4,-3],[3,-5],[-4,-3],[-2,-2],[-1,-7],[0,-8],[-2,-3],[-7,-1],[-3,-1],[-3,1],[-3,-1],[-3,-3],[-7,-7],[-4,-3],[8,-4],[-3,-7],[-9,-7],[-7,-7],[7,-3],[7,3],[6,5],[5,4],[1,-11],[-7,-7],[-15,-8],[2,-2],[2,-3],[1,-4],[-2,0],[-6,0],[-3,0],[0,-6],[0,-6],[11,-1],[5,1],[1,-10],[-7,-7],[-9,-4],[-7,2],[1,-7],[4,-3],[10,0],[-3,-8],[-7,-5],[-8,-2],[-8,-1],[5,-7],[16,-13],[1,-6],[-7,-3],[-18,6],[-6,-6],[14,-8],[4,-5],[-4,-2],[-4,-1],[-4,0],[-4,0],[0,-3],[4,-2],[4,-5],[3,-4],[-3,-2],[-13,4],[-13,-3],[-7,1],[-6,5],[0,-7],[2,-5],[3,-5],[2,-6],[-4,1],[-3,-1],[-4,-6],[4,-2],[2,-4],[-1,-5],[-4,-2],[-4,2],[-5,4],[-3,5],[-2,5],[4,2],[2,5],[-13,0],[-4,-5],[0,-8]],[[5968,6631],[4,-3],[0,-2],[2,-3],[1,-2],[0,-3],[2,-1],[0,-2],[1,-1],[0,-1],[-1,0],[-2,2],[-4,0],[-2,4],[-2,3],[-2,1],[-1,1],[0,2],[1,3],[1,1],[2,1]],[[5954,6635],[-5,-4],[-1,4],[0,3],[0,2],[4,4],[1,-5],[1,-4]],[[6005,6627],[-3,-4],[-5,6],[-4,9],[3,4],[2,2],[2,-1],[2,-1],[2,-2],[1,-3],[-1,-5],[0,-2],[1,-3]],[[5858,6651],[-2,0],[-2,4],[1,1],[2,2],[1,2],[1,-4],[-1,-5]],[[6018,6895],[1,-1],[1,0],[1,-1],[0,-2],[-1,-2],[-2,-3],[-3,2],[-2,7],[-1,2],[-1,3],[1,1],[-1,1],[-1,3],[3,2],[3,1],[3,1],[1,-1],[0,-4],[-1,-4],[-1,-1],[0,-4]],[[5582,6482],[2,30],[2,7],[4,6],[4,2],[12,2],[5,1],[6,5],[6,6],[5,11],[9,11],[3,6],[3,11],[1,7],[0,8],[-1,17],[3,11],[2,7],[2,6],[7,11],[3,7],[3,11],[7,10],[3,3],[2,4],[4,16],[4,11],[1,6],[-2,7],[-2,4],[-3,4],[-2,5],[-1,8],[-1,20],[-1,8],[-4,10],[-1,6],[0,5],[2,5],[4,1],[5,-1],[4,1],[3,3],[3,5],[1,5],[1,7],[0,11],[0,10],[1,2],[2,5],[1,4],[-1,5],[-6,11],[-6,15],[-11,17],[-4,11]],[[6023,6949],[0,-1],[2,-20],[7,-23],[2,-10],[-7,6],[-1,2],[-1,6],[-1,3],[-2,1],[-2,0],[-2,-2],[-2,0],[-6,-1],[-4,-1],[-1,-4],[0,-9],[1,-9],[1,-4],[-1,-3],[-4,-6],[-14,-12],[-3,-6],[3,-2],[2,-4],[4,-7],[6,-5],[1,-5],[-2,-7],[-2,-2],[-2,1],[-1,3],[-2,0],[-2,-2],[-4,-6],[-3,-3],[-8,-3],[-3,-2],[-6,-6],[0,-2],[4,-5],[3,-2],[15,-1],[1,-3],[-2,-7],[-3,-6],[-2,-3],[-15,-13],[5,-6],[6,-7],[5,-4],[4,7],[5,-7],[1,-7],[0,-8],[-1,-9],[-4,1],[-2,2],[-2,4],[-1,5],[-5,-18],[-2,-4],[2,-1],[1,-2],[1,-2],[1,-2],[-9,-2],[-3,-3],[-1,-3],[3,-5],[-1,-4],[1,-4],[3,-4],[4,3],[6,2],[6,-2],[4,-6],[-5,2],[-4,0],[-4,-2],[-3,-7],[8,-5],[1,-10],[1,-10],[4,-7],[-2,-3],[-4,-13],[-2,1],[-9,11],[-2,1],[-5,0],[-2,2],[-1,3],[1,3],[1,2],[0,3],[-3,3],[-10,6],[2,3],[3,10],[-4,5],[-3,0],[-3,-2],[-4,0],[-4,2],[-3,2],[-7,8],[-7,3],[-9,-1],[-24,-6],[-9,-4],[-7,-7],[-3,-11],[1,-11],[-1,0],[-6,0],[-2,3],[-5,19],[-2,-2],[-3,-1],[-3,1],[-3,2],[-5,-5],[-5,-6],[-4,-8],[-1,-9],[3,1],[3,1],[3,-2],[2,-4],[-1,-3],[-3,-3],[-3,-2],[-3,-3],[-11,-16],[-10,-17],[-7,-17],[-13,-57],[-2,-19],[0,-20],[4,-34],[0,-1]],[[4992,6528],[1,-5],[3,0],[3,8],[11,-1],[15,4],[11,-1],[0,-18],[-3,-9],[-13,-25],[-4,-8],[-4,-18],[-5,-7],[-37,-29],[-34,-14],[-7,-1],[-3,0],[-4,2],[-2,4],[-1,4],[1,5],[3,2],[15,4],[4,3],[1,6],[0,21],[4,7],[10,14],[4,7],[-9,14],[-21,-9],[-5,14],[0,11],[1,10],[2,9],[3,8],[14,22],[5,15],[6,6],[6,5],[3,5],[14,18],[9,7],[13,26],[3,3],[3,2],[8,0],[2,-2],[0,-5],[-4,-31],[-7,-28],[-13,-37],[-2,-9],[0,-9]],[[5244,6702],[-1,0],[-1,2],[1,1],[2,3],[0,3],[-1,2],[3,2],[0,1],[2,1],[1,4],[2,3],[2,0],[0,2],[2,1],[0,-4],[0,-3],[-1,-4],[-3,-6],[-1,-3],[-2,-1],[-4,-4],[-1,0]],[[5242,6008],[-5,2],[-3,1],[-4,1],[-3,2],[-4,14],[-1,3],[-3,2],[-1,0],[-1,2],[-3,2],[-1,2],[-3,5],[-1,2],[-3,4],[-4,1],[-3,-1],[-3,-5],[-3,-8],[-2,-4],[-1,-1],[-6,-5],[-20,-7],[-2,-2],[-2,-5],[0,-14],[1,-6],[0,-6],[-1,-3],[-11,-4],[-3,-4],[-1,-4],[-1,-12],[-2,-3],[-5,-5],[-17,-7],[-4,-3],[-3,-12],[-2,-5],[-4,-5],[-9,-3],[-8,-2],[-7,1],[-13,-8]],[[4727,6021],[22,6],[40,20],[28,13],[34,25],[17,9],[7,9],[7,10],[22,-5],[13,4],[13,7],[25,22],[37,42],[36,26],[9,12],[6,15],[8,19],[12,22],[19,19],[9,15],[6,17],[14,59],[6,17],[10,14],[23,22],[42,33],[3,5],[7,-1],[13,2],[27,15],[8,6],[21,18],[33,42],[6,9],[2,8],[10,96],[3,17],[6,20],[12,25],[7,17]],[[5350,6752],[4,-1],[29,-15],[9,-3],[4,-2],[3,-2],[0,-4],[-1,-4],[0,-5],[0,-7],[-1,-17],[1,-8],[3,-5],[4,-5],[4,-4],[5,-4],[5,-2],[9,0],[4,-1],[13,-11],[3,-4],[2,-3],[3,-7],[0,-6],[-2,-10],[-3,-6],[-3,-5],[-12,-11],[-5,-3],[-5,-1],[-7,-1],[-12,1],[-5,0],[-5,-3],[-2,-7],[-5,-54],[-7,-14],[0,-6],[0,-13],[0,-1],[-3,-9],[-1,-5],[0,-11],[-4,-11],[0,-6],[0,-6],[4,-8],[7,-9],[11,-8],[12,-10]],[[5350,6752],[10,29],[6,19],[9,16],[28,30],[11,15],[8,18],[13,57],[14,43],[3,14],[2,17],[2,7],[0,1]],[[2204,3963],[-2,-3],[0,9],[2,1],[3,-1],[0,-1],[0,-2],[-2,-3],[-1,0]],[[1921,3966],[-1,0],[-3,2],[3,4],[1,0],[0,-6]],[[1901,3985],[-1,-2],[-4,1],[0,2],[2,2],[3,-3]],[[2196,4009],[-1,-1],[-1,3],[-2,2],[1,3],[3,-2],[0,-5]],[[2205,4028],[-2,-1],[-2,3],[-1,1],[0,1],[0,2],[-1,0],[-2,5],[4,-3],[2,-4],[2,-4]],[[1824,4042],[-1,-6],[-3,5],[2,5],[2,4],[3,-4],[-3,-1],[0,-3]],[[1954,4060],[0,-2],[0,-2],[-2,-1],[-3,1],[-1,-2],[0,-2],[0,-1],[-1,0],[-1,1],[-1,1],[-2,0],[-2,-1],[0,5],[4,2],[2,0],[1,3],[-1,5],[1,6],[2,1],[2,-1],[1,-5],[1,-5],[0,-3]],[[1901,4059],[3,-8],[-3,-18],[5,-7],[7,-7],[5,-7],[2,-5],[0,-1],[0,-1],[-6,0],[-8,0],[-12,-4],[-1,6],[-7,2],[-2,-2],[-3,0],[-1,-2],[-1,-5],[1,-2],[1,-2],[5,-6],[-1,-6],[0,-5],[-6,-7],[-6,4],[-6,11],[-7,0],[-16,-1],[-4,-5],[-11,8],[-5,2],[1,8],[2,6],[1,3],[1,5],[2,3],[3,1],[0,-2],[1,-10],[1,-4],[0,3],[4,12],[1,5],[0,5],[0,5],[-1,5],[-1,2],[-1,2],[-1,2],[0,2],[1,3],[2,5],[-3,8],[3,7],[3,3],[6,0],[2,-6],[5,-12],[1,2],[6,3],[7,2],[11,8],[2,5],[8,6],[1,-8],[-1,-4],[0,-4],[6,-2],[4,-1]],[[1850,4082],[-2,-3],[-1,1],[1,2],[2,0]],[[1923,4079],[-1,-4],[-4,-6],[-4,-7],[-2,-1],[-3,1],[-6,4],[-2,2],[-2,4],[0,15],[0,4],[1,3],[3,0],[3,-2],[2,-5],[1,-6],[1,-3],[2,-1],[0,2],[0,1],[-1,2],[0,3],[-2,5],[-1,4],[2,2],[8,-7],[2,-2],[1,-2],[2,-6]],[[1938,4107],[1,-10],[-1,-5],[-3,-1],[-1,-2],[1,-2],[1,-3],[-1,-4],[-2,0],[-1,4],[-2,2],[-3,0],[0,2],[1,1],[0,3],[-1,2],[-2,2],[-2,2],[-4,6],[-2,1],[-2,-1],[-1,3],[3,4],[6,-2],[5,-7],[2,-1],[-1,6],[0,1],[3,-2],[2,2],[0,5],[1,2],[2,-1],[0,-1],[1,-6]],[[2146,4116],[-3,-2],[0,3],[2,2],[1,-3]],[[2014,4133],[-1,-1],[-1,2],[3,2],[-1,-3]],[[1937,4132],[-1,-5],[-5,3],[-1,1],[0,3],[1,2],[3,0],[1,-2],[2,-2]],[[1962,4121],[0,-2],[-1,-15],[-1,-4],[-2,0],[0,4],[-1,1],[-3,3],[-3,1],[-4,-2],[-2,1],[-1,2],[-2,1],[0,1],[-1,8],[0,4],[3,0],[6,-4],[1,0],[-1,2],[-1,3],[-2,3],[0,2],[-1,2],[0,2],[1,1],[0,2],[0,1],[3,0],[5,-2],[4,-4],[1,-3],[1,-5],[1,-3]],[[2145,4143],[1,-1],[1,1],[0,-1],[0,1],[0,1],[0,1],[1,-1],[1,1],[1,-1],[4,-2],[0,-4],[-3,-6],[-5,3],[-3,8],[1,3],[1,1],[0,-1],[0,-3]],[[2013,4180],[2,-2],[-2,-4],[-3,0],[-1,2],[0,3],[3,-1],[1,1],[0,1]],[[2066,4181],[0,-10],[-4,2],[-1,2],[2,5],[3,1]],[[2032,4182],[0,-4],[2,3],[2,-1],[-1,-2],[-1,-3],[1,-2],[-2,-4],[-2,-2],[-1,-1],[-2,1],[1,3],[-1,0],[-4,0],[0,1],[2,3],[1,3],[3,3],[2,2]],[[2148,4201],[5,-1],[2,0],[2,0],[-1,-2],[-2,-2],[0,-1],[1,-1],[0,-2],[-1,-3],[-5,-5],[-1,-2],[-6,1],[0,-2],[-1,-3],[-2,-2],[-4,-2],[-1,-2],[-2,-2],[-3,0],[-3,2],[0,2],[-1,1],[1,0],[5,0],[1,1],[3,2],[0,1],[-1,1],[-1,2],[-1,2],[1,1],[2,0],[3,-1],[2,1],[4,10],[3,3],[0,1],[1,2]],[[2172,4237],[-1,-3],[-2,1],[0,1],[0,2],[3,-1]],[[2129,4240],[0,-6],[-3,0],[-3,-2],[-3,2],[-3,1],[-3,1],[1,1],[3,1],[1,0],[3,1],[1,2],[2,0],[2,1],[2,-2]],[[1984,4188],[0,-8],[0,-14],[4,-3],[19,11],[4,-10],[-2,-8],[-6,-4],[-7,-10],[-6,-1],[-5,-8],[-3,-5],[-1,-7],[3,-8],[0,-3],[-1,-6],[-3,1],[-6,1],[-2,-5],[2,-5],[0,-6],[-1,-4],[-6,2],[0,9],[-2,10],[1,16],[2,6],[-5,11],[-3,2],[-11,3],[-3,2],[0,6],[6,2],[7,7],[5,-6],[6,5],[-4,10],[2,19],[5,2],[1,-12],[3,1],[2,1],[0,9],[-1,7],[2,9],[5,3],[2,8],[-3,6],[-1,5],[4,20],[3,-4],[0,-8],[-2,-5],[-1,-4],[3,-4],[2,-2],[-2,-10],[-2,-8],[-3,-8],[-1,-8]],[[1921,4248],[-1,0],[-1,2],[1,2],[1,-4]],[[2143,4261],[0,-4],[-1,1],[0,-1],[1,-3],[0,-4],[-3,-4],[-1,2],[3,3],[-1,1],[-2,3],[-1,2],[1,3],[2,2],[2,-1]],[[1997,4258],[-2,-13],[-3,1],[0,3],[0,2],[-1,1],[-1,11],[1,7],[3,-3],[2,-4],[1,-2],[1,-2],[-1,-1]],[[1961,4267],[-2,-3],[-2,0],[0,6],[2,0],[2,-3]],[[1972,4269],[2,0],[5,2],[4,-1],[0,-2],[-2,0],[-2,-1],[0,-2],[1,-2],[1,-1],[1,-1],[0,-2],[-5,-1],[-5,2],[-1,-2],[-2,-2],[-2,2],[-1,3],[-1,0],[-2,1],[-1,2],[1,3],[1,2],[1,0],[2,3],[1,1],[4,-4]],[[2000,4296],[-4,-5],[-3,-5],[-2,0],[-6,1],[-3,3],[-2,2],[-2,1],[-2,-1],[1,4],[4,7],[5,3],[3,1],[5,4],[2,0],[2,-7],[3,-4],[-1,-4]],[[2340,4145],[0,-7],[-5,-6],[-8,-3],[-5,-6],[-4,-4],[-7,-4],[-3,-2],[6,-3],[3,-6],[7,-6],[8,0],[5,1],[16,14],[20,0],[11,-9],[3,-10],[7,-19],[1,-6],[0,-15],[0,-4],[-6,-11],[-2,-6],[4,-7],[-7,-10],[-11,-7],[-12,-1],[-3,-3],[0,-5],[-2,-4],[-6,-1],[-1,-5],[-3,-2],[-8,-2],[-5,-5],[-5,1],[2,5],[-1,7],[-5,3],[-2,4],[-6,3],[0,9],[0,11],[4,-1],[4,2],[4,6],[3,3],[5,4],[3,5],[3,4],[-1,9],[-4,2],[-3,2],[-1,4],[1,2],[2,4],[-4,5],[-10,1],[-3,-3],[-4,0],[-10,3],[-10,-5],[-5,-6],[-5,-6],[-8,-2],[-6,-4],[-6,-1],[-3,4],[0,4],[-1,2],[-3,-4],[2,-6],[-4,-7],[-8,-14],[-5,-8],[-3,-9],[-6,-6],[-6,-4],[-5,-1],[-1,-3],[-2,-8],[-7,-8],[-8,-7],[-1,-4],[-2,1],[-4,2],[-4,-4],[-3,-2],[-2,6],[5,5],[4,2],[4,2],[2,3],[4,12],[3,7],[4,7],[1,7],[-2,3],[-3,-3],[-2,3],[0,4],[4,1],[2,3],[3,2],[3,-5],[4,3],[4,11],[-11,-1],[0,6],[-7,17],[-3,4],[-3,2],[-2,3],[-1,6],[-1,4],[-6,3],[-3,-4],[-4,-2],[-4,10],[-7,5],[-3,7],[-3,8],[-1,4],[-1,6],[-1,6],[-3,4],[-3,4],[-4,2],[-2,14],[0,10],[4,5],[3,7],[-2,6],[1,8],[3,3],[1,13],[6,12],[12,-7],[5,-9],[0,-1],[0,-4],[0,-1],[1,0],[2,2],[2,3],[1,-1],[2,-4],[-2,-2],[-5,-11],[-1,-7],[2,-6],[3,2],[5,10],[10,-3],[5,-7],[3,-7],[-2,-4],[-1,-5],[1,-11],[0,-7],[-3,-4],[-2,5],[-1,11],[-3,0],[1,-17],[4,-4],[1,-8],[-4,-5],[7,-6],[2,-2],[3,-4],[3,-2],[2,-3],[1,1],[2,3],[4,3],[2,3],[3,7],[17,-7],[16,-9],[5,2],[-5,8],[-18,31],[0,13],[3,7],[2,11],[0,9],[-11,10],[-10,12],[-9,-4],[-6,-5],[-3,0],[-1,9],[-8,7],[-3,-3],[-4,-6],[-5,0],[-4,4],[-2,5],[-3,11],[2,0],[4,-1],[-2,8],[1,4],[4,3],[0,4],[-4,0],[-6,-8],[-2,5],[0,6],[0,6],[-4,2],[1,-10],[-2,-10],[-1,-4],[-2,1],[-6,1],[-2,-6],[-2,-1],[-1,12],[6,2],[2,5],[-2,5],[-3,4],[-3,2],[-3,2],[1,4],[0,3],[-2,3],[-2,3],[-2,-2],[-3,-1],[-4,2],[-5,6],[-4,1],[-8,0],[-4,7],[4,14],[0,8],[3,2],[2,-1],[4,4],[-1,3],[-2,5],[-4,9],[2,13],[1,11],[4,4],[9,-10],[8,2],[9,17],[2,-5],[-1,-12],[8,-5],[14,6],[20,-8],[3,-8]],[[2131,4362],[2,-20],[-2,-7],[-4,-8],[-5,-5],[4,-4],[-4,-6],[-4,-2],[0,-5],[-4,-4],[0,-6],[-3,-10],[-15,-22],[-11,-9],[-12,-4],[-5,3],[-5,2],[0,5],[2,10],[3,-6],[8,-8],[5,2],[2,3],[-1,2],[-2,2],[-4,1],[-2,5],[1,7],[4,5],[7,-2],[-2,8],[-1,10],[10,10],[1,13],[1,11],[17,5],[4,11],[2,-2],[3,-4],[5,5],[-5,5],[0,7],[10,2]],[[2172,4369],[1,-8],[-1,3],[0,2],[0,2],[0,1]],[[2092,4337],[-3,-2],[-5,0],[-1,6],[2,15],[2,7],[1,2],[0,5],[1,4],[2,2],[1,-1],[0,-2],[-1,-4],[0,-3],[0,-2],[0,-2],[1,-3],[0,-3],[-1,-5],[1,-14]],[[2126,4379],[2,-2],[-3,0],[0,-1],[0,-1],[-1,-1],[-2,0],[-2,-1],[-3,-2],[0,-2],[-2,0],[1,6],[3,1],[2,4],[1,2],[1,0],[1,-2],[2,-1]],[[2186,4385],[0,-4],[-3,6],[3,-1],[0,-1]],[[2207,4372],[-1,-1],[-3,-1],[-3,1],[-2,0],[-1,-3],[-1,-2],[0,-1],[-2,0],[-1,-2],[-3,-2],[-4,1],[-2,3],[2,3],[3,4],[2,3],[3,7],[1,1],[-2,4],[0,2],[2,1],[5,-3],[1,-2],[0,-2],[0,-1],[0,-1],[-1,-2],[0,-1],[4,-3],[3,-3]],[[2131,4404],[0,-3],[6,1],[1,-4],[-3,-4],[-4,-3],[-5,1],[-4,3],[-3,-1],[0,-3],[-2,0],[-3,1],[1,4],[6,7],[6,4],[3,0],[1,-3]],[[2159,4514],[0,-1],[-3,0],[-1,-1],[-1,5],[3,2],[1,-2],[2,-1],[-1,-2]],[[2198,4554],[0,-5],[1,-5],[5,-4],[5,-3],[-2,-1],[-3,-1],[-2,-1],[0,-3],[8,-4],[0,-6],[-5,-6],[-8,-1],[-8,0],[-4,-9],[-1,-9],[-3,1],[-6,7],[-5,6],[2,7],[-4,3],[-4,-3],[-3,6],[0,8],[9,-6],[4,-1],[0,4],[-9,8],[-1,9],[0,6],[7,-1],[-2,8],[2,8],[2,5],[1,6],[4,-5],[21,-8],[1,-3],[-2,-7]],[[2078,4776],[-1,-4],[-9,-10],[-1,2],[-1,7],[0,2],[1,2],[3,1],[2,0],[1,1],[3,1],[2,-2]],[[2024,4773],[3,0],[2,3],[3,0],[5,4],[4,0],[-2,3],[0,4],[3,0],[3,-3],[5,-4],[-1,-9],[4,-4],[1,7],[9,-1],[1,-3],[-1,-4],[-6,-3],[-2,-6],[1,-8],[1,-6],[-5,-4],[-4,-1],[0,-2],[2,-2],[-1,-5],[-1,-8],[0,-5],[-1,-2],[-2,-1],[-1,-3],[0,-5],[-3,-8],[-4,-3],[0,-4],[-4,-3],[-1,-4],[-4,0],[-1,-2],[-4,-3],[-1,4],[-2,1],[-4,5],[-2,2],[-5,-3],[-1,-1],[-1,19],[3,11],[-1,12],[1,14],[3,4],[0,7],[2,11],[1,20],[3,6],[6,-1],[1,-3],[-1,-4],[-1,-9]],[[2102,4963],[2,-4],[3,-4],[2,-4],[-1,-6],[-2,-3],[-3,-2],[3,-1],[3,-2],[1,-5],[-3,-7],[-3,-1],[-3,2],[-3,-1],[3,-5],[5,-6],[-1,-4],[0,-4],[-3,-11],[-6,-19],[-14,-15],[-8,-14],[2,-13],[-7,-9],[-1,-7],[5,2],[6,8],[0,-4],[-2,-6],[-1,-3],[1,-8],[4,-5],[3,-2],[-3,-6],[-4,-3],[-3,-3],[-3,-8],[-8,-4],[-6,2],[-6,10],[5,4],[7,-3],[1,13],[-4,2],[-6,-8],[-3,0],[-1,9],[0,5],[2,5],[-4,-3],[-3,-5],[2,-8],[-3,-2],[-4,5],[-8,-2],[-6,2],[2,6],[8,1],[4,2],[0,18],[-1,9],[2,4],[4,1],[1,-1],[2,3],[4,6],[0,3],[-5,-6],[-4,-2],[-2,6],[4,11],[5,16],[7,7],[0,3],[-5,8],[-6,-2],[-1,7],[5,8],[1,7],[5,21],[5,0],[8,0],[5,-1],[4,4],[6,10],[5,1],[-2,4],[2,4],[5,-1],[3,4],[5,0]],[[2022,2372],[1,-4],[-3,4],[-3,2],[-3,4],[1,5],[3,0],[5,-1],[0,-3],[-1,-2],[1,-2],[-1,-3]],[[2149,2516],[-4,0],[-2,3],[-2,3],[2,5],[2,2],[1,0],[1,-1],[1,0],[1,-2],[1,-5],[-1,-5]],[[2192,2599],[-8,-8],[-2,11],[-1,6],[1,6],[10,3],[3,-7],[-3,-11]],[[2226,2722],[8,-4],[2,0],[1,0],[1,0],[2,-2],[1,-13],[10,-9],[-2,-2],[0,-1],[-19,2],[-3,7],[-4,5],[-3,11],[6,6]],[[2130,2725],[-4,-2],[-2,2],[-2,4],[0,3],[3,1],[2,-1],[2,-2],[2,-3],[-1,-2]],[[2258,2755],[-3,-2],[-5,2],[-4,1],[-3,5],[-1,1],[0,1],[0,3],[1,1],[3,4],[-1,3],[1,1],[3,2],[2,-5],[2,-6],[3,-8],[1,-1],[1,-1],[0,-1]],[[2435,2992],[8,-8],[14,-6],[10,-11],[13,-5],[12,-13],[-2,-16],[-7,-23],[-14,-18],[-9,-8],[-10,-2],[-9,-1],[-10,-1],[-16,6],[-3,8],[-5,16],[-8,23],[-3,12],[-1,13],[4,2],[12,0],[5,11],[7,9],[2,7],[7,0],[3,5]],[[2327,3003],[9,-7],[3,3],[6,-5],[8,-4],[6,-7],[0,-6],[-7,0],[-3,-5],[-6,-2],[-7,9],[1,6],[-1,4],[-6,-3],[-3,7],[-4,4],[-3,5],[7,1]],[[2553,3123],[-3,-11],[-2,1],[-3,0],[-1,0],[0,5],[1,4],[0,2],[4,5],[2,2],[1,-6],[1,-2]],[[2372,3151],[2,-2],[3,0],[1,-5],[-4,-6],[-2,1],[-5,-2],[-3,1],[0,-4],[-1,1],[-3,2],[-2,1],[0,1],[1,3],[1,2],[3,0],[4,4],[3,2],[2,1]],[[2417,3153],[1,-4],[-1,-2],[-7,4],[-3,0],[-3,-1],[-1,2],[3,0],[0,1],[3,2],[3,1],[3,-3],[2,0]],[[2608,3034],[-6,-3],[-5,0],[-3,-8],[-3,-7],[-1,-10],[-4,-8],[0,-7],[-1,-4],[3,-3],[1,-6],[-2,-5],[0,-5],[2,-7],[-4,-7],[-1,-6],[-6,1],[-6,-2],[-6,-2],[-5,-5],[-1,-5],[-5,0],[-1,4],[-4,6],[1,6],[2,9],[-1,12],[-3,8],[-1,9],[1,4],[3,-2],[2,0],[3,7],[8,11],[9,17],[4,14],[3,12],[0,7],[-1,14],[-2,6],[1,5],[-2,4],[4,6],[5,7],[6,13],[0,6],[4,2],[3,10],[-1,10],[7,14],[4,6],[2,2],[2,2],[3,0],[0,-8],[4,-11],[5,-8],[-6,-6],[0,-15],[3,-18],[-8,-17],[1,-9],[0,-15],[-2,-6],[-4,-4],[0,-8],[-1,-7]],[[2092,3168],[-1,-2],[-1,3],[1,0],[1,-1]],[[2255,3153],[-4,0],[-5,3],[-1,1],[0,2],[-2,4],[2,2],[2,2],[3,3],[2,1],[3,-1],[2,-2],[4,-4],[0,-4],[-3,-4],[-3,-3]],[[2096,3323],[-3,-2],[0,3],[1,3],[1,0],[1,2],[-1,1],[1,1],[0,2],[2,0],[-1,-5],[0,-2],[1,-2],[-2,-1]],[[2328,3404],[-2,-1],[0,1],[-1,2],[2,3],[2,-1],[-1,-4]],[[2184,3537],[-8,-8],[-5,4],[-6,6],[-2,8],[7,4],[5,15],[8,14],[5,3],[7,3],[5,8],[2,9],[2,9],[3,-7],[2,-9],[1,-9],[-4,-4],[-4,-3],[-11,-25],[-4,-15],[-3,-3]],[[2220,3604],[0,-4],[-3,2],[-2,1],[0,4],[-1,3],[2,5],[2,4],[3,1],[1,1],[2,-2],[0,-2],[-1,-3],[2,-2],[-2,-1],[-2,-1],[-1,-2],[0,-2],[1,-2],[-1,0]],[[2231,3648],[12,-13],[2,-1],[1,3],[-1,4],[1,3],[5,1],[2,-1],[-2,-2],[0,-2],[1,-3],[-1,-3],[0,-3],[1,-2],[0,-1],[0,-3],[-3,-3],[-3,0],[-3,-1],[-4,-3],[-5,0],[-2,3],[-2,1],[-1,2],[-1,2],[-1,3],[-2,4],[0,3],[2,2],[-1,1],[-3,-2],[-3,-4],[-2,-1],[-1,2],[-1,3],[1,5],[3,5],[4,3],[7,-2]],[[2645,3460],[-7,-1],[-6,-3],[-13,-7],[-4,-4],[-4,-6],[-6,-12],[-4,-18],[4,-4],[11,-4],[7,-3],[7,-5],[1,-5],[-1,-4],[-7,-6],[-3,-7],[6,-2],[11,5],[2,-4],[-23,-25],[-9,1],[-8,-3],[-1,-10],[-3,-6],[-5,-14],[-4,-7],[-4,-5],[-5,-4],[-5,-4],[-6,-3],[-11,-5],[-8,-3],[-9,-1],[-9,-5],[-5,-5],[-2,-5],[-14,-4],[-10,-13],[-5,-7],[-7,0],[2,30],[8,10],[13,10],[4,5],[8,30],[-4,8],[9,18],[3,15],[2,24],[-1,8],[-4,14],[-4,13],[-7,16],[-14,11],[-4,12],[4,20],[-3,8],[-19,5],[-5,4],[-3,1],[-4,3],[-2,6],[7,12],[8,5],[8,-2],[8,0],[8,-2],[3,-8],[-1,-12],[1,-4],[4,-1],[5,0],[3,2],[5,7],[8,15],[3,18],[-2,17],[-9,11],[-12,-1],[-17,8],[-13,-5],[-10,-15],[-1,-5],[-1,-12],[-2,-4],[-9,-12],[-2,-5],[-3,-16],[-5,-12],[-4,-13],[-4,-19],[0,-9],[1,-10],[10,-26],[4,-19],[3,-9],[5,-4],[4,-2],[7,-13],[12,-2],[0,-5],[-3,-17],[-1,-8],[-3,-9],[-5,-4],[-6,-3],[-6,-8],[-4,6],[-4,0],[-3,-2],[-5,0],[-5,3],[-1,3],[0,6],[-4,11],[-3,7],[-14,10],[-50,2],[-7,0],[-9,-4],[-8,1],[-3,7],[-1,8],[-2,7],[-4,10],[-4,6],[4,-1],[5,-1],[0,6],[-3,8],[-9,11],[-9,9],[-7,5],[8,6],[3,1],[3,0],[4,-3],[3,0],[3,-2],[7,-10],[4,-4],[5,11],[16,18],[3,15],[4,8],[4,16],[2,16],[-3,11],[4,10],[0,9],[-4,7],[-9,13],[-12,24],[-4,4],[-15,11],[-5,2],[-1,5],[-3,10],[3,17],[3,4],[10,-5],[4,-2],[-9,11],[-3,7],[5,12],[2,21],[-2,9],[-3,10],[-3,5],[-2,2],[-5,6],[0,9],[4,4],[6,10],[0,11],[-8,10],[9,13],[13,6],[10,-16],[6,3],[7,6],[4,4],[1,4],[3,12]],[[276,1],[-4,-1],[-7,3],[-1,4],[3,3],[5,1],[7,-1],[1,-5],[-4,-4]],[[350,85],[-4,-4],[-3,1],[-2,3],[-1,7],[1,5],[3,-1],[2,-2],[3,0],[2,-3],[-1,-6]],[[373,126],[-2,-2],[-3,2],[-1,4],[2,5],[3,0],[2,-4],[1,-3],[-2,-2]],[[341,135],[1,-3],[-3,-1],[-2,1],[-2,1],[-2,0],[-2,1],[-2,0],[-2,1],[3,2],[1,4],[1,2],[4,0],[5,-8]],[[275,172],[7,-8],[7,2],[12,-3],[12,-5],[8,-5],[0,-12],[-6,-16],[-14,-23],[-7,-1],[-34,12],[-20,2],[-5,5],[5,12],[1,-1],[1,-1],[3,-1],[3,6],[3,-3],[4,-3],[4,2],[2,4],[1,16],[4,18],[1,3],[1,5],[2,0],[3,-2],[2,-3]],[[21,203],[4,-3],[1,-4],[-3,-6],[-4,-4],[-3,2],[-13,-2],[-3,3],[0,5],[2,5],[4,3],[4,-1],[11,2]],[[426,189],[-2,-20],[-4,-18],[-10,-12],[-11,-2],[-12,4],[-6,9],[7,11],[-3,3],[-2,6],[-1,5],[-6,2],[-5,1],[-4,3],[0,4],[6,1],[2,4],[3,7],[1,2],[5,1],[1,-2],[0,-4],[2,-1],[3,-3],[2,-3],[4,-1],[8,1],[3,1],[3,2],[4,6],[2,9],[3,7],[6,3],[3,4],[11,28],[4,8],[2,2],[3,-4],[1,-5],[-2,-5],[-2,-4],[-3,-8],[-12,-22],[-4,-20]],[[570,275],[-2,0],[-3,1],[-4,2],[-1,7],[4,7],[5,1],[5,-3],[2,-7],[-3,-6],[-3,-2]],[[569,330],[1,-5],[-3,2],[-3,1],[-1,5],[3,0],[2,-2],[1,-1]],[[730,357],[-12,-2],[-5,1],[-4,6],[0,6],[3,1],[3,1],[0,5],[2,5],[4,0],[6,-2],[2,-2],[3,-5],[2,-9],[-4,-5]],[[779,346],[3,-1],[7,1],[5,-2],[7,-4],[6,-6],[3,-5],[-3,-4],[-7,-2],[-12,-3],[-27,0],[-14,3],[0,9],[1,5],[4,27],[1,16],[-2,6],[-3,8],[1,-1],[3,-1],[4,-2],[1,-1],[2,-2],[2,-6],[4,-13],[3,-6],[1,-3],[10,-13]],[[745,414],[2,-5],[-2,1],[0,-2],[-4,9],[2,0],[2,-3]],[[215,791],[-2,0],[1,3],[1,-3]],[[211,798],[0,-4],[-2,3],[2,1]],[[200,800],[0,-2],[-1,2],[1,0]],[[190,802],[-5,-2],[0,5],[6,2],[2,0],[3,-5],[-6,0]],[[220,808],[0,-1],[-1,1],[1,0]],[[212,821],[0,-3],[-1,0],[1,3]],[[2678,829],[-4,-1],[-3,2],[-6,3],[0,6],[3,7],[4,7],[2,2],[2,0],[3,0],[7,-8],[-3,-2],[-2,-4],[-1,-4],[-1,-5],[-1,-3]],[[525,864],[-1,0],[1,1],[0,-1]],[[237,880],[-1,-1],[0,1],[1,0]],[[240,876],[-2,-1],[-1,4],[2,2],[1,-3],[1,-1],[-1,-1]],[[2698,877],[-2,0],[-3,2],[-3,5],[0,6],[4,1],[6,-3],[2,-5],[-2,-4],[-2,-2]],[[1424,989],[-2,-5],[-3,2],[0,6],[-1,5],[0,2],[2,10],[2,6],[3,1],[2,-3],[1,-2],[0,-4],[-1,-6],[-2,-6],[-1,-6]],[[1613,1030],[-2,-6],[-2,2],[0,3],[0,1],[1,2],[1,3],[2,-1],[0,-4]],[[1627,1080],[-4,-2],[-3,2],[1,8],[2,2],[3,2],[1,-2],[0,-3],[1,-1],[1,-2],[-2,-4]],[[1242,1055],[-2,-1],[-2,1],[-2,1],[-2,3],[-1,3],[-2,6],[-6,4],[-7,2],[-5,4],[-2,7],[3,4],[5,3],[6,2],[3,1],[6,-2],[6,-3],[4,-6],[3,-7],[0,-5],[-1,-4],[-2,-5],[-2,-3],[0,-2],[0,-1],[0,-2]],[[1387,1186],[-3,-4],[-3,1],[-4,-1],[-2,2],[2,5],[3,3],[3,0],[3,-1],[1,-5]],[[1569,1255],[0,-13],[-8,-2],[-9,5],[-1,7],[5,2],[8,-1],[5,2]],[[1730,1241],[-1,-2],[-1,0],[-1,1],[-1,-1],[-11,-23],[-6,-8],[-9,-4],[-14,-1],[-5,-2],[-2,-3],[-3,-5],[-2,-6],[-1,-4],[1,-1],[2,-1],[1,-1],[0,-5],[-1,-3],[-1,-1],[-2,-1],[-8,-3],[-6,-2],[-6,1],[-5,3],[-6,-11],[-17,-23],[-4,-3],[-4,0],[-3,-2],[-1,-7],[-2,-2],[-22,0],[-4,-1],[-3,-2],[-4,-7],[2,-4],[3,-2],[4,-3],[1,-6],[1,-13],[2,-6],[3,-6],[7,-8],[3,-6],[-5,-2],[-7,2],[-6,4],[-7,3],[-4,-4],[-16,-39],[-3,-7],[0,-9],[2,-6],[5,0],[6,2],[4,-1],[-3,-10],[-5,-12],[-7,-9],[-7,2],[-4,-4],[-5,-13],[-5,-2],[-19,0],[2,17],[-7,33],[1,11],[6,-1],[6,8],[5,12],[3,9],[5,-1],[5,7],[2,10],[1,5],[-1,10],[-5,20],[-1,10],[1,11],[3,5],[5,0],[11,0],[4,1],[3,2],[2,5],[1,0],[5,12],[1,2],[10,8],[13,5],[11,7],[7,15],[1,9],[-2,6],[-5,3],[-15,3],[-3,5],[0,8],[0,8],[-2,15],[0,4],[2,1],[11,-1],[15,1],[7,-2],[5,-6],[-1,-4],[-2,-4],[-1,-4],[2,-7],[3,-2],[3,0],[14,5],[17,13],[-3,9],[3,5],[13,13],[2,3],[1,9],[3,2],[2,1],[1,1],[3,7],[12,10],[3,6],[1,8],[5,15],[0,10],[25,-34],[2,-7],[-1,-2],[-1,-3],[-1,-3],[2,-3],[1,-4],[-1,-4],[-3,-3],[-1,-2],[-4,-12],[0,-1],[0,-6]],[[1615,1338],[-1,-1],[-4,1],[-4,2],[-2,2],[0,1],[1,5],[-1,3],[2,5],[7,0],[3,-5],[-1,-8],[0,-5]],[[1777,1392],[-2,-4],[-6,0],[-6,4],[-2,3],[-1,0],[-2,2],[0,4],[2,1],[2,0],[2,4],[4,3],[5,-2],[3,-4],[1,-3],[0,-8]],[[1615,1387],[-9,-4],[3,7],[17,25],[3,6],[2,0],[-3,-12],[-6,-12],[-7,-10]],[[1846,1574],[-5,-5],[-5,-12],[-3,-4],[-4,2],[-1,-7],[-3,-1],[-3,1],[-3,-1],[-4,-4],[-4,-2],[-5,2],[-4,4],[-2,4],[-1,6],[1,6],[1,4],[1,5],[2,1],[2,0],[5,1],[13,-2],[5,0],[6,3],[5,6],[16,9],[0,-2],[1,0],[1,-1],[-3,-6],[-9,-7]],[[1709,1777],[-1,-5],[-3,3],[-1,8],[2,-1],[1,-3],[2,-2]],[[1940,1697],[-5,-2],[-5,3],[-3,6],[-1,7],[-1,3],[-7,3],[-1,7],[3,12],[-7,26],[2,6],[1,7],[2,18],[2,2],[5,2],[10,7],[6,-9],[4,-27],[4,-12],[3,-4],[5,-4],[3,-4],[2,-6],[-2,-8],[-8,-13],[-3,-9],[-4,-6],[-5,-5]],[[2026,1862],[2,-2],[7,0],[3,0],[1,-2],[-1,-6],[0,-3],[-2,-2],[-5,5],[-4,2],[-6,0],[-1,0],[-1,4],[0,5],[1,3],[2,2],[2,-3],[2,-3]],[[2003,1853],[-2,-2],[-2,0],[0,7],[2,8],[3,7],[3,2],[1,-2],[-1,-2],[1,-3],[-1,-5],[-1,-4],[-1,-4],[-2,-2]],[[2024,1926],[3,-3],[12,2],[-2,-3],[-2,-4],[-2,-4],[0,-3],[4,-5],[8,-4],[3,-3],[9,2],[7,-8],[1,-9],[-8,-4],[-6,8],[-1,0],[-1,3],[-2,-1],[-1,-2],[0,-1],[0,-2],[-2,-3],[-2,-2],[-1,2],[-1,0],[-3,7],[0,1],[-4,0],[-6,-1],[-3,1],[-2,3],[0,12],[-1,4],[-9,16],[-2,7],[5,3],[11,0],[-2,-9]],[[2273,1979],[-6,-3],[-7,0],[-14,6],[20,21],[14,10],[4,5],[0,-8],[-3,-12],[-4,-12],[-4,-7]],[[2184,2046],[-1,-3],[-3,0],[-2,1],[-2,-1],[-4,-3],[-14,-8],[-4,-1],[-2,-1],[-1,-2],[-1,-3],[-1,-3],[-3,-1],[-6,-5],[-9,-19],[-7,-5],[-1,-2],[-10,-12],[-4,-3],[-8,4],[-5,0],[3,-6],[-3,-5],[-2,-4],[-3,-2],[-3,-2],[3,-4],[8,-7],[4,-5],[-17,-14],[-3,0],[-1,-10],[-5,-1],[-5,3],[-6,-4],[4,-3],[3,-6],[1,-7],[-1,-3],[-3,2],[-9,11],[-16,15],[-2,5],[0,7],[0,6],[-4,6],[-4,-7],[-5,-1],[-11,8],[-11,3],[-5,2],[-4,4],[0,3],[3,2],[3,1],[2,0],[3,-3],[10,4],[10,-4],[9,0],[7,13],[-12,0],[-5,3],[-3,6],[4,4],[4,4],[3,4],[8,2],[2,1],[7,7],[5,6],[0,1],[8,1],[8,-1],[6,3],[4,10],[6,-3],[6,2],[5,6],[3,8],[3,-5],[3,-3],[4,-2],[4,-3],[5,17],[9,10],[21,14],[-4,-16],[1,-4],[5,-2],[4,2],[3,6],[6,14],[0,3],[-1,3],[-1,4],[2,3],[5,0],[3,-7],[3,-15],[1,-3],[2,-3],[2,-3],[-1,-4]]],"transform":{"scale":[0.0031050549715971585,0.002148347158915892],"translate":[122.93816165500019,24.039089260000125]}};
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
