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
  Datamap.prototype.korTopo = {"type":"Topology","objects":{"kor":{"type":"GeometryCollection","geometries":[{"type":"MultiPolygon","properties":{"name":null},"id":"-99","arcs":[[[0]],[[1]],[[2]],[[3]],[[4]],[[5]],[[6]],[[7]],[[8]],[[9]],[[10]],[[11]],[[12]],[[13]],[[14]],[[15]],[[16]],[[17]],[[18]],[[19]],[[20]],[[21]],[[22]],[[23]],[[24]],[[25]],[[26]],[[27]],[[28]],[[29]],[[30]],[[31]],[[32]],[[33]],[[34]],[[35]],[[36]],[[37]],[[38]]]},{"type":"Polygon","properties":{"name":"North Chungcheong"},"id":"KR.GB","arcs":[[39,40,41,42,43,44,45,46]]},{"type":"MultiPolygon","properties":{"name":"Incheon"},"id":"KR.IN","arcs":[[[47]],[[48,49]]]},{"type":"Polygon","properties":{"name":"Gangwon"},"id":"KR.KW","arcs":[[50,-47,51,52]]},{"type":"Polygon","properties":{"name":"Seoul"},"id":"KR.SO","arcs":[[53]]},{"type":"MultiPolygon","properties":{"name":"Gyeonggi"},"id":"KR.KG","arcs":[[[54]],[[55]],[[56]],[[57]],[[58]],[[59]],[[60]],[[61]],[[62]],[[63]],[[-46,64,65,-50,66,-52],[-54]]]},{"type":"MultiPolygon","properties":{"name":"North Jeolla"},"id":"KR.CB","arcs":[[[67]],[[-41,68,69,70,71,72]]]},{"type":"Polygon","properties":{"name":"Gwangju"},"id":"KR.KJ","arcs":[[73]]},{"type":"MultiPolygon","properties":{"name":"South Chungcheong"},"id":"KR.GN","arcs":[[[74]],[[-65,-45,75,76,-42,-73,77]]]},{"type":"Polygon","properties":{"name":"Daejeon"},"id":"KR.TJ","arcs":[[-43,-77,78]]},{"type":"Polygon","properties":{"name":"Daegu"},"id":"KR.TG","arcs":[[79]]},{"type":"MultiPolygon","properties":{"name":"South Gyeongsang"},"id":"KR.KN","arcs":[[[80]],[[81]],[[82]],[[83]],[[84]],[[85]],[[86]],[[87,88,89,90,91,-70,92]]]},{"type":"MultiPolygon","properties":{"name":"South Jeolla"},"id":"KR.KJ","arcs":[[[93]],[[94]],[[95]],[[96]],[[97]],[[98]],[[99]],[[100]],[[101]],[[102]],[[103]],[[104]],[[105]],[[106]],[[107]],[[108]],[[109]],[[110]],[[111]],[[112]],[[113]],[[114]],[[115]],[[116]],[[117]],[[118]],[[119]],[[120]],[[121]],[[122]],[[123]],[[124]],[[125]],[[126]],[[127]],[[128]],[[129]],[[130]],[[131]],[[132]],[[133]],[[134]],[[135]],[[136]],[[137]],[[138]],[[139]],[[140]],[[141]],[[142]],[[143]],[[144]],[[145]],[[146]],[[147]],[[148]],[[149]],[[150]],[[151]],[[152]],[[153]],[[154]],[[155]],[[156]],[[157]],[[158]],[[159]],[[160]],[[161]],[[162]],[[163]],[[164]],[[165]],[[166]],[[167]],[[168]],[[169]],[[170]],[[171]],[[172]],[[173]],[[-92,174,-71],[-74]]]},{"type":"MultiPolygon","properties":{"name":"Busan"},"id":"KR.PU","arcs":[[[175]],[[176,-90]]]},{"type":"Polygon","properties":{"name":"Ulsan"},"id":"KR.UL","arcs":[[177,-88,178]]},{"type":"MultiPolygon","properties":{"name":"North Gyeongsang"},"id":"KR.TG","arcs":[[[179,-179,-93,-69,-40,-51],[-80]],[[180]],[[181]]]},{"type":"Polygon","properties":{"name":"Jeju"},"id":"KR.CJ","arcs":[[182]]},{"type":"Polygon","properties":{"name":"Sejong"},"id":"KR.SJ","arcs":[[-44,-79,-76]]}]}},"arcs":[[[3242,550],[-11,-9],[-15,5],[-6,7],[0,15],[10,31],[5,4],[5,-3],[6,-7],[-1,-5],[5,-15],[2,-23]],[[5464,2647],[-11,-6],[-7,3],[1,8],[9,6],[13,17],[2,-8],[6,-3],[0,-8],[-13,-9]],[[5188,2662],[8,-6],[-7,-9],[-15,9],[-7,0],[-15,-3],[-9,16],[4,6],[6,0],[-2,6],[-8,4],[-7,11],[5,5],[16,-16],[21,-20],[10,-3]],[[4977,2732],[9,-11],[8,6],[8,-3],[5,5],[6,0],[7,-1],[5,-5],[-5,-11],[-13,-2],[-6,2],[-13,2],[-8,3],[-3,15]],[[4943,2742],[-3,0],[-1,5],[-14,4],[-14,6],[-8,16],[10,15],[11,-2],[17,-5],[9,-21],[1,-8],[-8,-10]],[[5378,2832],[-3,-5],[-25,0],[-9,3],[-22,13],[5,6],[22,8],[10,-6],[22,-19]],[[5089,2855],[2,-7],[-11,4],[-6,2],[-6,16],[2,9],[6,3],[14,-8],[6,-9],[-6,-3],[-1,-7]],[[5382,2888],[28,-14],[17,3],[13,-7],[0,-11],[-7,-4],[-13,3],[-12,8],[-30,6],[-5,9],[9,7]],[[5341,2969],[9,-38],[7,-10],[10,-4],[5,-17],[-7,-17],[-16,-9],[-23,3],[-6,3],[-3,7],[1,4],[3,5],[-1,9],[-11,22],[-1,27],[2,3],[4,-10],[6,-7],[3,5],[1,9],[-4,6],[0,12],[8,11],[7,-2],[-1,-8],[2,-4],[5,0]],[[4859,2996],[-3,0],[-11,25],[19,-4],[4,-7],[-1,-12],[-8,-2]],[[4943,3014],[-15,-14],[-24,39],[7,14],[14,5],[59,-15],[-1,-9],[-18,-4],[-22,-16]],[[5392,3180],[-5,-3],[-4,24],[-3,18],[4,17],[-5,16],[28,18],[1,-20],[-12,-23],[6,-8],[0,-13],[-6,-3],[6,-5],[-1,-11],[-9,-7]],[[5562,3285],[-19,-17],[-3,9],[-7,7],[-7,-2],[-7,-8],[-5,5],[1,12],[12,7],[2,8],[-3,3],[-2,6],[11,6],[8,7],[0,12],[7,5],[7,3],[5,8],[7,1],[1,-19],[-4,-17],[0,-17],[-4,-19]],[[5445,3436],[1,-19],[-17,18],[-10,12],[17,2],[9,-13]],[[2792,4770],[-16,-13],[-5,7],[2,19],[15,13],[9,-16],[-5,-10]],[[2562,4839],[10,-9],[10,-5],[-8,-8],[-3,-3],[-3,3],[-15,-1],[-5,4],[1,11],[-3,5],[-1,-11],[-4,-12],[-5,-6],[-6,10],[-1,14],[-2,4],[-3,9],[-1,10],[17,-4],[8,-8],[14,-3]],[[2437,4884],[-14,-7],[-10,1],[-4,5],[5,1],[2,4],[0,4],[10,1],[9,2],[2,-11]],[[1900,5389],[6,-20],[-9,11],[-7,-1],[3,-12],[-8,-6],[-10,9],[-4,13],[12,13],[17,-7]],[[2043,5578],[-25,-11],[-16,3],[7,13],[5,3],[0,8],[6,1],[18,-3],[5,-14]],[[2414,5776],[-6,-11],[-2,-1],[-13,9],[-13,-6],[-1,5],[6,20],[10,10],[5,17],[6,-3],[4,-21],[10,-11],[-6,-8]],[[2508,5865],[7,-20],[6,-9],[23,-6],[0,-7],[-11,-5],[-86,25],[-6,12],[4,9],[9,1],[8,-3],[11,-6],[6,3],[2,10],[15,5],[7,-1],[5,-8]],[[2026,6412],[-5,-10],[-6,-3],[-6,5],[-21,-12],[-10,9],[7,5],[19,9],[12,5],[7,17],[5,-1],[1,-8],[-3,-16]],[[1911,7055],[9,-3],[8,7],[4,0],[-8,-15],[-23,-2],[-6,10],[-4,3],[-8,26],[11,0],[8,-13],[-3,-8],[12,-5]],[[2527,7089],[-22,-7],[-7,5],[-5,13],[-4,11],[4,10],[34,-9],[3,-15],[-3,-8]],[[1864,7170],[-1,-13],[-8,-1],[-8,3],[0,-12],[-1,-12],[-4,-5],[-5,3],[-1,8],[-6,6],[1,12],[6,4],[1,13],[2,5],[4,-4],[20,-7]],[[2030,7203],[-14,-44],[-3,0],[-8,0],[-5,8],[13,12],[-11,5],[-7,-1],[8,14],[27,6]],[[2448,7218],[6,-32],[-9,9],[-7,2],[1,21],[9,0]],[[2269,7342],[13,-11],[4,-15],[7,-7],[7,-14],[-13,6],[-7,13],[-11,0],[-12,4],[-7,16],[12,-1],[7,9]],[[2051,7349],[9,-12],[3,3],[5,-2],[-4,-9],[0,-7],[1,-6],[-2,-6],[-19,1],[-7,11],[-4,17],[3,9],[15,1]],[[2799,7429],[6,-33],[-23,10],[-5,16],[9,13],[13,-6]],[[2309,7501],[52,-18],[9,0],[8,3],[4,-10],[-10,-15],[-15,-4],[-14,5],[-12,8],[-10,0],[-20,16],[-1,5],[3,7],[6,3]],[[2514,7691],[-16,-8],[-17,0],[-11,38],[-7,7],[0,13],[5,15],[9,3],[11,-10],[17,-24],[7,-5],[5,-8],[0,-9],[-3,-12]],[[2559,7952],[-5,-4],[-40,12],[-6,8],[13,14],[11,7],[4,6],[9,6],[12,-2],[7,-10],[-2,-29],[-3,-8]],[[2378,7978],[-8,-3],[-5,6],[-10,27],[-13,18],[1,5],[8,0],[23,-13],[19,-22],[40,-1],[7,-8],[-18,-8],[-44,-1]],[[1517,8118],[-10,-3],[4,17],[13,5],[2,-9],[-9,-10]],[[2271,8163],[-6,-2],[-22,17],[-18,22],[0,6],[36,4],[3,-8],[-2,-27],[5,-5],[4,-7]],[[2190,8249],[7,-24],[-4,-12],[-11,2],[-22,21],[-11,0],[-9,2],[-10,10],[51,18],[9,-17]],[[2108,8272],[-4,-14],[-6,4],[-13,2],[-3,11],[10,5],[16,-8]],[[2236,8327],[-3,-5],[-19,12],[8,5],[17,-2],[9,-10],[-12,0]],[[5568,7047],[-17,-20],[-18,-12],[-17,7],[-13,-9],[-32,-36],[-35,-32],[-23,-23],[-29,-10],[-17,-15],[-12,-24],[-42,-32],[-31,-46],[-14,-35],[-18,-34],[10,-18],[18,-18],[-20,-73],[-116,-52],[-49,18],[-20,44],[-33,30],[-23,18],[-18,21],[-18,-19],[-14,-24],[-7,-29],[-10,-30],[-39,3],[-43,16],[-22,16],[-24,-17],[-22,-32],[-28,-3],[-22,16],[-17,-30],[-17,-41],[-9,-37],[26,-37],[20,-41],[-98,16],[-52,25],[-30,-48],[-48,-25],[-43,-31],[-4,-22],[1,-17],[-8,-19],[-31,-45],[-20,-23],[-20,-3],[-20,-11],[15,-42],[54,-10],[68,-105],[-25,-26],[-14,-43],[-6,-100],[-8,-44],[9,-32],[15,-29],[-20,-43],[-30,-28],[8,-88],[56,15],[33,-12],[39,-35],[27,-14],[70,18],[31,-25],[16,-96],[-29,2],[-33,7],[-34,-31],[8,-50],[0,-25],[-3,-30],[-13,-18],[-11,-20],[-11,-47],[-22,-46],[-34,-12],[-34,-18]],[[4502,5177],[-17,-20],[-18,-17],[-20,11],[-20,21],[-51,-25],[-45,-29],[-22,7],[-13,17],[-61,22],[-21,27],[-23,15],[-9,-13],[-11,-3],[-14,13],[-11,15]],[[4146,5218],[-32,53],[-28,54],[-12,63],[2,64],[-14,54],[-42,28],[-41,15],[-45,-10],[-4,52],[3,51],[16,71],[32,61],[12,31],[14,27],[23,19],[5,32],[-18,6],[-19,9],[-23,-18],[-18,-26]],[[3957,5854],[-14,49],[-3,33],[-17,9],[3,21],[-19,5],[-17,-25],[-44,-11],[-42,13],[6,32],[-8,21],[-12,6],[-10,12],[-5,13],[3,14]],[[3778,6046],[6,18],[3,20],[-2,9],[-1,9],[-5,12],[3,14],[7,17],[1,20],[-105,7],[-101,-21],[6,56],[17,53],[-2,31],[27,63]],[[3632,6354],[38,59],[29,55],[12,13],[13,-2],[13,3],[7,15],[1,15],[5,21],[6,19],[4,21],[-3,21],[-9,18],[-12,11],[2,38],[-18,14],[-24,51],[-19,11],[-16,19],[-11,27]],[[3650,6783],[62,19],[59,31],[46,16],[12,54],[23,26],[35,17],[17,23],[11,30],[21,25],[27,-6],[8,-11],[35,25],[66,131],[6,16],[8,14],[11,9],[11,9],[11,18],[10,19]],[[4129,7248],[146,43],[146,21],[-11,-89],[42,11],[42,-3],[11,-8],[12,-6],[11,10],[9,12],[28,20],[-7,90],[26,34],[70,25],[52,-59],[0,-39],[18,-26],[45,12],[46,27],[28,23],[33,-8],[27,15],[32,27],[77,-29],[78,-14],[25,-8],[-16,-38],[-40,-31],[-23,-39],[15,-18],[19,-11],[13,-1],[12,7],[42,14],[66,8],[14,-16],[-3,-26],[27,-30],[10,-24],[26,2],[29,5],[33,11],[33,1],[33,-27],[36,-25],[36,-7],[35,-5],[28,-13],[28,-19]],[[2707,7932],[6,-13],[4,-9],[-8,-4],[-12,-9],[-4,-7],[-24,-6],[-11,2],[-15,-7],[-32,-15],[-17,-17],[-10,-18],[-60,-48],[-14,3],[-12,-1],[-6,1],[-5,23],[-11,7],[-5,-6],[-5,-1],[-1,3],[2,7],[-4,9],[-8,1],[-6,-8],[-8,-7],[-10,5],[-15,4],[9,9],[-3,10],[-16,16],[-3,9],[5,14],[8,2],[12,-6],[62,47],[45,5],[30,-1],[28,16],[10,41],[20,8],[15,-17],[8,-4],[8,-4],[8,-4],[8,0],[8,-2],[11,-6],[6,-6],[5,-9],[7,-7]],[[2906,7701],[-4,12],[-73,10],[-33,-45],[-35,28],[14,33],[18,30],[-11,20],[-25,14],[-23,13],[4,34],[-5,26],[14,25],[39,13],[12,6],[3,15],[-19,6],[-5,-16],[-28,-3],[-7,18],[-4,34],[7,44]],[[2745,8018],[63,3],[71,2],[81,-83],[0,-43],[15,-36],[22,-16],[13,-23],[-13,-45],[-20,-40],[-18,-15],[-10,-8],[-43,-13]],[[6633,6300],[-13,0],[-46,12],[-45,-21],[-95,38],[15,43],[-4,42],[-12,45],[-4,52],[18,49],[15,46],[-11,14],[-11,12],[5,42],[-101,8],[-30,18],[-31,14],[-13,34],[-10,39],[-46,23],[-28,46],[-6,60],[10,46],[23,19],[26,10],[40,-17],[33,26],[-14,43],[-43,27],[-47,12],[-37,-21],[-36,-10],[-51,25],[-54,10],[-19,-8],[-15,2],[-11,17],[-17,7],[-39,-32],[-42,-18],[-3,33],[4,32],[-24,12],[-27,7],[-19,36],[-38,3],[-38,-19],[-25,-32],[9,-45],[-4,-43],[-8,-39],[-35,3],[-41,10],[-35,15],[-35,20]],[[4129,7248],[75,148],[61,160],[85,193],[11,41],[-8,42],[18,33],[25,33],[28,12],[14,33],[-16,28],[-20,19],[-33,4],[-34,13],[-46,7],[-78,46],[-34,15],[-35,24],[-38,6],[-37,-12],[-31,27],[3,30],[14,31],[6,37],[0,37],[-36,-13],[-17,23],[41,50],[-7,33],[-11,33],[8,25],[-1,30],[-2,29],[70,54],[28,10],[16,26],[7,75],[-33,52],[-26,6],[-26,13],[-19,54],[-31,2],[-32,-3],[-36,28],[-17,49],[-7,86],[-13,44],[-9,8],[-11,-2],[-8,-7],[-9,-1],[-23,17],[-58,-21],[-53,13],[-21,14],[-22,21],[-1,34],[11,33],[8,13],[5,12],[-9,8],[-11,3],[-11,-3],[-10,-8],[-18,-25],[-21,-21],[-31,-6],[-28,20],[-5,18],[-2,18],[-10,6],[-11,-11],[-3,-19],[0,-61],[-18,-29],[-51,25],[-46,44],[-17,18],[-17,-2],[-15,23],[-10,30],[-12,16],[-15,13],[-12,29],[-20,14],[-49,32],[-27,14]],[[3245,9241],[8,11],[76,66],[88,57],[92,40],[89,10],[44,-5],[170,16],[131,-42],[41,4],[81,26],[266,24],[12,-8],[17,-27],[17,-18],[19,-5],[91,20],[145,-9],[94,8],[95,36],[88,60],[73,80],[32,48],[27,51],[18,57],[6,65],[-12,64],[-3,32],[9,23],[37,32],[78,42],[42,-85],[64,-133],[13,-59],[33,-88],[121,-253],[95,-265],[16,-29],[49,-65],[19,-54],[230,-346],[89,-138],[107,-125],[15,-13],[72,-89],[4,-38],[0,-45],[9,-38],[48,-29],[15,-31],[40,-139],[18,-32],[21,-14],[19,-20],[62,-131],[38,-50],[13,-28],[5,-30],[10,-28],[66,-78],[21,-64],[19,-139],[26,-77],[71,-105],[5,-22],[-8,-22],[-13,-20],[-8,-20],[0,-18],[10,-57],[12,-165],[13,-76],[45,-155],[4,-76],[-14,-71],[-31,-63],[-26,-76]],[[3452,8021],[37,0],[33,12],[28,1],[10,-27],[-3,-27],[-20,-11],[-21,-15],[1,-33],[11,-13],[-24,-34],[-13,-24],[-36,-23],[-39,-10],[-40,-21],[-16,38],[-35,-8],[-34,-12],[-24,-14],[-25,-5],[-60,2],[-40,57],[-40,13],[-27,19],[-8,53],[-27,41],[-33,43],[21,47],[39,-3],[44,-29],[33,12],[29,19],[2,32],[8,29],[62,6],[32,43],[19,44],[28,31],[43,11],[49,-4],[24,-44],[9,-58],[14,-41],[1,-45],[-12,-52]],[[2132,7433],[-6,-11],[-17,-19],[-13,-6],[-16,-2],[-14,6],[-9,17],[-3,9],[-4,-1],[-10,-6],[-5,2],[0,7],[4,30],[8,25],[10,15],[11,-8],[10,-18],[9,-8],[34,-19],[11,-13]],[[2572,7451],[-12,-15],[-16,-4],[-10,9],[-12,-2],[-9,6],[-3,24],[3,24],[11,16],[25,14],[31,-3],[14,-10],[6,-22],[-6,-8],[-15,-5],[-6,-12],[-1,-12]],[[2704,7520],[5,-14],[17,-10],[26,-12],[7,-8],[4,-8],[3,-16],[-7,-17],[-71,-60],[-32,-4],[1,9],[15,22],[2,13],[-7,10],[18,22],[1,22],[-7,27],[-11,19],[-10,12],[3,4],[23,-11],[19,18],[5,-2],[-4,-16]],[[1490,8211],[-8,-4],[-5,10],[-7,23],[2,16],[10,2],[15,-2],[10,-11],[-4,-20],[-13,-14]],[[2423,8219],[-28,-2],[-94,78],[12,11],[6,15],[8,35],[4,8],[7,10],[8,7],[8,2],[5,-3],[3,-6],[2,-8],[5,-33],[1,-7],[7,-12],[9,-10],[18,-17],[18,-14],[13,-16],[2,-18],[-14,-20]],[[209,8441],[8,-7],[-4,-10],[-9,-2],[-13,3],[-9,-4],[-9,-11],[-13,-6],[6,19],[10,7],[0,5],[3,5],[18,-1],[12,2]],[[2294,8501],[26,-16],[27,0],[25,-4],[13,-15],[-9,-33],[-25,-22],[-30,-2],[-57,13],[-13,-6],[-16,-8],[-13,-1],[-6,20],[3,7],[16,50],[17,18],[20,5],[22,-6]],[[2642,8158],[-15,-39],[-14,-13],[-11,-1],[-8,4],[-15,16],[-10,7],[-7,-3],[-6,-6],[-5,-3],[-73,-5],[-27,14],[-28,40],[42,12],[10,7],[12,19],[-1,9],[-8,6],[-7,10],[-49,99],[-3,15],[5,20],[-2,87],[6,20],[13,5],[33,40],[25,7],[22,-17],[21,-26],[21,-20],[44,-23],[18,-19],[7,-30],[-2,-15],[-7,-25],[-2,-11],[4,-12],[12,-25],[3,-14],[5,-66],[-5,-15],[8,-10],[8,-20],[4,-8],[-18,-11]],[[139,8498],[-10,-6],[-11,1],[-9,-4],[-7,-7],[-4,-2],[0,5],[0,2],[-4,9],[-11,16],[4,14],[23,20],[15,16],[7,6],[10,-1],[11,-6],[2,-12],[-6,-16],[-5,-19],[-5,-16]],[[164,8813],[15,-20],[-2,-27],[-19,-15],[-27,17],[-35,-3],[-7,-4],[0,-19],[14,-7],[16,-3],[8,-7],[-29,-24],[-56,9],[-42,37],[14,66],[35,-14],[77,29],[38,-15]],[[3650,6783],[-65,9],[-53,48],[-60,29],[-114,-52],[-54,0],[-65,14]],[[3239,6831],[18,15],[20,10],[15,18],[10,45],[-3,8],[-13,14],[-2,4],[7,7],[7,1],[8,0],[19,12],[12,2],[9,6],[4,21],[-83,-24],[-12,-19],[4,-57],[-10,-13],[-32,-11],[-46,6],[-54,34],[-49,52],[-18,49],[82,10],[0,11],[-6,3],[-13,11],[16,2],[15,-1],[13,-5],[12,-10],[-6,35],[-19,31],[-13,36],[10,49],[-16,7],[-12,-17],[-7,-29],[-3,-30],[-6,-32],[-13,-7],[-13,14],[-27,-6],[-26,-7],[-64,20],[1,21],[-6,18],[5,25],[-3,32],[16,31],[19,28],[22,11],[23,10],[35,0],[37,11],[8,12],[2,34],[-8,7],[-19,-11],[-29,-27],[-18,4],[-13,9],[-7,14],[0,23],[-33,-18],[-26,-20],[-49,-57],[-13,-11],[-16,-6],[-15,0],[-9,10],[1,17],[8,16],[20,31],[-40,-10],[-13,4],[-4,25],[7,19],[17,11],[19,7],[14,8],[17,24],[-4,7],[-37,-6],[-12,8],[-10,20],[-9,25],[-11,23],[6,2],[4,2],[8,9],[11,-8],[15,1],[27,7],[22,-6],[18,-12],[18,-6],[21,11],[-2,-21],[2,-20],[7,-15],[13,-7],[15,6],[6,17],[7,40],[23,37],[19,-3],[22,-14],[30,5],[-6,15],[-9,11],[-10,7],[-13,4],[-19,0],[-9,14],[-21,4],[-16,-6],[-17,1],[-26,6],[-43,14],[-60,49],[-3,21],[26,41],[19,20]],[[2745,8018],[-7,16],[-10,28],[-13,21],[-14,26],[-15,16],[-1,25],[-5,37],[-15,58],[-20,152],[5,25],[19,3],[76,-29],[24,6],[20,10],[18,4],[18,-13],[7,-22],[3,-34],[-2,-35],[-8,-24],[0,-43],[42,-37],[54,-24],[33,-3],[-26,29],[-79,61],[23,65],[7,39],[-6,28],[-13,29],[-1,15],[-2,21],[6,37],[15,30],[-10,14],[-14,-3],[-21,-15],[-10,159],[8,44],[16,13],[26,2],[35,15],[55,46],[118,190],[24,26],[53,43],[23,28],[28,73],[19,48],[17,23]],[[2336,4457],[3,-11],[-5,-14],[-25,-23],[-17,-21],[-11,-9],[-5,-5],[-8,-2],[-6,7],[-4,12],[3,12],[14,8],[-2,3],[-7,5],[4,5],[7,4],[5,8],[9,2],[5,2],[-3,10],[6,0],[16,-3],[10,9],[5,6],[6,-5]],[[4502,5177],[57,-104],[-7,-118]],[[4552,4955],[-50,-58],[-14,-39],[-68,-39],[-34,-12],[-19,2],[-13,-9],[-26,-61],[-30,-34],[-32,-30],[-15,-48],[-4,-57],[-17,-41],[-22,-44],[-16,-55],[-12,-58],[-19,-42],[-1,-47],[35,-16],[5,-20],[3,-24],[15,-43],[-3,-47],[15,-35],[19,-15],[-8,-50],[-57,-75],[-10,-50],[-2,-45],[-29,-32]],[[4143,3831],[-78,69],[-88,35],[-51,-31],[-40,-47],[-43,-6],[-46,-1],[-50,-7],[-50,1],[-24,15],[-21,18],[-24,-7],[-29,0],[-41,-7],[-40,-26],[-51,8],[-34,39],[2,61],[-28,34],[-8,34],[12,54],[-28,46],[-40,-3],[-10,-19],[-14,-14],[-9,-24],[-3,-26],[-43,-1],[-64,96],[-43,37],[-24,11],[-25,2],[-23,-29],[-47,5],[-34,-34],[0,-25],[1,-25],[-13,-21],[-17,-14],[1,-20],[3,-19],[-12,-26],[-18,-17],[-23,-12],[-23,-7],[-20,-14],[-19,-14],[-46,-8],[-44,-17],[-41,-12],[-34,13],[2,50],[9,50],[8,67],[-40,12],[-134,-41],[-29,-10]],[[2515,4004],[-19,23],[-7,20],[10,44],[24,54],[37,95],[32,49],[45,18],[51,11],[44,3],[20,17],[20,31],[27,7],[25,-30],[25,-34],[19,-6],[-18,68],[-13,32],[-21,13],[-196,-35],[-68,46],[4,50],[1,20],[33,17],[28,30],[26,33],[41,26],[51,30],[39,59],[6,55],[21,14],[15,10],[9,8],[49,6],[49,-7],[30,-26],[22,-6],[15,-27],[6,15],[4,21],[2,21],[-18,16],[-13,10],[-26,14],[-30,23],[-24,19],[-13,7],[4,16],[11,17],[11,11],[13,3],[77,-6],[17,2],[12,7],[9,17],[3,13],[7,9],[19,4],[6,6],[-8,13],[-14,14],[-17,7],[-4,-4],[-101,-44],[-34,-2],[-67,5],[-66,5],[-1,32],[-4,44],[-13,12],[-41,15],[-60,-10],[-6,55],[125,15],[68,9],[68,4],[23,15],[23,-8],[29,16],[51,42],[65,28],[27,21],[2,27],[-80,-27]],[[3033,5251],[62,82],[66,8],[77,18],[143,49],[51,-11],[-12,-81],[29,-50],[41,8],[38,17],[76,16],[20,7],[20,10],[29,6],[18,31],[23,26],[45,-42],[62,-121],[45,-25],[18,-5],[8,-18],[-9,-21],[5,-15],[80,-12],[30,8],[41,2],[40,13],[34,32],[33,35]],[[3272,3761],[28,-84],[-55,-79],[-85,14],[-75,50],[-38,90],[30,31],[50,-14],[36,9],[38,12],[71,-29]],[[2471,6047],[-2,-11],[-1,-9],[4,-18],[10,-34],[19,-31],[7,-29],[-13,7],[-61,-4],[-20,4],[-4,27],[7,10],[11,10],[5,17],[-33,-23],[-15,8],[4,28],[25,37],[-9,11],[-19,-24],[-7,17],[-14,-8],[8,44],[-6,67],[-6,41],[-14,52],[12,16],[24,25],[26,9],[19,-31],[2,-12],[-6,-13],[-10,-9],[1,-13],[23,-56],[4,-18],[-6,-15],[7,-14],[15,-9],[13,-23],[-29,0],[0,-12],[9,-2],[20,-12]],[[3632,6354],[-196,84],[-33,-96],[5,-279],[-21,-21],[-13,-39],[126,-26],[94,27]],[[3594,6004],[74,-124],[25,-53],[7,-134],[28,-100],[68,19],[60,49],[20,7],[36,31],[20,80],[18,31],[7,44]],[[3033,5251],[-29,-10],[-28,-20],[-23,-25],[-26,-13],[-31,-6],[-28,-14],[-21,11],[-8,13],[-2,17],[-7,23],[-11,20],[-24,33],[-12,23],[19,17],[-9,11],[-19,9],[-17,6],[-32,59],[-24,11],[-18,-11],[-9,0],[-1,20],[-31,21],[-27,-4],[-8,-35],[-5,-12],[-9,10],[5,53],[47,26],[42,14],[58,-18],[-21,37],[-11,14],[-16,12],[-9,2],[-11,-7],[-8,5],[-10,12],[-9,13],[29,86],[17,38],[20,15],[-15,20],[-59,19],[-21,12],[21,21],[61,16],[13,19],[-9,24],[-22,7],[-45,0],[-10,7],[-16,21],[-11,11],[0,12],[18,0],[-21,42],[25,15],[29,9],[26,41],[57,17],[27,16],[-80,0],[-20,-12],[-30,-48],[-22,-4],[-13,18],[-13,34],[-8,35],[1,20],[29,37],[13,22],[-4,10],[-27,-10],[-12,12],[-10,7],[-7,2],[-6,17],[6,15],[-1,17],[-7,32],[-9,13],[0,8],[19,1],[27,14],[29,-1],[2,22],[8,20],[-11,16],[-16,4],[-22,23],[14,22],[19,17],[-13,25],[-33,7],[-7,31],[11,22],[32,6],[-18,23],[-7,11],[-4,16],[-12,-10],[-19,-23],[-22,-10],[-4,-13],[0,-13],[10,-16],[2,-32],[-10,-35],[6,-49],[-15,-41],[-12,-17],[-26,22],[-27,1],[-26,19],[6,99],[9,36],[-16,8],[5,47],[-15,19],[-22,-4],[-13,-24],[-3,-30],[-10,-21],[-32,-1],[13,-28],[25,-43],[9,-31],[-15,-13],[2,-16],[24,-33],[-22,-5],[-17,-11],[-15,-16],[-12,-19],[0,14],[-2,13],[-3,13],[-5,11],[19,45],[-40,71],[12,36],[-10,50],[-26,-15],[-36,-50],[-27,-11],[-16,-3],[-14,-6],[-14,-1],[-17,10],[-4,9],[-6,17],[-2,17],[7,8],[57,-1],[14,11],[0,28],[-15,29],[-21,11],[-23,7],[-17,15],[-7,-22],[-5,-46],[-7,-21],[-16,-16],[-6,15],[2,46],[-3,45],[4,13],[35,48],[7,17],[6,23],[4,-18],[6,-16],[8,-15],[9,-15],[7,8],[9,-1],[11,-4],[12,-3],[-15,22],[-14,28],[39,-12],[16,4],[10,22],[-35,3],[-22,10],[-2,23],[23,40],[-32,27],[3,26],[23,21],[34,13],[-9,-45],[4,-13],[19,-4],[34,0],[9,7],[9,17],[2,41],[-3,56],[6,45],[32,11],[-4,-25],[1,-40],[6,-41],[18,-48],[-9,-17],[-13,-15],[-9,-16],[1,-17],[8,-27],[1,-8],[-7,-8],[-25,-18],[-5,-5],[1,-16],[5,-16],[7,-10],[10,5],[23,23],[18,0],[39,-29],[-28,66],[-10,41],[14,19],[23,-31],[13,-9],[7,20],[5,6],[15,6],[27,8],[0,11],[-11,2],[-26,12],[0,11],[33,9],[20,34],[5,41],[-11,31],[-12,4],[-36,1],[-18,7],[-14,18],[-4,17],[7,6],[20,-16],[9,29],[-10,17],[-21,7],[-26,-2],[11,14],[13,10],[15,3],[14,-8],[13,-11],[11,-3],[6,6],[-6,14],[0,14],[50,1],[25,-10],[10,-24],[-7,-15],[-13,-16],[-8,-21],[9,-30],[12,13],[15,9],[14,0],[5,-15],[2,-13],[6,-12],[2,-13],[-3,-4],[-12,-16],[-4,-12],[0,-82],[5,-24],[10,-17],[10,-6],[4,9],[6,46],[25,88],[6,43],[7,10],[17,-12],[24,-28],[10,-20],[7,-19],[10,-12],[20,-1],[0,12],[-10,14],[-12,37],[-10,19],[-85,95],[-6,6],[5,19],[11,-2],[15,-14],[22,-29],[11,-11],[14,-7],[18,0],[13,8],[1,12],[-10,12],[-19,5],[-26,14],[-29,28],[-13,43],[-3,28],[25,1],[22,-11],[20,-19],[28,-21],[26,-19],[11,-12],[21,-15],[20,-12],[14,-25],[-7,-25],[-13,-17],[3,-13],[13,-28],[2,-17],[-5,-31],[15,11],[6,14],[4,15],[-5,46],[5,15],[9,15],[13,26],[22,11],[22,1],[24,-4],[26,-10],[34,-10],[24,-16],[29,-32],[2,-40],[-22,-79],[17,11],[25,36],[15,3],[9,-15],[6,-27],[3,-53],[-1,-11],[-7,-25],[-1,-15],[3,-15],[12,-22],[12,-57],[-4,-17],[-23,-7],[4,-16],[6,-10],[8,-8],[11,-5],[8,41],[14,25],[7,26],[-12,46],[28,-8],[29,-4],[-47,56],[-14,31],[28,13],[25,5],[60,26],[27,21]],[[3594,6004],[63,19],[90,26],[31,-3]],[[5694,4885],[-11,3],[-13,-1],[1,-12],[-2,-16],[-13,-36],[0,-12],[-4,-18],[-31,-20],[-80,23],[-44,5],[-20,-17],[-20,-38],[-10,-9],[-13,11],[-17,12],[-24,21],[-17,35],[-20,21],[-21,9],[-8,34],[19,29],[20,0],[23,4],[6,18],[2,18],[-12,5],[-13,2],[15,36],[23,29],[-8,84],[65,58],[87,13],[73,5],[56,-44],[17,-33],[-1,-15],[-6,-12],[0,-47],[11,-18],[15,-13],[3,-30],[1,-31],[-8,-29],[-21,-24]],[[5045,2644],[7,-1],[25,14],[4,-4],[-2,-10],[-13,-18],[-6,-4],[-9,-2],[-13,3],[-11,-1],[-15,-8],[-7,-8],[-8,-2],[-1,7],[4,12],[-1,9],[-6,7],[-5,1],[-6,6],[0,9],[4,8],[1,10],[5,6],[9,3],[44,-26],[0,-11]],[[5194,2995],[9,-5],[13,6],[22,5],[24,2],[13,-14],[4,-24],[-7,-15],[5,-9],[-6,-11],[-14,6],[-6,-3],[1,-5],[11,-2],[11,-11],[-5,-11],[-14,-19],[-23,0],[-10,14],[-6,14],[-11,0],[3,13],[-4,12],[-18,3],[-6,5],[13,12],[2,14],[-13,11],[-25,10],[-16,-6],[-9,1],[-3,12],[11,13],[16,5],[22,-10],[16,-13]],[[5004,2953],[-4,-6],[-13,4],[-8,4],[-15,12],[-9,14],[2,10],[9,17],[19,16],[17,-5],[21,-25],[7,-14],[-5,-10],[-15,0],[-7,-4],[1,-13]],[[4690,3080],[7,-6],[8,20],[16,29],[13,2],[4,-13],[8,-7],[6,-4],[4,-23],[7,-30],[8,-12],[6,-5],[8,-13],[-15,-4],[-62,18],[-34,-12],[-20,3],[-21,13],[-12,27],[9,28],[19,27],[12,25],[13,18],[22,6],[7,-20],[-10,-30],[-5,-20],[2,-17]],[[4602,2998],[17,-33],[26,6],[34,14],[32,8],[47,-9],[9,-4],[7,-21],[-4,-18],[-7,-20],[-5,-24],[4,-38],[-1,-22],[-8,-9],[-11,-7],[12,-37],[-6,-19],[-21,-4],[-20,13],[-22,11],[-26,-14],[-22,-3],[-14,36],[-15,74],[-23,14],[-18,-14],[-12,-31],[-5,-38],[-8,-17],[-20,0],[-20,7],[-13,10],[-8,16],[-2,14],[-1,16],[-3,23],[-38,136],[-5,33],[4,33],[16,33],[10,8],[11,2],[8,7],[7,40],[8,12],[22,19],[18,10],[21,-8],[18,-17],[11,-23],[-2,-25],[-12,-23],[-31,-35],[6,-13],[6,-32],[8,-17],[11,-9],[30,-11]],[[5670,3237],[8,-17],[6,-18],[0,-24],[-6,-22],[-22,-63],[28,11],[14,10],[4,-3],[2,-31],[-2,-22],[-6,-23],[-12,-13],[-19,8],[8,-24],[18,-42],[3,-29],[-10,-4],[-24,9],[-26,15],[-16,12],[-4,-25],[-5,-14],[-24,-31],[-7,-24],[16,-14],[23,-10],[11,-14],[-21,-21],[-100,-34],[-30,-2],[47,37],[-20,11],[-7,16],[1,22],[7,27],[-43,-24],[-12,9],[-7,22],[1,21],[9,10],[34,7],[10,21],[1,28],[7,33],[-19,12],[-14,-19],[-50,-24],[-21,-20],[-16,27],[-20,24],[-16,27],[-4,35],[9,21],[18,19],[21,15],[18,9],[52,11],[14,0],[22,-10],[18,-13],[19,-10],[26,-2],[0,11],[-26,19],[-15,27],[-6,31],[-2,30],[19,-3],[96,61],[-16,34],[7,33],[22,19],[24,-11],[6,-15],[1,-18],[-9,-68],[0,-11],[7,-22]],[[5818,3310],[-7,-3],[-3,8],[-7,32],[-10,12],[-4,10],[2,13],[-5,15],[-7,15],[4,13],[14,9],[16,2],[14,-5],[9,-23],[0,-47],[-6,-38],[-10,-13]],[[6062,4389],[6,-73],[-34,-76],[20,-46],[85,-14],[36,-29],[60,-75],[71,-42],[31,-27],[9,-51],[31,-33],[39,-15],[5,-5]],[[6421,3903],[-6,-25],[-3,-34],[-8,-17],[-9,-15],[8,-26],[0,-10],[-15,-34],[-22,-51],[-25,-33],[-13,-30],[-3,-5]],[[6325,3623],[-2,6],[-28,31],[-25,35],[-32,28],[-24,38],[-8,40],[-27,19],[-35,1],[-32,-14],[-27,-21],[-19,-26],[-15,-109],[-19,-33],[-21,-28],[-12,-23]],[[5999,3567],[-6,6],[-13,-20],[-42,-81],[-19,-2],[-1,38],[1,35],[-9,2],[-12,-30],[-10,-44],[-34,4],[-91,-1],[-5,34],[-9,18],[-13,-51],[-14,-8],[-32,16],[-15,31],[-16,2],[-22,-18],[0,81],[-5,6],[-12,-5],[-10,-17],[-1,-28],[-22,18],[-17,27],[-19,17],[-28,-12],[7,26],[-12,37],[5,14],[-13,48],[-8,5],[-16,-16],[-17,-29],[-1,-20],[18,-40],[10,-48],[5,-18],[12,-22],[23,-34],[3,-17],[-6,-24],[11,-2],[17,-8],[10,-3],[-12,-9],[-13,-3],[-28,0],[-14,3],[-4,10],[-1,12],[-5,12],[-13,16],[-9,8],[-75,29],[-21,1],[-45,-9],[-13,-7],[1,-13],[16,-25],[-26,-5],[-47,-26],[-54,-17],[-7,-23],[-3,-25],[-15,-17],[0,-12],[138,80],[23,1],[5,-32],[8,-24],[3,-21],[-11,-24],[-17,-11],[-27,-5],[-27,1],[-18,8],[-10,-18],[7,-8],[12,-8],[10,-16],[1,-10],[0,-14],[-1,-38],[-11,-75],[13,-14],[12,5],[10,14],[4,19],[19,-24],[-20,-38],[-34,-50],[-31,-10],[-42,3],[1,28],[27,1],[11,2],[7,12],[-86,11],[-18,7],[-20,31],[-2,15],[14,10],[32,13],[-32,69],[-22,-24],[-23,-48],[-32,-3],[-29,43],[-15,11],[-32,4],[-14,-10],[-7,-22],[-3,-28],[1,-27],[-29,5],[-65,-3],[-25,15],[-3,10],[0,27],[-2,7],[-6,2],[-15,-3],[-20,5],[-33,3],[-11,7],[-6,15],[0,14],[4,14],[2,13],[-2,136],[2,22],[4,10],[7,14],[6,17],[2,23],[-22,-28],[-18,-33],[-21,-25],[-34,-3],[26,-65],[-17,-13],[-38,1],[-36,-25],[-14,44],[-9,18],[-15,13],[-4,-59],[-15,-47],[-29,-28],[-37,-4],[-14,7],[-14,3],[-11,-1],[-8,-9],[-20,19],[-15,4]],[[4402,3242],[-3,8],[0,34],[-19,50],[-86,103],[-15,34],[-12,39],[-30,35],[-34,27],[-19,37],[-6,98],[-14,47],[-28,37],[7,40]],[[4552,4955],[11,-40],[28,-18],[13,-11],[13,-11],[1,-15],[6,-15],[11,-5],[11,-4],[42,-4],[18,-16],[22,-17],[40,-3],[39,0],[36,-13],[26,-31],[18,-38],[31,-23],[7,-17],[5,-16],[21,-14],[19,-24],[-1,-43],[-17,-42],[22,-85],[85,-4],[42,7],[40,-8],[37,-19],[35,-29],[39,-9],[74,42],[38,-9],[34,53],[32,27],[11,-102],[35,-46],[43,-30],[50,6],[52,10],[45,-15],[43,-24],[52,-2],[44,39],[20,8],[20,3],[19,17],[16,23],[50,22],[53,-14],[41,-21],[38,14]],[[2385,1399],[-5,-7],[2,-10],[-4,-1],[-2,-3],[-13,0],[-3,-13],[1,-12],[-5,-4],[-5,6],[-13,24],[-8,14],[17,4],[13,-4],[25,6]],[[3202,1431],[-31,-6],[-1,8],[-2,21],[11,7],[10,-2],[13,-28]],[[3723,1587],[8,-5],[6,6],[4,-6],[3,-13],[0,-9],[6,-4],[2,-5],[1,-5],[1,-2],[-3,-4],[-4,0],[-16,7],[-8,13],[-8,18],[2,12],[6,-3]],[[3700,1592],[3,-8],[-5,-17],[3,-19],[17,-32],[8,-8],[10,-4],[4,-6],[-2,-9],[-20,11],[-18,4],[-4,6],[-5,13],[-3,15],[-5,4],[-4,6],[-3,13],[2,7],[-1,9],[1,7],[4,2],[5,-2],[7,2],[4,5],[2,1]],[[722,1573],[-4,-8],[-6,1],[-3,2],[-7,5],[-27,27],[-15,11],[-3,14],[6,19],[11,11],[15,-5],[12,-17],[20,-45],[1,-15]],[[2746,1661],[-1,-3],[-10,6],[-16,1],[-4,1],[4,7],[4,4],[-4,11],[5,5],[9,-2],[8,-16],[5,-14]],[[2696,1789],[8,-1],[11,4],[16,0],[8,-3],[12,-5],[11,-16],[-3,-8],[-6,5],[-5,1],[-2,-7],[-6,2],[-12,8],[-13,0],[-8,-8],[-4,-10],[-16,-12],[-13,-14],[-21,-14],[-26,2],[-15,21],[-1,28],[12,28],[24,19],[21,0],[28,-20]],[[2830,1698],[-13,-4],[-7,4],[-3,9],[-7,6],[-7,2],[-3,24],[9,43],[3,24],[-9,9],[-3,8],[12,12],[0,7],[12,0],[24,-14],[3,-18],[-13,-12],[-3,-14],[14,-23],[6,-3],[5,-9],[-5,-6],[-6,-1],[-2,-11],[0,-19],[-7,-14]],[[2963,1817],[-4,-12],[-9,15],[-7,7],[3,14],[0,11],[20,17],[5,-18],[3,-6],[0,-6],[-2,-9],[-9,-13]],[[3181,1786],[-8,-17],[-17,-10],[-20,-2],[-15,9],[-13,13],[-9,-2],[-5,-9],[-5,3],[-5,29],[8,19],[2,17],[6,14],[10,11],[19,10],[24,-6],[14,-22],[13,-14],[8,-10],[-3,-23],[-4,-10]],[[2725,1809],[-7,-7],[-21,6],[-11,12],[-3,7],[-6,2],[-6,2],[-2,6],[7,22],[5,8],[0,6],[-3,4],[2,4],[5,3],[3,4],[-1,5],[-7,13],[4,5],[11,-4],[11,-7],[29,-5],[15,-9],[7,-6],[5,-9],[1,-16],[-9,-9],[-5,-21],[-20,-1],[-11,-2],[7,-13]],[[1851,1923],[-15,-17],[-11,-4],[-2,3],[-5,-2],[-5,-1],[0,9],[-2,10],[5,-3],[2,9],[7,7],[7,-3],[5,-2],[14,-6]],[[3651,1879],[4,-8],[-7,-2],[-25,6],[-24,-7],[11,39],[14,15],[5,9],[6,6],[7,3],[6,-1],[4,-7],[2,-9],[-2,-21],[1,-3],[-6,-6],[-2,-6],[6,-8]],[[2757,1941],[11,-6],[8,-16],[-7,2],[-10,-10],[-7,2],[-14,-5],[-8,16],[11,11],[1,5],[4,-3],[4,3],[7,1]],[[1987,1947],[8,-6],[5,1],[1,-12],[6,-7],[-5,1],[-4,-11],[-8,-17],[-10,4],[-8,9],[-7,-17],[-5,14],[-7,2],[-9,6],[9,9],[6,-1],[7,0],[6,-6],[3,8],[9,7],[-2,10],[5,6]],[[1809,1955],[2,-23],[-4,-5],[-3,8],[1,11],[-4,-4],[-5,-2],[-5,-2],[0,-4],[4,-8],[-1,-5],[-7,6],[-10,7],[-4,-2],[-1,6],[11,16],[14,6],[12,-5]],[[4034,1964],[-6,-4],[-11,13],[11,5],[6,-2],[0,-12]],[[2692,2003],[8,-7],[-13,-7],[-6,-4],[-13,3],[-12,-1],[0,16],[13,-4],[23,4]],[[3843,1999],[-4,-4],[-2,2],[-4,-2],[-4,-4],[-3,13],[-1,16],[19,1],[-1,-22]],[[3777,2024],[4,-13],[9,5],[8,3],[5,-8],[-6,-4],[-3,-10],[-21,-25],[4,52]],[[1958,2059],[48,-11],[20,3],[9,-5],[-2,-21],[3,-13],[-7,-10],[-13,-2],[-8,-7],[-6,3],[-6,10],[-4,-1],[-3,-9],[-9,-1],[-28,13],[-10,15],[-1,10],[6,9],[1,9],[10,8]],[[3269,2044],[-11,-4],[-9,1],[-4,8],[-8,4],[-6,9],[0,16],[5,12],[18,12],[34,1],[8,-3],[14,-10],[0,-13],[-6,-10],[-27,-22],[-8,-1]],[[1907,2108],[19,-8],[6,4],[5,3],[27,-3],[27,-18],[3,-11],[-2,-6],[-5,4],[-32,9],[-29,-5],[-18,5],[-4,8],[0,7],[-4,4],[1,3],[6,4]],[[2567,2099],[0,-6],[-6,1],[-7,12],[1,11],[8,-2],[6,-5],[-2,-11]],[[3076,2123],[10,-2],[6,0],[6,1],[15,-2],[19,-5],[13,-8],[-3,-13],[-8,-11],[-2,-6],[-2,-13],[-8,-10],[-12,2],[-13,-2],[-7,-7],[-6,-7],[-12,-3],[-7,11],[-3,14],[-7,11],[-11,5],[-14,-2],[-16,-6],[-14,0],[-5,3],[-5,4],[-31,15],[-2,6],[14,2],[14,4],[6,4],[5,3],[11,-2],[13,-6],[15,7],[19,16],[14,4],[8,-7]],[[3355,2137],[11,-5],[19,7],[14,2],[6,-7],[5,-8],[8,-12],[5,-4],[2,-9],[-8,-2],[-12,6],[-13,4],[-10,-4],[3,-5],[9,-6],[-10,-11],[-25,-21],[-14,-7],[-1,16],[7,12],[9,6],[-5,8],[-31,6],[4,8],[-3,9],[-9,6],[-23,3],[-9,3],[-4,3],[3,3],[10,3],[8,6],[13,17],[14,12],[-1,5],[4,-2],[10,-10],[9,-15],[5,-17]],[[970,2190],[-6,-3],[-8,-2],[-5,4],[-9,-10],[-14,25],[-4,9],[9,1],[12,-4],[8,-6],[12,-9],[5,-5]],[[2941,2076],[25,-28],[3,-11],[8,-21],[-5,-5],[-7,1],[-7,3],[-12,5],[-11,8],[-5,-1],[-2,-11],[-6,-4],[-12,6],[-21,5],[-26,10],[-1,12],[13,11],[-3,14],[-12,3],[-14,-4],[-18,5],[-16,12],[-10,14],[-4,20],[-2,22],[2,24],[5,23],[11,18],[15,8],[8,2],[24,2],[16,-5],[15,-12],[16,-21],[13,-35],[4,-30],[4,-13],[8,-11],[4,-16]],[[3218,2224],[-8,-30],[-5,-6],[5,-20],[-10,-12],[-11,0],[-6,-10],[-9,-9],[-7,-1],[-4,-3],[-6,1],[-11,5],[-10,8],[-4,9],[-2,7],[3,18],[-2,7],[-9,-6],[-9,-12],[-3,-9],[-3,9],[0,28],[1,21],[-6,7],[1,7],[9,-4],[10,-8],[31,-2],[4,1],[7,-3],[9,-9],[12,-4],[12,1],[9,12],[6,18],[5,2],[1,-13]],[[3665,2181],[-5,-2],[-20,7],[-6,8],[0,10],[3,7],[-1,7],[-6,5],[-6,2],[-1,6],[-1,10],[4,4],[8,-2],[6,-12],[3,-2],[5,-5],[4,-11],[6,-12],[6,-7],[2,-7],[0,-4],[-1,-2]],[[3099,2213],[1,-11],[-10,-2],[-28,10],[-12,-3],[-7,-12],[-36,-18],[-13,-19],[-4,-20],[-8,-6],[-9,12],[1,19],[-3,16],[-7,5],[-7,1],[-6,6],[5,11],[7,11],[9,23],[20,29],[27,16],[29,8],[17,-3],[6,-11],[1,-13],[-7,-8],[1,-4],[13,-9],[11,-13],[9,-15]],[[942,2294],[-19,-15],[-2,8],[4,9],[9,14],[7,-2],[-1,-5],[2,-9]],[[2485,2322],[3,-15],[-5,6],[1,6],[1,3]],[[3350,2323],[14,-8],[5,4],[10,-12],[15,-45],[-5,-9],[0,-14],[-3,-3],[-3,-3],[-3,-9],[-5,7],[-6,30],[-6,5],[-1,-5],[2,-8],[-2,-7],[-5,0],[-7,6],[-23,59],[6,9],[17,3]],[[4400,2234],[-1,-3],[-17,15],[-5,11],[7,9],[-2,3],[-5,5],[8,15],[3,9],[0,13],[2,11],[7,4],[4,-9],[11,-10],[-8,-43],[1,-9],[-1,-9],[-2,-5],[-2,-7]],[[2481,2341],[4,-18],[-3,1],[-7,4],[6,13]],[[3963,2333],[1,-5],[6,2],[12,14],[13,1],[30,-36],[7,-19],[0,-10],[-11,-13],[-25,-18],[-22,-7],[-8,5],[0,15],[-10,11],[-14,5],[-6,10],[4,7],[-15,11],[-10,7],[5,14],[-1,10],[-2,9],[7,4],[10,-5],[10,-6],[19,-6]],[[3582,2260],[-57,-12],[-22,4],[-16,8],[-33,25],[0,13],[7,11],[1,8],[-5,9],[-13,9],[19,16],[22,10],[45,9],[44,5],[22,-1],[19,-11],[15,-29],[-5,-35],[-18,-28],[-25,-11]],[[1991,2372],[3,-4],[9,1],[3,-2],[-4,-8],[-15,-13],[-12,-14],[-9,-5],[-3,22],[-6,13],[1,4],[8,6],[9,10],[4,12],[12,-2],[8,-9],[-8,-11]],[[4427,2363],[-8,-7],[-10,0],[-3,5],[-5,-1],[-5,-9],[-4,3],[0,18],[9,16],[14,7],[11,2],[3,-4],[-8,-11],[4,-8],[2,-11]],[[3476,2424],[-10,-13],[-19,-8],[-5,11],[-8,2],[-1,15],[9,-1],[4,9],[9,-4],[3,-11],[5,5],[4,15],[10,-3],[-1,-17]],[[3946,2430],[-3,-5],[-8,3],[-6,-4],[8,-5],[44,-15],[4,-7],[4,-9],[-4,-6],[-11,-9],[-13,1],[-30,-8],[-10,-5],[-8,7],[-8,11],[-1,12],[11,7],[10,-1],[-1,5],[-7,10],[-1,7],[-2,7],[-21,5],[0,5],[5,0],[1,2],[-1,8],[4,14],[11,14],[22,2],[14,-14],[-9,-8],[-10,-1],[2,-5],[9,-8],[5,-10]],[[4367,2379],[-12,-1],[-2,3],[-5,8],[-13,8],[-20,7],[-13,11],[-6,16],[-7,11],[-12,7],[-9,13],[7,16],[23,12],[26,4],[18,-15],[20,-45],[-2,-13],[1,-6],[11,-2],[9,-6],[6,-10],[-3,-12],[-17,-6]],[[2348,2470],[9,-8],[6,2],[31,22],[2,-16],[41,-73],[2,-25],[-4,-29],[-7,-27],[-28,-64],[-11,-20],[-13,-10],[-3,6],[-23,24],[-11,8],[0,-12],[-6,-29],[-131,-79],[-16,-6],[-58,-6],[-16,5],[-3,16],[8,13],[10,11],[4,10],[-7,11],[-40,28],[0,-39],[-29,38],[17,61],[39,50],[39,3],[12,40],[8,14],[13,16],[15,9],[13,2],[10,8],[4,27],[16,-22],[22,-3],[19,14],[9,28],[-11,23],[-35,31],[9,16],[22,1],[23,-13],[20,-18],[15,-8],[3,-5],[4,-12],[7,-13]],[[3850,2529],[-12,-13],[12,21],[7,10],[-4,-8],[-3,-10]],[[4213,2539],[4,-3],[17,0],[4,5],[10,-4],[6,-12],[-5,-9],[-8,-4],[-3,8],[-4,7],[-8,-18],[-9,-6],[-6,0],[-17,-4],[-15,22],[-7,-3],[-2,7],[7,16],[8,9],[14,7],[7,-2],[5,-7],[2,-9]],[[3435,2580],[-7,-4],[-9,23],[3,4],[6,2],[3,-3],[9,-9],[-5,-13]],[[4063,2614],[9,-9],[0,-10],[-6,-3],[-10,-1],[-2,-9],[-4,-8],[-10,3],[-5,11],[-1,13],[-7,-9],[-12,1],[-3,10],[6,13],[8,-6],[7,-2],[6,6],[12,6],[12,-6]],[[1992,2460],[-15,-3],[-16,5],[-5,10],[8,3],[8,0],[7,8],[8,7],[-1,6],[-31,8],[8,9],[19,4],[20,0],[16,14],[7,18],[-7,18],[-14,24],[-9,31],[11,9],[16,-15],[10,-11],[17,-11],[1,-16],[4,-3],[2,-10],[-1,-19],[-4,-20],[-2,-18],[-7,-9],[-11,-9],[-12,-13],[-27,-17]],[[1716,2624],[3,-20],[-3,-8],[-7,-6],[-21,-8],[-11,1],[-12,-6],[-9,5],[0,10],[9,3],[0,5],[-26,23],[2,3],[6,0],[11,-7],[14,-2],[30,20],[10,0],[4,-13]],[[1965,2528],[-13,-7],[-11,10],[-6,64],[5,36],[12,16],[17,-42],[15,-24],[12,-26],[-4,-22],[-13,-4],[-14,-1]],[[1881,2637],[-1,-19],[-12,6],[-5,10],[-5,-2],[-13,3],[-8,16],[7,5],[10,9],[7,1],[7,-4],[4,-14],[5,-1],[4,-10]],[[1184,2664],[-9,-11],[-8,5],[-6,6],[5,11],[7,3],[3,8],[4,0],[2,0],[5,1],[3,1],[7,-1],[-3,-10],[-10,-13]],[[2129,2690],[1,-7],[23,19],[15,-19],[3,-24],[16,0],[2,-6],[-26,-14],[-8,-11],[-9,0],[-10,4],[-8,-4],[-5,-7],[-4,-1],[-8,0],[-8,-4],[-8,-6],[-7,-1],[-3,5],[5,47],[-10,6],[-8,8],[5,7],[10,5],[5,8],[26,21],[7,1],[9,-5],[1,-11],[-6,-11]],[[1052,2719],[-8,-12],[-12,18],[17,9],[10,-8],[-7,-7]],[[1132,2760],[4,-13],[12,0],[16,5],[2,-8],[-12,-13],[-6,-9],[-4,-10],[-21,-28],[-5,-13],[-9,-17],[-7,-10],[-5,-7],[-14,6],[-9,26],[2,25],[7,22],[9,20],[10,17],[12,10],[11,2],[7,-5]],[[2062,2771],[-8,-9],[-11,11],[4,11],[14,9],[1,-22]],[[814,2797],[3,-4],[11,3],[1,-20],[-1,-9],[-9,-22],[-13,-9],[-6,-5],[5,-15],[-7,-1],[-5,-6],[-3,-10],[-10,13],[2,9],[-3,13],[3,4],[7,5],[4,-3],[16,35],[1,18],[4,4]],[[4392,2547],[-15,-2],[-16,9],[-49,55],[-5,22],[8,33],[6,9],[26,22],[5,11],[10,47],[-21,24],[3,15],[15,8],[17,2],[15,-8],[3,-17],[-7,-20],[-16,-17],[14,-4],[12,-22],[10,-27],[12,-46],[1,-27],[-4,-26],[-10,-26],[-14,-15]],[[4316,2780],[-14,-12],[-11,6],[-8,15],[-3,3],[5,7],[4,4],[4,2],[7,-3],[0,-4],[-5,-2],[4,-6],[6,-3],[11,-7]],[[1911,2727],[-21,-31],[-10,-8],[-9,-1],[-14,1],[0,6],[-20,13],[-22,10],[-6,-2],[-12,31],[9,14],[41,18],[25,38],[8,4],[5,-3],[12,-24],[17,-17],[4,-7],[2,-14],[-3,-15],[-6,-13]],[[2075,2897],[13,-6],[8,-10],[12,-7],[17,-1],[13,-3],[9,-10],[5,-10],[-1,-9],[1,-12],[5,-16],[1,-20],[-8,-18],[-18,-2],[-16,18],[-13,20],[-15,1],[-7,-8],[-5,-2],[-10,-1],[-10,8],[-2,16],[-13,25],[-27,31],[-6,16],[14,-4],[11,0],[10,5],[15,2],[17,-3]],[[2352,2880],[-5,-1],[-13,36],[11,6],[5,9],[6,-3],[4,-5],[6,-5],[-8,-11],[-8,-4],[-1,-8],[4,-5],[-1,-9]],[[1922,2917],[1,-39],[-7,4],[-15,4],[-7,5],[-12,-17],[-19,-1],[-17,4],[-8,-4],[-3,-25],[-7,-22],[-12,-16],[-17,-8],[-16,2],[-12,12],[-7,20],[-2,24],[4,23],[11,16],[15,11],[17,7],[19,-8],[24,6],[46,19],[9,2],[6,-2],[5,-5],[4,-12]],[[3936,2954],[-2,-14],[0,-6],[-7,-4],[-8,-6],[-2,-11],[-3,-2],[-8,3],[-6,6],[6,6],[0,12],[3,6],[4,1],[13,-2],[10,11]],[[2131,2887],[-17,-5],[-16,10],[-18,17],[-23,10],[-17,11],[14,12],[34,6],[20,10],[10,9],[14,-6],[10,-15],[3,-8],[-4,-4],[-5,-12],[3,-25],[-8,-10]],[[2109,3098],[6,-4],[7,-10],[2,-12],[-19,-13],[7,-28],[-4,-18],[-9,-7],[-14,1],[-9,-11],[1,-20],[-5,-18],[-14,-9],[-13,1],[-3,11],[1,7],[-21,26],[-12,18],[-9,19],[4,15],[20,11],[17,2],[13,-8],[13,0],[3,11],[-2,22],[13,14],[18,-1],[9,1]],[[4287,3131],[12,-6],[6,3],[7,-1],[7,-5],[-30,-39],[-15,-3],[-11,4],[-13,14],[-1,8],[7,12],[15,12],[16,1]],[[2408,3060],[3,-39],[-27,-27],[-15,6],[9,11],[4,11],[-3,7],[-39,23],[-5,4],[-41,-8],[-18,-9],[-21,-4],[-16,6],[-8,12],[7,10],[22,1],[28,12],[5,6],[4,6],[2,7],[17,6],[6,12],[1,13],[-11,16],[-4,19],[15,8],[23,-6],[25,-14],[18,-19],[-2,-11],[-12,-2],[-21,-15],[-3,-9],[1,-10],[2,-9],[9,-3],[19,0],[26,-11]],[[2035,3158],[4,-27],[-5,-26],[-10,-22],[-16,-15],[-20,-6],[-12,4],[-9,9],[-11,5],[-45,-11],[-17,-1],[0,12],[13,13],[25,43],[19,19],[9,-1],[13,-4],[11,1],[6,11],[6,24],[13,4],[15,-12],[11,-20]],[[2252,3167],[-12,-6],[-17,0],[-7,17],[3,18],[11,6],[24,0],[8,-3],[0,-8],[-5,-19],[-5,-5]],[[2293,3264],[6,-7],[11,-7],[9,-24],[7,-19],[-5,-10],[-22,8],[-5,19],[-4,9],[-8,16],[-8,13],[6,0],[8,-4],[0,5],[5,1]],[[2207,3259],[-3,-24],[-7,4],[-6,15],[-3,11],[5,16],[11,8],[8,5],[1,-7],[-3,-8],[1,-5],[-4,-15]],[[2271,3277],[-7,-7],[-6,6],[-8,0],[5,8],[2,11],[-1,22],[-8,12],[6,4],[8,-2],[12,-10],[3,-6],[8,-10],[1,-18],[-1,-8],[-14,-2]],[[2148,3321],[10,-6],[2,-9],[-3,-25],[-17,-16],[-26,-7],[-2,-11],[2,-11],[-2,-5],[-17,-4],[-4,-4],[-4,1],[2,12],[10,25],[4,38],[14,8],[5,8],[-6,1],[-8,-2],[-37,-2],[-5,3],[-9,-2],[-9,5],[-2,8],[5,4],[11,4],[4,5],[3,7],[6,6],[6,3],[7,7],[9,4],[12,-2],[6,-3],[6,-1],[4,-3],[2,-4],[4,-2],[3,-4],[1,-8],[3,-12],[10,-6]],[[2111,3427],[12,-6],[17,2],[13,-4],[5,-9],[4,-8],[1,-9],[0,-18],[-6,-6],[-7,-4],[-7,3],[-13,15],[-5,4],[-8,-4],[-6,1],[-2,8],[-6,2],[-6,0],[-2,4],[10,9],[-4,2],[-6,-1],[-6,2],[2,8],[11,8],[9,1]],[[1948,3493],[0,-32],[-5,5],[-10,5],[-8,14],[2,15],[6,4],[8,2],[7,-13]],[[2173,3509],[13,-9],[12,4],[13,8],[9,-5],[3,-8],[6,1],[9,2],[3,-12],[-9,-10],[-13,-1],[-5,-7],[0,-10],[15,-17],[13,-6],[14,-1],[8,-13],[4,-16],[7,-11],[3,-14],[-6,-18],[-5,-5],[-3,6],[-17,4],[-6,10],[-6,11],[0,16],[3,9],[-9,3],[-36,6],[-8,8],[-12,1],[-6,2],[-6,5],[-8,5],[-7,10],[-15,38],[9,14],[17,7],[16,-7]],[[2070,3430],[-5,-15],[-7,-2],[-37,11],[-13,-2],[-5,4],[-4,4],[-3,3],[-6,1],[10,59],[8,17],[9,6],[17,6],[15,8],[6,12],[11,25],[25,17],[28,8],[21,-7],[-42,-26],[-9,-16],[-2,-18],[7,-19],[18,-33],[-15,-7],[-15,-16],[-12,-20]],[[2118,3827],[-12,-10],[-4,7],[-5,13],[-4,8],[-1,7],[6,6],[2,5],[3,6],[9,-5],[6,-8],[3,-17],[4,-9],[-7,-3]],[[1963,3964],[3,-11],[-9,-8],[-3,-5],[-7,-1],[-16,-6],[3,10],[-8,7],[-5,6],[5,3],[4,1],[5,-3],[4,0],[-3,8],[-6,6],[-5,3],[7,6],[10,10],[9,-9],[2,-6],[7,-3],[3,-8]],[[4402,3242],[-9,3],[-56,-1],[-18,4],[-8,9],[-3,14],[-8,18],[-16,14],[-4,-14],[3,-22],[3,-10],[-10,-34],[-6,-12],[-13,-16],[-52,-46],[-29,-14],[-21,20],[-26,58],[-21,9],[-15,-23],[-8,-37],[2,-31],[13,-33],[21,-42],[24,-36],[22,-16],[16,-22],[14,-8],[17,12],[43,44],[30,5],[25,-6],[24,-1],[26,15],[-2,-36],[-4,-26],[-14,-52],[-16,-92],[-11,-22],[-49,-17],[-38,21],[-31,7],[-25,-61],[-8,6],[-2,-1],[-2,-3],[-7,-2],[11,-24],[8,-26],[10,-83],[-6,-15],[-15,9],[-22,26],[-33,4],[-25,15],[-16,28],[-6,41],[8,39],[18,38],[13,36],[-6,32],[-12,17],[-21,52],[-6,4],[-8,0],[-8,1],[-7,8],[0,10],[2,11],[4,7],[-21,48],[-3,18],[1,11],[6,18],[1,10],[-3,10],[-6,8],[-7,2],[-3,-7],[-4,-4],[-24,-66],[-9,-14],[-5,-4],[-7,-1],[-47,-18],[-27,-3],[-60,1],[-22,-7],[18,-17],[35,-17],[30,-9],[0,-12],[-59,-20],[-30,-19],[-5,-25],[12,-10],[26,11],[14,-6],[10,-18],[-3,-6],[-8,-2],[-3,-5],[19,-74],[40,-39],[43,-30],[29,-47],[-14,2],[-24,1],[-10,-3],[59,-25],[7,-21],[4,-38],[-12,-14],[-14,-13],[-27,1],[-17,-4],[-63,43],[-20,7],[-18,-4],[-22,-11],[-19,-15],[-8,-14],[3,-6],[16,-38],[20,-5],[11,-8],[53,15],[29,-27],[-66,-66],[-23,-37],[-25,13],[-40,-33],[4,-32],[18,-22],[-38,0],[-57,82],[-19,44],[-52,62],[-16,-4],[-54,-31],[5,-19],[4,-8],[-23,9],[-21,5],[-19,10],[-13,27],[-1,27],[9,16],[30,20],[10,9],[28,41],[17,40],[10,13],[20,11],[-1,-31],[-7,-30],[-20,-53],[40,2],[34,14],[20,31],[0,54],[-8,21],[-11,13],[-8,14],[-1,28],[7,14],[40,49],[14,-9],[10,-11],[2,-14],[-7,-18],[8,-24],[12,-17],[16,-5],[21,8],[9,13],[19,45],[10,19],[-19,31],[-7,33],[-10,15],[-26,-22],[-30,-14],[-25,23],[-34,60],[-20,-34],[-27,-78],[-20,-26],[-20,-9],[-16,1],[-35,8],[-16,-7],[-15,-15],[-25,-36],[-12,-11],[-50,-32],[-27,-23],[-18,-11],[-17,-5],[-10,-6],[-2,-15],[0,-20],[-2,-22],[-9,-15],[-13,-17],[-7,-19],[11,-24],[-76,-83],[2,-76],[-13,-13],[-37,21],[-12,-16],[-5,-19],[0,-19],[8,-22],[-18,6],[-38,31],[-53,17],[-13,8],[-10,35],[5,94],[-5,36],[8,23],[-2,28],[-9,25],[-16,13],[-15,-5],[-15,-15],[-11,-20],[-5,-18],[6,-25],[8,-23],[1,-15],[-43,-16],[6,-22],[31,-44],[-53,-33],[-20,-21],[21,-9],[4,-4],[2,-9],[-2,-9],[-4,-4],[-9,2],[-13,9],[-6,2],[-19,-3],[-3,-9],[-1,-13],[-7,-19],[-10,-8],[-41,-11],[-16,-14],[-5,-12],[-34,-125],[-2,-18],[0,-21],[-34,8],[-64,-23],[-16,4],[-2,21],[13,45],[-2,20],[-13,12],[-17,4],[-36,-2],[0,12],[7,10],[3,8],[2,29],[5,1],[6,-3],[6,5],[20,39],[3,19],[-5,19],[-7,6],[-10,4],[-20,2],[-15,5],[-2,10],[4,9],[3,2],[0,24],[6,23],[-3,12],[-22,-8],[6,44],[28,23],[36,7],[35,1],[-7,15],[-8,11],[-11,7],[-13,5],[22,17],[13,20],[1,17],[-17,10],[-6,-3],[-13,-17],[-9,-6],[-11,0],[-18,12],[-9,0],[-9,-8],[-5,-13],[-5,-16],[-12,-3],[-12,0],[-13,3],[-30,-1],[-16,-3],[-20,-9],[-3,29],[-12,17],[-33,18],[1,6],[-7,15],[-8,9],[-4,-12],[-5,-7],[-9,-6],[-11,-3],[-9,4],[-29,30],[-3,2],[-5,18],[2,6],[6,2],[5,10],[6,-8],[14,0],[10,8],[-6,19],[-37,20],[-29,23],[-2,53],[12,59],[14,41],[2,14],[-1,17],[2,15],[11,6],[10,-1],[11,-4],[8,-6],[9,-22],[42,-69],[-13,-19],[-4,-18],[3,-19],[4,-21],[29,-88],[17,-11],[68,-13],[29,-22],[16,2],[11,32],[-15,-3],[-8,5],[-29,7],[-13,23],[-18,19],[5,42],[-18,-3],[-9,-27],[-14,-1],[-9,34],[-4,46],[11,27],[-8,32],[37,4],[58,-14],[8,-15],[-4,-24],[0,-7],[0,-7],[3,-11],[14,-10],[9,-13],[18,-13],[25,-11],[14,-16],[20,-15],[14,-10],[6,8],[-29,42],[18,4],[25,-16],[33,-20],[40,-14],[29,8],[-29,6],[-24,16],[-41,40],[10,14],[-30,24],[-45,63],[-25,13],[-35,8],[-41,-3],[-28,20],[-34,-10],[-32,11],[-5,18],[20,27],[20,9],[41,-7],[52,25],[63,-51],[21,5],[6,-4],[3,-4],[4,-3],[6,-3],[-6,36],[3,32],[16,24],[34,9],[63,-21],[33,-3],[-10,24],[21,12],[12,2],[14,-1],[-20,26],[-32,7],[-71,-7],[5,17],[-2,13],[-3,12],[0,19],[5,13],[7,9],[6,11],[0,19],[-11,27],[-19,6],[-20,-10],[-15,-23],[-2,-15],[9,-31],[2,-17],[-2,-3],[-17,-36],[-15,-63],[-15,-21],[-27,-3],[0,4],[-9,8],[6,9],[7,20],[6,9],[-19,11],[-12,-6],[-12,-12],[-19,-6],[-36,9],[-12,-6],[-2,-19],[-19,0],[-30,-11],[-14,8],[-5,20],[10,18],[28,31],[10,17],[6,13],[2,13],[1,14],[-4,28],[5,13],[18,18],[-18,14],[-15,31],[-8,36],[3,31],[19,19],[26,20],[8,16],[-34,9],[-16,-3],[-9,-9],[-8,-9],[-10,-4],[-13,-8],[2,-18],[6,-21],[1,-17],[-20,-20],[-24,-2],[-25,9],[-17,13],[13,9],[6,3],[-12,10],[-10,11],[-9,14],[-7,17],[16,8],[16,0],[34,-8],[-4,39],[38,42],[-10,39],[-39,59],[-24,25],[-27,9],[11,-41],[-9,-24],[-20,0],[-19,28],[12,19],[-35,52],[-5,30],[20,26],[28,4],[25,-14],[11,-29],[18,12],[9,21],[12,42],[9,-21],[2,-17],[-4,-34],[-6,-18],[-1,-10],[2,-11],[6,0],[6,2],[4,-3],[6,-24],[1,-11],[5,-6],[17,-10],[13,-6],[23,0],[11,-7],[-8,-21],[2,-20],[10,-19],[15,-17],[34,87],[4,29],[-1,33],[-6,12],[-26,7],[-11,6],[-9,11],[-15,41],[-45,58],[-10,26],[3,9],[6,8],[7,10],[3,17],[-15,11],[-7,15],[3,25],[-18,-7],[-18,-4],[-40,0],[16,21],[25,6],[29,2],[25,6],[-8,4],[-5,4],[-5,4],[-11,2],[7,17],[8,9],[9,8],[9,11],[5,14],[-2,12],[-5,11],[-2,13],[4,29],[13,28],[30,51],[8,-10],[20,-28],[24,-8],[13,1],[-4,13],[-26,33]],[[6184,3429],[-11,-15],[-9,7],[-9,14],[-27,16],[-13,16],[1,23],[10,11],[15,-1],[6,-7],[7,-12],[12,-15],[9,-5],[-8,-8],[-2,-14],[19,-10]],[[6325,3623],[-6,-15],[-22,0],[-15,1],[-20,-4],[-14,1],[-15,-7],[-17,-2],[-1,-26],[11,-18],[2,-22],[-7,-24],[-31,-16],[-25,24],[-15,14],[-11,15],[-37,-43],[-16,-33],[-5,-36],[-12,-9],[-6,18],[-17,20],[2,-18],[3,-37],[-10,0],[-5,12],[-6,3],[-14,-10],[-14,-10],[-9,13],[-11,41],[5,38],[10,47],[2,27]],[[6684,4446],[2,-2],[9,-18],[-5,-40],[-3,-48],[-9,-71],[-14,-31],[-23,-33],[-21,-12],[-9,32],[-8,43],[-18,31],[-19,6],[-12,-36],[19,-5],[11,-16],[6,-22],[1,-26],[-6,-25],[-14,-6],[-16,-1],[-11,-12],[2,-14],[2,-34],[5,-35],[-12,-23],[-12,-23],[11,-17],[10,-10],[-2,-25],[-29,-11],[-26,-17],[-39,-42],[-32,2],[-1,-2]],[[6062,4389],[33,29],[36,23],[21,0],[9,18],[-13,24],[-8,26],[47,39],[58,22],[48,8],[46,-11],[49,-22],[13,-23],[0,-28],[4,-24],[17,-14],[23,-6],[128,25],[109,-29],[2,0]],[[6633,6300],[1,-3],[7,-73],[19,-75],[7,-76],[-8,-158],[-9,-34],[-42,-55],[-17,-31],[-7,-37],[-6,-223],[5,-30],[8,-17],[9,-6],[8,-10],[8,-62],[10,-48],[11,-9],[7,-10],[-5,-29],[-11,-16],[-14,-7],[-14,-5],[-23,-21],[-1,-25],[29,-29],[21,-25],[22,-30],[28,-5],[35,30],[88,104],[17,31],[23,-20],[5,-32],[9,-33],[8,-36],[-22,-37],[-50,-107],[-4,-48],[-14,-126],[-36,-109],[2,-69],[-37,-119],[-27,-58],[-11,-29],[11,-33],[11,-14]],[[9999,7454],[-1,-3],[-2,2],[1,3],[2,-2]],[[8667,7859],[-26,-14],[-36,8],[-34,21],[-22,29],[-8,38],[12,28],[25,18],[49,8],[33,13],[16,4],[24,-19],[-2,-47],[-15,-52],[-16,-35]],[[3217,517],[11,-24],[-7,-8],[-13,-5],[-10,-12],[1,-11],[9,-17],[0,-10],[-5,-10],[-12,-17],[-2,-6],[-25,-32],[-47,-42],[-14,-35],[-21,-40],[-1,-16],[-9,-24],[-34,-5],[-13,-8],[-37,4],[-52,-47],[-140,-28],[-46,-45],[-58,-14],[-61,7],[-70,-15],[-58,20],[-131,-2],[-41,-22],[-24,-48],[-22,-5],[-22,12],[-32,57],[-42,16],[-40,47],[-14,58],[24,75],[23,47],[15,16],[48,32],[41,79],[37,11],[18,42],[64,25],[141,45],[35,33],[135,16],[91,45],[22,-7],[112,20],[64,6],[43,-8],[16,-28],[21,-17],[66,-30],[21,-23],[13,-55],[13,-21],[7,8],[9,8],[3,8]]],"transform":{"scale":[0.0007249629464946397,0.000542729627260211],"translate":[124.61361738400015,33.19757721600007]}};
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
