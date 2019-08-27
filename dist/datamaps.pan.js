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
  Datamap.prototype.panTopo = {"type":"Topology","objects":{"pan":{"type":"GeometryCollection","geometries":[{"type":"MultiPolygon","properties":{"name":"Chiriquí"},"id":"PA.CH","arcs":[[[0]],[[1]],[[2]],[[3,4,5,6]]]},{"type":"Polygon","properties":{"name":"Coclé"},"id":"PA.CC","arcs":[[7,8,9,10,11]]},{"type":"Polygon","properties":{"name":"Colón"},"id":"PA.CL","arcs":[[12,13,-12,14,15]]},{"type":"Polygon","properties":{"name":"Herrera"},"id":"PA.HE","arcs":[[16,17,18,-10]]},{"type":"Polygon","properties":{"name":"Los Santos"},"id":"PA.LS","arcs":[[19,-18,20]]},{"type":"MultiPolygon","properties":{"name":"Panama"},"id":"PA.SB","arcs":[[[21]],[[22]],[[23]],[[24]],[[25]],[[26]],[[27]],[[28]],[[29]],[[30]],[[31]],[[32]],[[33]],[[34,35,36,-8,-14]]]},{"type":"MultiPolygon","properties":{"name":"Veraguas"},"id":"PA.VR","arcs":[[[37]],[[38]],[[39]],[[-11,-19,-20,40,-5,41,42,-15]]]},{"type":"Polygon","properties":{"name":"Darién"},"id":"PA.DR","arcs":[[43,44,-36,45],[46]]},{"type":"MultiPolygon","properties":{"name":"Kuna Yala"},"id":"PA.SB","arcs":[[[47]],[[48,-46,-35,-13,49]]]},{"type":"MultiPolygon","properties":{"name":"Bocas del Toro"},"id":"PA.BC","arcs":[[[50]],[[51]],[[52]],[[53,-7,54]]]},{"type":"MultiPolygon","properties":{"name":"Ngöbe Buglé"},"id":"PA.NB","arcs":[[[55]],[[-42,-4,-54,56]]]},{"type":"MultiPolygon","properties":{"name":"Emberá"},"id":"PA.EM","arcs":[[[-47]],[[-49,57,-44]]]}]}},"arcs":[[[1198,3641],[-25,-6],[5,51],[12,53],[16,47],[18,26],[20,3],[4,-27],[-2,-44],[2,-55],[-31,-33],[-19,-15]],[[1414,4152],[15,-53],[-37,25],[-23,6],[-11,-18],[0,-38],[1,-20],[11,-70],[-47,84],[-13,8],[-34,10],[-11,13],[-13,65],[16,37],[55,39],[24,-26],[35,-27],[32,-35]],[[1250,4381],[-17,-19],[-27,19],[0,-31],[48,-82],[-34,-21],[-60,-75],[-28,-17],[-20,22],[-24,53],[-21,64],[-10,56],[10,0],[39,-12],[88,151],[36,-24],[21,-44],[-1,-40]],[[1172,6614],[3,-4],[74,-69],[30,-37],[31,-21],[52,-20],[47,-14],[9,6],[24,9],[13,-4],[70,-37],[3,0],[23,-243],[-16,-348],[-13,-122],[7,-87],[16,-47],[-55,-308],[-8,-102],[28,-38],[53,2],[55,37],[28,26],[16,13],[17,-25],[18,-60],[29,-119],[26,-67],[6,-128],[35,-127],[81,-51],[158,-3],[45,-35],[28,-128],[49,-97],[89,-7],[27,65],[19,70],[26,8],[15,-81],[42,19],[38,63],[16,68],[24,141],[30,99],[76,57],[43,-26]],[[2599,4842],[5,-155],[10,-128],[5,-122],[-4,-124],[-4,-21],[-3,-9],[-10,-20],[-85,-259],[-42,-100],[-7,-29],[-7,-41],[-44,-413],[-3,-50],[-7,-48],[-8,-34],[-34,-22],[-2,-1]],[[2359,3266],[-12,39],[-24,156],[-10,41],[-11,-64],[-2,-33],[1,-41],[-18,42],[0,60],[-3,58],[-26,35],[0,30],[14,-20],[13,-9],[11,6],[9,23],[12,0],[5,-12],[4,-5],[14,-13],[-58,256],[-38,112],[-16,64],[-5,77],[-11,0],[-10,-46],[-4,-45],[6,-35],[19,-15],[-11,-35],[-25,-67],[-12,-39],[-10,0],[-31,57],[-132,127],[-15,22],[-71,41],[-24,7],[-18,27],[7,61],[28,112],[-21,-16],[-22,-35],[-19,-50],[-8,-55],[-10,-13],[-24,36],[-35,74],[-25,-45],[-55,9],[-56,41],[-28,54],[-10,0],[-3,-75],[-43,-228],[-3,8],[-8,9],[-2,2],[0,-29],[-11,0],[16,96],[0,31],[-16,-14],[2,34],[3,25],[6,17],[11,8],[0,31],[-22,-4],[-30,-42],[-23,-10],[-15,12],[-21,55],[-17,15],[0,28],[9,6],[7,16],[8,9],[-20,127],[-1,58],[10,40],[0,28],[-10,19],[-2,21],[4,22],[8,23],[2,-11],[-1,-12],[2,-7],[8,2],[-8,55],[2,42],[14,30],[27,16],[-40,3],[-21,-4],[-9,-14],[-27,-136],[-2,-23],[-33,7],[-25,27],[-13,53],[8,87],[-28,-29],[-30,-22],[-30,-4],[-29,24],[3,-27],[3,-58],[4,-27],[-27,-10],[-48,-61],[-22,-14],[-32,21],[-24,47],[-4,48],[31,28],[0,25],[-15,14],[-7,24],[-3,33],[2,42],[-18,-31],[-2,-51],[-8,-53],[-31,-34],[0,-28],[7,-23],[6,-29],[6,-31],[4,-30],[-32,-17],[-12,2],[-14,15],[-44,-20],[-69,46],[-119,115],[-62,31],[-67,0],[-67,-22],[-120,-90],[-51,-71],[-40,-101],[-25,-144],[-5,-170],[12,-173],[40,-279],[0,-26],[-21,-54],[-11,-68],[-15,-36],[-35,45],[11,94],[8,185],[-89,473],[-8,131],[-12,42],[-29,38],[-16,5],[-20,-20],[-11,2],[-9,18],[-17,58],[-9,23],[-47,68],[-16,40],[2,52],[15,29],[77,105],[75,173],[49,60],[48,36],[44,53],[38,111],[16,122],[5,145],[-10,287],[-14,126],[-21,106],[-28,97],[-53,143],[-15,55],[-9,58],[2,62],[14,35],[50,76],[16,44],[1,57],[-14,20],[-8,18],[17,53],[19,35],[175,172],[51,75],[23,92]],[[565,7074],[10,-17],[37,-90],[115,35],[97,-13],[28,-25],[18,-37],[19,-90],[63,-7],[79,-61],[141,-155]],[[4950,7193],[7,-111],[-38,-138],[-10,-68],[-5,-74],[1,-98],[45,-311],[42,-463],[10,-69],[6,-142],[-2,-37],[0,-130],[15,-102],[6,-230],[9,-65],[9,-40],[69,-196]],[[5114,4919],[-68,-108],[-76,-96],[-119,-147],[-50,-49],[-81,-26],[-15,5],[-22,19],[-9,2],[-15,-10],[-30,-34],[-13,-10],[-46,28],[-23,36],[-10,29],[8,20],[-17,-16],[0,-19],[2,-22],[-7,-28],[-31,-48],[-107,-258],[-13,-75],[5,-396],[-2,-48],[-4,-14]],[[4371,3654],[-22,16],[-39,63],[-20,24],[-10,-4],[-19,-36],[-11,-2],[-15,28],[-32,82],[-23,24],[-32,-6],[-62,-49],[-28,-5],[-41,35]],[[4017,3824],[-80,128],[-7,70],[45,192],[24,207],[7,132],[-42,163],[-65,418],[-40,170],[-35,113],[-36,79],[20,43],[53,21],[47,136],[20,119]],[[3928,5815],[40,-5],[17,66],[18,49],[5,42],[-4,46],[-2,51],[2,75],[16,88],[13,96],[18,58],[26,60],[19,22],[17,7],[31,-15],[19,-4],[25,2],[29,20],[24,29],[21,38],[12,62],[5,63],[-3,129],[-6,36],[-6,22],[-3,18],[2,40],[19,150],[12,33],[14,7],[155,-140],[22,-33],[37,-26],[42,-15],[16,-12],[23,19],[28,51],[134,308],[23,41],[18,21],[13,30],[12,52],[9,119],[17,84],[24,-106],[1,-46],[12,-142],[10,-44],[12,-25],[13,-21],[21,-22]],[[6754,9722],[0,-86],[0,-347],[-7,-26],[-14,-9],[-14,-4],[-12,-8],[-17,-26],[-14,-33],[-20,-67],[-5,-40],[-3,-64],[-3,-27],[-5,-23],[-10,-24],[-16,-23],[-32,-26],[-28,-31],[-47,-71],[-32,-62],[-7,0],[-6,42]],[[6462,8767],[12,37],[2,18],[1,24],[-2,29],[-6,28],[-9,22],[-15,13],[-8,15],[0,21],[13,43],[3,22],[-8,24],[-17,20],[-40,32],[-30,-1],[-17,-11],[-18,-34],[-11,-6],[-40,0],[-16,-8],[-28,-23],[-12,-4],[-8,8],[-4,29],[3,25],[5,21],[10,14],[21,23],[7,10],[3,12],[-2,17],[-17,53],[-6,23],[-11,36],[-15,27],[-28,26],[-41,27],[-76,-40],[-63,-62],[-44,-365],[-4,-42],[1,-30],[5,-16],[-1,-44],[-7,-64],[-22,-139],[-9,-87],[-3,-61],[7,-73],[-2,-29],[-8,-24],[-24,-25],[-29,-21],[-30,-33],[-11,-23],[-10,-15],[-11,-112],[-48,-143],[-31,-50],[-28,-24],[-88,-4],[-37,22],[-19,49],[-33,131],[-18,40],[-18,22],[-48,25],[-53,61],[-28,-14],[-25,-64],[-71,-378],[9,-71],[14,-64],[6,-48],[0,-63],[-9,-65],[-9,-46],[-50,-79],[-62,-48],[-48,9],[-72,63],[-76,-142]],[[3928,5815],[26,128],[-3,28],[-3,23],[-10,24],[-8,34],[-6,75],[5,50],[10,49],[8,63],[-9,60],[-12,46],[-36,98],[-12,19],[-19,20],[-30,23],[-29,33],[-32,50],[-12,26],[-18,49],[-9,47],[-6,39],[-3,85],[0,11],[-1,34]],[[3719,6929],[30,-3],[38,26],[16,49],[15,40],[35,111],[19,59],[17,25],[6,13],[5,29],[9,29],[15,13],[25,71],[40,45],[62,89],[23,23],[28,68],[98,120],[123,124],[167,130],[197,37],[25,21],[56,77],[16,17],[60,16],[63,41],[56,54],[49,67],[61,166],[66,140],[43,99],[4,47],[33,130],[43,41],[11,-2],[6,-38],[-4,-156],[4,-41],[9,-28],[15,-20],[17,-4],[18,21],[12,75],[3,84],[9,39],[34,-54],[-4,34],[-4,71],[-4,35],[4,-7],[8,-18],[11,25],[-21,72],[16,39],[19,-21],[32,7],[38,-40],[31,-125],[13,-47],[-7,91],[-9,63],[-1,57],[17,73],[25,55],[51,45],[28,44],[4,12],[4,30],[4,14],[5,11],[12,43],[15,24],[25,42],[11,106],[12,100],[30,28],[14,30],[-9,22],[-19,-18],[-15,-9],[-9,25],[11,17],[10,17],[9,44],[24,25],[19,37],[15,41],[31,22],[27,-9],[33,26],[44,47],[30,-20],[9,-49],[9,-40],[0,-31],[-18,-24],[0,-26],[17,-17],[0,-10],[7,-31],[8,14],[6,8],[5,12],[5,24],[11,0],[11,-19],[13,-15],[34,-24],[1,35],[12,77],[9,-37],[11,-15],[13,4],[12,20],[65,-37],[94,-26],[108,-71],[56,-48],[78,-24],[32,40],[32,23],[39,-6],[29,-6],[29,17],[32,23],[9,2]],[[4371,3654],[-10,-36],[28,-32],[12,-79],[8,-81],[15,-36],[25,-13],[65,-68],[20,-35],[12,-8]],[[4546,3266],[0,-1],[-11,-56],[-12,-34],[-7,-76],[-19,-62],[-18,-32],[-21,-12],[-54,6],[-55,-38],[-22,-50],[-51,-229],[-20,-60],[-25,-48],[-22,-34],[-8,-25],[-2,-16],[7,-25],[2,-65],[-1,-29],[3,-37],[5,-31],[22,-71],[5,-32],[2,-31],[1,-48],[-7,-54],[-18,-75],[-21,-49],[-14,-26],[-12,-12],[-22,-6],[-10,-21],[-86,-330],[-93,-221]],[[3962,1336],[-45,108],[-10,15],[-35,18],[-50,72],[-131,471],[-10,55],[-11,119],[-10,65],[-13,41],[-8,19],[-17,17],[-39,-25],[-7,93],[6,466],[9,40],[9,18],[43,27],[36,92],[48,104],[13,47],[19,81],[2,64],[-27,181],[62,57],[62,59],[27,60],[39,112],[16,15],[23,-1],[15,-10],[39,8]],[[4158,128],[-5,145],[-11,57],[-17,47],[-35,64],[-16,22],[-25,20],[-1,19],[4,43],[-1,61],[-11,96],[-44,144],[-27,199],[-12,176],[5,115]],[[4546,3266],[45,-33],[36,-149],[24,-172],[23,-116],[162,-313],[103,-226],[155,-477],[79,-350],[21,-122],[-2,-80],[-26,-157],[-13,-35],[-21,-12],[-45,-6],[-14,-6],[-120,-109],[-107,1],[-20,-29],[-21,23],[-46,26],[-16,35],[-11,0],[-15,-18],[-55,-38],[0,-28],[22,6],[18,11],[15,16],[15,21],[11,-26],[-122,-97],[-45,-79],[-6,-108],[29,-117],[-6,-38],[-42,-14],[-12,-8],[-13,-20],[-11,-23],[-4,-20],[-5,-45],[-11,-16],[-15,-10],[-17,-27],[-7,-35],[0,-28],[-1,-26],[-14,-24],[-13,-2],[-32,24],[-18,6],[-208,-63],[-12,-5]],[[7150,4391],[-16,-11],[-2,43],[15,24],[5,-24],[-2,-32]],[[6769,4353],[-7,-15],[-18,-10],[-18,20],[-21,-27],[-2,-36],[11,-24],[0,-36],[-11,-4],[-7,-20],[-1,-56],[-22,-6],[-30,146],[5,54],[11,-3],[2,31],[7,55],[-7,40],[9,66],[20,59],[13,4],[8,-5],[9,-23],[1,-13],[11,-53],[8,-89],[12,-34],[8,-6],[9,-15]],[[7205,4819],[-8,-22],[-20,9],[-13,26],[-2,29],[12,47],[12,-18],[13,-31],[6,-40]],[[6703,5005],[17,-51],[8,16],[4,38],[9,-15],[-7,-51],[13,-21],[-2,-31],[-7,-35],[-15,-22],[-33,59],[-30,55],[20,100],[23,-42]],[[7114,5149],[8,-45],[4,-47],[2,-43],[0,-32],[21,-9],[11,-54],[-3,-46],[-14,-23],[-4,-52],[23,-107],[-15,-92],[-15,-34],[0,-37],[-10,-30],[-21,3],[-8,20],[-13,-5],[-11,-5],[-12,-7],[-5,22],[-4,26],[-5,-26],[-13,-37],[-14,-46],[1,-36],[-5,-35],[17,-48],[3,-81],[10,-20],[13,-2],[0,-18],[-11,-22],[-24,33],[-18,35],[3,59],[-11,96],[-11,39],[-31,32],[-11,18],[-9,43],[8,64],[12,35],[6,72],[-7,26],[-15,39],[-4,31],[7,31],[7,26],[1,27],[-8,74],[2,39],[-17,110],[6,58],[22,2],[15,-25],[69,71],[15,-35],[5,-20],[2,-20],[6,26],[-3,46],[7,20],[16,-23],[19,-28],[11,-33]],[[6905,5186],[9,-8],[9,3],[0,-16],[-7,-10],[3,-27],[-3,-14],[-4,15],[-7,6],[-5,28],[-2,14],[-12,5],[-9,4],[-6,-13],[-8,11],[-6,15],[-5,12],[11,13],[7,7],[10,10],[10,6],[13,23],[8,20],[13,1],[-7,-24],[-9,-22],[-11,-12],[-4,-18],[5,-8],[7,-21]],[[6777,5274],[-10,-11],[-2,58],[12,30],[11,-7],[1,-20],[-1,-36],[-11,-14]],[[6836,5741],[7,-19],[8,-13],[-10,-21],[-13,-4],[-7,18],[3,31],[7,-6],[5,14]],[[5853,5807],[3,-8],[4,1],[8,-13],[2,-21],[5,-11],[-2,-21],[3,-13],[-2,-5],[-5,10],[-10,15],[-6,-2],[-6,-18],[-4,2],[0,40],[6,0],[3,21],[1,23]],[[6778,5785],[-7,-2],[-3,23],[-7,27],[9,67],[9,-11],[2,-32],[10,-6],[-6,-28],[-7,-38]],[[5925,6597],[11,-9],[5,4],[1,-13],[-4,-10],[5,-25],[8,-12],[10,-9],[1,-23],[-4,-23],[-7,-7],[-6,22],[-7,15],[-12,-7],[-11,8],[-4,25],[2,39],[12,25]],[[6014,6600],[-7,-18],[-9,1],[-6,-2],[1,12],[1,9],[5,12],[14,30],[2,-21],[-1,-23]],[[6665,7169],[-7,-1],[-2,6],[4,16],[-1,9],[-3,5],[0,14],[0,7],[3,10],[2,-4],[1,-15],[10,-13],[-7,-12],[0,-22]],[[6462,8767],[-33,-38],[-11,-30],[-11,-45],[-3,-42],[1,-27],[14,-29],[56,28],[116,89],[24,8],[23,1],[25,-4],[22,-12],[37,-36],[15,-32],[11,-31],[11,-20],[25,-4],[78,5],[15,12],[7,15],[0,17],[-4,24],[-6,24],[-3,27],[5,26],[10,18],[41,44],[14,5],[14,-4],[18,-14],[11,13],[3,23],[-1,29],[2,17],[7,8],[11,-5],[19,-17],[25,0],[16,14],[22,46],[11,15],[25,7],[29,0],[52,-17],[22,8],[15,19],[10,20],[6,10],[12,3],[9,1],[11,-13],[29,-73],[23,-26],[13,10],[6,28],[4,72],[9,12],[18,-14],[37,-56],[60,-111],[24,-36],[30,-15],[26,6],[89,50],[9,15],[15,53],[11,14],[15,-7],[21,-48],[9,-37],[7,-71],[8,-13],[12,11],[12,25],[12,15],[13,-2],[14,-34],[7,-32],[6,-25],[6,-16],[13,-11],[9,-18],[9,-36],[5,-38],[2,-32],[-2,-29],[4,-29],[10,-17],[23,-13],[49,5],[33,-15],[13,-2],[13,10],[61,71],[11,-6],[7,-30],[7,-70],[17,-110],[10,-36],[13,-22],[38,9],[44,-1],[38,-14],[14,3],[7,11],[5,20],[3,19],[6,14],[12,-11],[13,-36],[9,-88],[-8,-48],[-17,-65],[3,-23],[11,-20],[117,-68],[19,-24],[12,-20],[38,-143]],[[8506,7705],[-9,-49],[-35,-111],[-11,-61],[-8,-77],[-4,-100],[1,-75],[4,-61],[-8,-39],[-18,-27],[-43,-24],[-29,-32],[-29,-60],[-22,-91],[-14,-24],[-18,-10],[-32,6],[-29,-2],[-35,-18],[-49,-55],[-16,-42],[-7,-39],[-2,-35],[-7,-35],[-16,-29],[-16,-10],[-22,22],[-17,63],[-11,24],[-41,36],[-28,12],[-24,3],[-78,-64],[-12,-19],[-8,-23],[4,-57],[20,-238],[6,-41],[8,-98],[1,-49],[-6,-64],[-7,-44],[-10,-47],[-6,-48],[-5,-61],[-7,-167],[-10,-122],[-1,-34],[6,-16],[6,-12],[6,-30],[-2,-53],[7,-104],[22,-126],[4,-91],[28,-240],[6,-184]],[[7883,4733],[-10,14],[-39,116],[-19,27],[9,51],[-1,73],[-8,75],[-12,52],[-12,-23],[-7,-25],[-3,-30],[-2,-35],[-8,40],[-18,57],[-8,47],[-1,58],[13,139],[-12,72],[-49,161],[-20,51],[25,-3],[19,-13],[17,-5],[20,21],[-28,53],[-9,43],[2,144],[-105,70],[9,64],[4,18],[-12,4],[-5,-7],[-8,-22],[-14,22],[-13,-2],[-12,-13],[-12,-7],[-15,20],[-11,49],[-15,100],[24,47],[9,75],[-2,85],[-8,77],[-13,0],[-2,-67],[6,-85],[-1,-59],[-25,11],[-28,-75],[-53,164],[-47,-2],[-33,50],[-34,175],[-26,57],[0,28],[12,0],[0,28],[-25,18],[-16,38],[-13,46],[-17,39],[13,-69],[3,-54],[-11,-42],[-27,-32],[-26,-10],[-17,16],[-33,94],[-12,65],[-7,80],[-9,67],[-223,282],[-89,47],[-43,74],[-7,22],[-2,41],[4,23],[7,23],[3,39],[1,85],[-2,72],[-14,45],[-32,8],[0,30],[36,7],[28,36],[19,57],[11,69],[10,0],[15,-55],[17,2],[27,53],[35,30],[15,22],[8,36],[-11,-13],[-22,-5],[-14,-11],[-11,-21],[-22,-57],[-7,-11],[-14,12],[-4,26],[-5,22],[-17,-1],[-11,-22],[-20,-75],[-10,-16],[-4,-9],[-6,-19],[-9,-20],[-17,-8],[-15,-2],[-13,-8],[-8,-18],[-3,-31],[10,-28],[22,-16],[20,-36],[5,-87],[-8,-50],[-17,-70],[-24,-50],[-26,14],[-12,14],[-41,27],[-1,18],[-9,34],[-9,11],[-4,-49],[-29,-23],[-136,58],[-44,-21],[-11,0],[0,28],[-42,-31],[-96,23],[-38,-48],[-15,28],[-16,-3],[-16,-16],[-30,-13],[-21,-19],[-13,-5],[-12,-9],[-4,-19],[-1,-20],[-5,-8],[-6,-14],[-47,-71],[-4,-37],[2,-35],[-4,-27],[-18,-13],[30,-121],[6,-49],[-22,38],[-28,66],[-23,78],[-9,72],[-11,0],[3,-24],[3,-15],[5,-20],[0,-25],[-11,0],[13,-103],[-8,-89],[-25,-43],[-39,35],[-77,-33],[-25,-31],[10,-49],[0,-26],[-19,16],[-12,19],[-12,9],[-16,-18],[-5,14],[-2,6],[-4,4],[-12,4],[0,-28],[5,-14],[3,-21],[4,-21],[-29,12],[-28,-35],[-22,-58],[-15,-60],[-7,-80],[7,-245],[4,-24],[8,-12],[8,-9],[3,-13],[-1,-26],[-4,-22],[-5,-22],[-4,-32],[-7,-35],[-9,-33],[-10,-28],[-6,-12],[-22,-25],[-21,-11],[-1,-15],[2,-19],[-4,-16],[-29,-18],[-28,-34],[22,-51],[57,-32],[55,53],[51,62],[20,26],[6,20],[8,0],[1,-35],[-6,-30],[-58,-108],[-68,-148],[-32,-30],[-56,-44],[-64,-38],[-13,-39],[3,-46],[-3,-31],[-5,-15],[-9,-8],[-19,-10],[-7,-7],[-26,-58],[-12,-21],[-15,-8],[-9,-18],[-17,-77],[-9,-18],[-3,-16],[-36,-75],[-120,-190]],[[2115,354],[-1,-17],[17,15],[14,-4],[16,-9],[23,-2],[-21,-41],[-23,-106],[-14,-53],[7,-20],[6,-33],[-13,0],[-26,187],[3,35],[-7,24],[-1,12],[8,23],[6,0],[5,-3],[1,-8]],[[3409,1438],[-13,-40],[-19,-16],[-19,-22],[-13,-6],[-15,15],[-10,21],[-10,12],[-11,6],[-15,2],[-18,-9],[-8,-22],[-6,-27],[-9,-24],[-47,-59],[-24,-67],[-10,-15],[-14,0],[-16,9],[-13,11],[-4,6],[-46,-40],[-11,2],[16,53],[16,41],[18,32],[20,20],[62,23],[17,37],[11,46],[14,40],[24,28],[29,27],[52,29],[21,-18],[23,-7],[49,-1],[-21,-87]],[[2231,1809],[39,-266],[2,-48],[3,-9],[13,-50],[1,-11],[-2,-33],[1,-10],[6,-2],[14,5],[5,-3],[15,-25],[11,-10],[6,-24],[2,-67],[-10,-19],[-54,-50],[-2,-28],[-12,-120],[-4,-21],[11,-51],[30,-67],[7,-40],[3,-43],[8,-36],[11,-14],[12,23],[11,0],[20,-25],[52,11],[10,-29],[47,-213],[-31,-31],[-37,-25],[-36,0],[-59,82],[-73,12],[-32,19],[-18,36],[-41,109],[-33,47],[-71,146],[-38,196],[-14,32],[-4,18],[-13,108],[7,3],[35,0],[16,12],[-1,16],[22,93],[3,3],[5,49],[0,36],[3,33],[9,38],[13,21],[31,16],[48,85],[17,22],[1,-16],[12,0],[-4,32],[-4,51],[-4,32],[12,0],[0,-30],[11,0],[-1,20],[2,6],[5,1],[6,3]],[[4158,128],[-185,-84],[-137,-12],[-35,23],[-11,0],[-9,-24],[-9,-8],[-8,8],[-9,24],[-12,0],[-23,-55],[-19,28],[-27,109],[-9,19],[-13,19],[-14,15],[-17,6],[-16,14],[-1,29],[8,29],[9,13],[7,18],[-2,88],[2,35],[8,29],[20,35],[6,20],[6,55],[2,76],[-7,68],[-44,64],[1,77],[18,128],[-8,53],[-61,160],[-6,9],[-13,28],[-8,31],[21,29],[3,35],[2,42],[6,35],[3,48],[-16,57],[-23,52],[-17,29],[0,28],[13,0],[0,28],[-82,197],[-17,23],[-13,9],[-6,14],[2,39],[8,37],[12,25],[17,10],[21,-13],[-8,35],[-19,36],[-22,28],[-15,11],[-2,19],[31,124],[-18,-3],[-17,5],[-13,12],[-11,17],[6,3],[5,-1],[2,5],[0,18],[-40,19],[-15,59],[1,62],[12,29],[10,9],[8,20],[11,19],[19,9],[21,0],[17,7],[11,25],[2,52],[-11,0],[-38,-52],[-12,110],[4,255],[-37,-165],[-26,-55],[-19,79],[-11,0],[4,-44],[6,-32],[10,-23],[15,-16],[0,-29],[-77,0],[-16,9],[-21,39],[-21,9],[-43,30],[-8,65],[-5,60],[-31,16],[17,-17],[5,-14],[2,-27],[-23,-18],[4,-33],[30,-62],[30,-38],[5,-4],[-3,-37],[-5,-30],[-2,-24],[31,-143],[-16,-108],[-38,-88],[-37,-63],[-7,33],[-1,20],[3,14],[5,17],[0,31],[-23,3],[-24,-3],[0,-31],[18,-12],[10,-25],[19,-76],[-22,-20],[-10,3],[-15,17],[12,-49],[12,-35],[11,0],[23,30],[24,24],[8,-47],[-8,-179],[4,-48],[0,-28],[-4,-36],[-6,-20],[-21,-41],[-8,-26],[-12,0],[-15,26],[-54,70],[-12,5],[-10,52],[-21,19],[-39,-1],[-140,95],[-46,-10],[-7,47],[-12,42],[-13,32],[-14,20],[-39,-24],[-50,10],[-38,40],[-2,61],[14,11],[32,40],[19,43],[-67,47],[-18,-13],[-2,-72],[-39,68],[-20,16],[0,29],[11,36],[-10,34],[-15,38],[-9,45],[3,68],[8,44],[24,73],[0,28],[-12,19],[-12,8],[-12,-6],[-11,-21],[-11,0],[-12,28],[0,31],[15,31],[0,30],[-14,20],[-24,1],[5,62],[1,69],[10,39],[30,-27],[-5,37],[-6,25],[-24,51],[8,30],[-3,61],[7,50],[-21,-21],[-10,6],[-3,-4],[0,-52],[8,-57],[3,-31],[-6,-13],[-12,5],[-9,14],[-6,22],[-1,31],[-6,45],[-30,100]],[[2599,4842],[-7,206],[1,60],[6,69],[39,229],[15,164],[3,170],[43,-54],[53,-30],[19,-20],[10,-15],[8,-40],[80,-14],[44,21],[15,-9],[78,-147],[29,-44],[68,-44],[38,-36],[19,-12],[14,0],[47,25],[-27,64],[-14,64],[-6,38],[-8,35],[-13,34],[-15,53],[-10,87],[-7,152],[6,250],[-19,305],[11,104],[0,22],[0,14]],[[3119,6543],[5,1],[65,20],[75,21],[73,29],[13,-16],[16,8],[15,26],[14,38],[133,106],[129,130],[29,25],[33,-2]],[[9101,6464],[-16,-3],[-36,20],[-41,-13],[-38,-46],[-15,-53],[-20,-38],[-28,-12],[-26,-18],[-24,-70],[-19,-87],[-51,-174],[-34,-46],[-19,-82],[5,-85],[12,-71],[21,-64],[24,-51],[4,-77],[-11,-48],[0,-10],[0,-7],[4,-16],[22,-51],[16,-15],[19,-13],[5,-27],[-5,-20],[0,-22],[42,-108],[8,-40],[3,-45],[-6,-44],[-6,-29],[-2,-32],[0,-34],[29,-109],[5,-56],[6,-54],[11,-34],[16,-36],[10,-28],[13,-45],[2,-14],[0,-23],[11,-37],[17,-20],[10,-3],[9,-11],[1,-30],[-2,-33],[7,-58],[18,-29],[50,-30],[48,-55],[64,-127],[31,-176],[-6,-67],[16,-63],[35,-26],[15,-36],[33,-106],[24,-13],[31,45],[36,14],[11,-8],[10,-5],[40,16],[18,18],[12,37],[11,37],[23,36],[35,23],[36,14],[193,127],[1,1]],[[9819,3969],[16,-57],[49,-228],[36,-322],[3,-99],[12,-60],[16,-38],[18,-32],[17,-42],[13,-65],[-10,-17],[-63,2],[-51,-26],[-57,-46],[-52,-66],[-36,-87],[-43,-236],[-50,-153],[-6,-51],[23,-121],[35,-80],[10,-76],[-49,-109],[-239,-358],[-77,-188],[-42,-83],[-39,-9],[-18,47],[-21,206],[-13,54],[-47,155],[-4,8],[-14,8],[-5,11],[0,15],[7,37],[0,11],[-16,45],[-85,175],[-17,23],[-41,-54],[-11,-152],[8,-175],[15,-128],[39,-180],[5,-89],[-15,-106],[-26,-76],[-32,-47],[-38,-14],[-40,21],[-59,-458],[-70,-538],[-1,1],[-38,26],[-49,108],[-72,219],[-27,48],[-14,35],[-6,47],[4,43],[7,43],[3,42],[-8,42],[-10,18],[-4,-8],[-4,-16],[-5,-9],[-13,13],[-4,26],[3,22],[8,-2],[-20,75],[-11,15],[-16,-34],[-11,0],[-41,113],[-27,59],[-20,25],[-5,18],[-5,39],[-8,40],[-16,18],[-11,18],[-9,42],[-11,81],[-10,0],[-7,-62],[-4,41],[-2,144],[-8,74],[-18,17],[-17,-33],[-3,-73],[-9,54],[3,38],[6,36],[0,46],[-6,43],[-8,24],[-20,43],[-36,113],[-25,45],[-33,11],[4,45],[-7,34],[-14,24],[-17,12],[16,79],[8,57],[-1,53],[-12,70],[-51,188],[-8,47],[-16,132],[-37,111],[-42,99],[-31,96],[-22,127],[-14,132],[-1,50],[4,47],[-3,41],[-31,133],[-4,52],[9,77],[20,76],[20,28],[20,-134],[24,-25],[28,9],[19,40],[49,-61],[65,82],[58,152],[25,150],[-3,84],[-9,52],[-14,37],[-20,39],[-50,140],[-20,30],[0,30],[47,-12],[14,6],[22,32],[0,31],[-10,11],[-5,12],[-4,15],[-6,18],[14,13],[4,2],[7,41],[14,-23],[19,-44],[12,-17],[15,-10],[13,1],[25,9],[2,16],[21,70],[5,11],[-2,113],[2,43],[5,8],[31,77],[7,38],[3,36],[0,82],[8,22],[16,19],[16,5],[7,-18],[8,-150],[4,-34],[17,-34],[28,-37],[30,-30],[24,-12],[20,-26],[14,-63],[30,-197],[17,-54],[21,-39],[26,-15],[8,8],[18,13],[18,-2],[13,-59],[12,-22],[15,-16],[15,-7],[23,0],[0,26],[-26,14],[-24,33],[-19,46],[-11,50],[85,-39],[45,-40],[29,-79],[41,-53],[9,-29],[1,-62],[6,-43],[10,-30],[17,-22],[19,26],[19,-25],[14,-57],[6,-70],[12,-46],[27,-16],[27,18],[16,58],[-48,-1],[-62,182],[-30,-12],[-87,266],[-17,31],[-25,34],[-151,66],[-37,35],[-29,59],[-19,79],[-8,94],[-36,180],[-11,111],[25,61],[-18,29],[-20,41],[-19,49],[-14,53],[-8,68],[5,39],[10,27],[5,35],[-2,52],[-10,13],[-15,8],[-19,40],[-8,46],[-2,39],[-5,32],[-20,23],[7,-38],[2,-104],[8,-39],[23,-36],[8,-4],[1,-12],[-1,-136],[3,-36],[23,-134],[2,-44],[-7,-39],[-11,0],[-32,131],[-21,64],[-16,33],[-27,0],[-22,-35],[-16,-64],[-6,-87],[-10,-63],[-25,-49],[-32,-31],[-31,-12],[-14,14],[-7,33],[0,37],[3,29],[10,28],[49,59],[7,-13],[4,-7],[12,-11],[2,136],[-8,125],[-28,223],[-13,0],[-12,-59],[8,-37],[16,-33],[12,-42],[-2,-73],[-13,-59],[-9,-49],[13,-44],[0,-31],[-6,-9],[-6,-7],[-13,-10],[-7,33],[-10,19],[-10,14],[-6,16],[-6,36],[3,5],[7,-2],[6,20],[18,79],[-2,39],[-26,23],[8,-52],[-4,-24],[-9,-14],[-8,-23],[-23,-112],[-27,-10],[-15,45],[-16,133],[-13,-30],[-1,-53],[-24,-83],[-31,-71],[-24,-19],[-16,70],[-17,244],[-13,83],[6,28],[4,29],[-10,0],[0,-28],[-13,0],[0,84],[-10,0],[-7,-101],[31,-205],[16,-198],[32,-63],[8,-68],[-47,-241],[-6,36],[-13,18],[-14,13],[-3,4]],[[8506,7705],[47,0],[124,-217],[51,-98],[94,-230],[17,-70],[11,-53],[11,-45],[17,-29],[29,-32],[46,-79],[26,-31],[20,-37],[68,-149],[19,-56],[11,-59],[4,-56]],[[8195,3213],[-53,48],[-36,-55],[-30,-70],[-29,-6],[-28,-19],[-8,-60],[8,-38],[-5,-83],[2,-95],[7,-54],[10,-49],[18,-24],[12,-10],[32,-166],[26,-195],[42,-170],[81,-219],[30,-52],[70,50],[29,-39],[26,-47],[27,-18],[15,-30],[15,-179],[40,-48],[18,72],[32,43],[25,-49],[23,-64],[38,46],[32,71],[8,136],[-19,361],[7,39],[6,55],[-8,71],[-14,63],[-16,14],[-17,25],[-8,131],[-52,395],[-32,80],[-41,-80],[-41,-56],[-14,226],[-17,23],[-17,35],[-11,122],[-16,53],[-16,44],[-52,174],[-27,48],[-28,-53],[-43,-47],[-4,-79],[25,-32],[5,-35],[-3,-39],[10,-48],[7,-48],[-41,-69]],[[7189,9757],[-9,-17],[-8,3],[-1,5],[14,14],[4,-5]],[[9479,5496],[0,2],[-45,131],[-21,15],[-64,68],[-22,67],[-16,138],[-18,62],[-52,121],[-28,92],[-46,99],[-43,75],[-13,38],[-9,37],[-1,23]],[[6754,9722],[45,9],[60,24],[72,13],[22,-33],[0,-46],[-29,-39],[-21,10],[-17,-31],[-18,-3],[-52,-15],[-28,-14],[-19,-75],[5,-96],[8,-134],[30,-23],[28,15],[17,-20],[22,10],[22,7],[18,8],[19,-10],[23,0],[30,-30],[18,-14],[15,-30],[13,-25],[8,-32],[13,6],[22,3],[13,-2],[17,-10],[21,6],[9,39],[19,9],[31,-18],[48,23],[14,38],[29,-14],[20,8],[19,17],[22,27],[18,-54],[27,-32],[22,6],[57,-38],[37,10],[23,-41],[27,-10],[25,24],[19,40],[29,25],[25,-15],[33,-53],[24,-23],[56,0],[28,-47],[18,17],[25,-18],[18,-43],[19,-40],[47,-51],[17,-25],[24,-19],[44,-21],[36,-47],[25,-47],[26,-29],[16,-18],[17,-4],[22,-15],[22,-32],[26,-36],[31,-43],[27,-12],[27,10],[16,-14],[21,-29],[22,-8],[31,-46],[16,-52],[44,-24],[54,-19],[33,-29],[21,-41],[6,-53],[37,-94],[22,-8],[30,-34],[56,-156],[29,-108],[23,-72],[25,-91],[58,-94],[-8,57],[-8,50],[-19,96],[-2,63],[30,-35],[22,-94],[14,-46],[46,-76],[6,-94],[17,-45],[21,-31],[26,-53],[6,-48],[14,-45],[19,-36],[5,-38],[-16,-73],[33,-92],[24,-129],[17,-45],[16,33],[7,-8],[2,-58],[33,-48],[35,-76],[38,-106],[32,-36],[-8,34],[-12,25],[-9,28],[-4,41],[8,19],[19,-38],[18,-54],[6,-27],[51,-94],[-7,-73],[32,-64],[9,71],[17,-8],[15,-71],[-6,-68],[-3,-62],[-8,-48],[22,-47],[53,-88],[40,-49],[56,-23],[53,10],[31,48],[7,-20],[8,-16],[10,-13],[11,-7],[-2,-57],[-18,-31],[-28,-6],[-27,-15],[-28,-42],[-1,-31],[8,-42],[2,-74],[-21,-103],[-48,-123]],[[1755,7970],[-13,-19],[-10,7],[-15,26],[-14,21],[-9,33],[1,32],[13,45],[-9,21],[1,18],[11,-11],[7,-26],[9,-14],[12,-2],[6,-35],[4,-28],[11,-12],[13,-14],[-3,-26],[-15,-16]],[[1478,8830],[14,-8],[14,4],[16,18],[17,-19],[40,-91],[43,-47],[21,-36],[18,-58],[-33,11],[-34,-33],[-27,-62],[-15,-94],[-8,7],[-18,47],[1,3],[3,3],[3,18],[0,95],[-6,37],[-17,24],[0,26],[23,-26],[-15,87],[-26,30],[-31,14],[-32,39],[0,25],[9,20],[9,8],[8,-5],[8,-23],[15,-14]],[[1378,8798],[-8,-34],[-23,96],[-36,89],[-81,154],[46,83],[27,27],[33,2],[47,-167],[12,-105],[-25,-68],[0,-31],[8,-20],[2,-11],[-2,-15]],[[1777,7182],[-3,-19],[-13,-93],[-32,-46],[-44,-24],[-70,0],[-51,-7],[-32,-39],[-22,-85],[-10,-93],[-16,-15],[-13,46],[-9,108],[-7,39],[-22,31],[-3,77],[19,31],[6,70],[-9,54],[-41,62],[-61,31],[-19,39],[-13,46],[-35,15],[-35,31],[-3,62],[10,62],[25,47],[22,69],[16,54],[-12,16],[-35,31],[-13,31],[9,62],[-6,46],[-16,8],[-25,-62],[-23,-108],[-3,-101],[-44,-93],[-23,-54],[-57,-54],[-22,-54],[19,-47],[35,-31],[63,-54],[39,-77],[22,-101],[6,-85],[-12,-62],[-16,-131],[-13,-124],[-13,-77]],[[565,7074],[2,5],[-7,39],[-44,178],[-23,37],[-77,63],[-78,139],[-38,41],[-10,14],[-8,25],[-4,33],[-6,31],[-12,21],[-16,0],[-51,-51],[0,45],[-4,676],[-2,495],[-2,341],[4,79],[15,58],[31,27],[91,30],[25,35],[3,33],[-8,12],[-11,8],[-7,24],[-12,113],[-21,88],[4,38],[19,66],[31,64],[32,8],[98,-94],[71,-144],[16,-15],[14,15],[17,-47],[22,-99],[18,-49],[17,-19],[29,-22],[32,-13],[22,9],[11,53],[8,158],[12,44],[25,-10],[26,-33],[14,2],[-19,155],[20,-29],[164,-310],[100,-243],[64,-83],[44,72],[-4,-70],[-7,-56],[-47,-193],[-4,-47],[5,-57],[15,-38],[19,-30],[14,-33],[-1,-44],[-23,-44],[-43,8],[-4,-46],[-8,-32],[2,-21],[8,-8],[10,4],[16,-27],[15,-48],[11,-56],[4,-52],[9,-39],[61,-90],[11,0],[13,48],[21,6],[10,15],[-21,75],[23,-16],[9,-42],[4,-49],[12,-37],[18,-12],[13,18],[6,44],[-3,65],[12,0],[2,-54],[12,-27],[13,-4],[7,15],[1,51],[3,36],[7,11],[13,-28],[2,13],[0,11],[2,6],[8,-1],[3,-38],[5,-29],[6,-24],[9,-22],[11,0],[0,28],[12,0],[-4,-62],[3,-113],[-11,-50],[-51,76],[-27,25],[-44,9],[-19,-32],[-5,-73],[5,-77],[13,-46],[0,-26],[-10,10],[-25,16],[9,-59],[41,-51],[9,-44],[-12,-269],[-7,4],[-5,5],[-5,7],[-7,12],[29,-68],[42,-46],[41,-10],[28,40],[61,-48],[22,-31],[0,-34],[25,-92],[8,-23],[4,-14],[3,-28],[6,-14],[7,-5],[19,5],[32,-4],[81,60],[23,5]],[[2526,7838],[9,-6],[4,8],[8,-1],[10,-12],[9,-16],[6,-16],[3,-15],[4,-11],[-1,-12],[-7,0],[-9,10],[-14,5],[-17,5],[-8,0],[-8,-5],[-2,27],[-4,19],[-3,16],[3,13],[12,2],[5,-11]],[[1777,7182],[15,4],[21,-21],[18,-30],[27,-14],[25,14],[25,36],[15,47],[-6,46],[20,19],[14,1],[24,-20],[4,-16],[16,-34],[18,-21],[9,27],[17,11],[100,-110],[30,35],[8,71],[-6,165],[-115,156],[-59,215],[-16,36],[-22,24],[-31,54],[-27,59],[-7,37],[26,0],[44,-27],[40,-9],[18,51],[-55,62],[-27,46],[12,46],[35,1],[29,-53],[40,-117],[40,-71],[7,-18],[-3,-35],[-14,-11],[-17,6],[-13,14],[0,-28],[14,-40],[14,-35],[8,-61],[13,-12],[22,0],[40,-11],[25,-5],[43,-111],[26,-20],[25,-136],[9,-20],[24,-41],[101,-352],[69,-176],[33,-53],[10,-38],[19,-47],[20,-41],[14,-17],[15,-8],[31,-24],[21,0],[30,23],[88,-42],[21,15],[47,0],[40,-62],[91,-13],[65,30],[85,10]],[[9479,5496],[-18,-48],[-14,-122],[-1,-95],[16,-24],[51,12],[29,-23],[17,-36],[28,-115],[25,-144],[14,-283],[15,-147],[19,-71],[21,-20],[23,-3],[22,-22],[12,-43],[37,-187],[44,-156]]],"transform":{"scale":[0.0005890565457545796,0.00024238196259625388],"translate":[-83.05324621699998,7.20571523600016]}};
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
