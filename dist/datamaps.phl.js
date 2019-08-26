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
  Datamap.prototype.phlTopo = {"type":"Topology","objects":{"phl":{"type":"GeometryCollection","geometries":[{"type":"MultiPolygon","properties":{"name":null},"id":"-99","arcs":[[[0]],[[1]],[[2]],[[3]],[[4]],[[5]],[[6]],[[7]],[[8]],[[9]],[[10]],[[11]],[[12]],[[13]],[[14]],[[15]],[[16]],[[17]],[[18]],[[19]],[[20]],[[21]],[[22]],[[23]],[[24]],[[25]],[[26]],[[27]],[[28]],[[29]],[[30]],[[31]],[[32]],[[33]],[[34]],[[35]],[[36]],[[37]],[[38]],[[39]],[[40]],[[41]],[[42]],[[43]],[[44]],[[45]],[[46]],[[47]],[[48]],[[49]],[[50]],[[51]],[[52]],[[53]],[[54]],[[55]],[[56]],[[57]],[[58]],[[59]],[[60]],[[61]],[[62]],[[63]],[[64]],[[65]],[[66]],[[67]],[[68]],[[69]],[[70]],[[71]],[[72]],[[73]],[[74]],[[75]],[[76]],[[77]],[[78]],[[79]],[[80]],[[81]],[[82]],[[83]],[[84]],[[85]],[[86]],[[87]],[[88]],[[89]],[[90]],[[91]],[[92]],[[93]],[[94]],[[95]],[[96]],[[97]],[[98]],[[99]],[[100]],[[101]],[[102]],[[103]]]},{"type":"MultiPolygon","properties":{"name":"Tawi-Tawi"},"id":"PH.TT","arcs":[[[104]],[[105]],[[106]],[[107]],[[108]]]},{"type":"MultiPolygon","properties":{"name":"Bohol"},"id":"PH.BO","arcs":[[[109]],[[110]],[[111]]]},{"type":"MultiPolygon","properties":{"name":"Cebu"},"id":"PH.CB","arcs":[[[112,113,114]],[[115]]]},{"type":"Polygon","properties":{"name":"Negros Oriental"},"id":"PH.NR","arcs":[[116,117]]},{"type":"Polygon","properties":{"name":"Siquijor"},"id":"PH.SQ","arcs":[[118]]},{"type":"Polygon","properties":{"name":"Negros Occidental"},"id":"PH.ND","arcs":[[-118,119,120,121]]},{"type":"MultiPolygon","properties":{"name":"Basilan"},"id":"PH.BS","arcs":[[[122]],[[123,124]]]},{"type":"Polygon","properties":{"name":"Zamboanga del Norte"},"id":"PH.ZN","arcs":[[125,126,127,128,129]]},{"type":"MultiPolygon","properties":{"name":"Zamboanga Sibugay"},"id":"PH.ZS","arcs":[[[130]],[[131,132,-128,133]]]},{"type":"Polygon","properties":{"name":"Zamboanga del Sur"},"id":"PH.ZS","arcs":[[134,135,136,-134,-127,137]]},{"type":"Polygon","properties":{"name":"Misamis Occidental"},"id":"PH.MD","arcs":[[-138,-126,138]]},{"type":"MultiPolygon","properties":{"name":"Sulu"},"id":"PH.SU","arcs":[[[139]],[[140]],[[141]],[[142]],[[143]],[[144]],[[145]]]},{"type":"Polygon","properties":{"name":"Aklan"},"id":"PH.AK","arcs":[[146,147,148]]},{"type":"MultiPolygon","properties":{"name":"Antique"},"id":"PH.AQ","arcs":[[[149,150,151,-148]],[[152]],[[153]]]},{"type":"Polygon","properties":{"name":"Capiz"},"id":"PH.CP","arcs":[[154,-150,-147,155]]},{"type":"Polygon","properties":{"name":"Iloilo"},"id":"PH.II","arcs":[[156,157,-151,-155,158]]},{"type":"Polygon","properties":{"name":"Guimaras"},"id":"PH.GU","arcs":[[159]]},{"type":"MultiPolygon","properties":{"name":"Palawan"},"id":"PH.PL","arcs":[[[160]],[[161]],[[162]],[[163]],[[164]],[[165]],[[166]],[[167]],[[168]],[[169]],[[170]],[[171]],[[172]],[[173,174]],[[175]],[[176]],[[177]],[[178]],[[179]],[[180]],[[181]],[[182]],[[183]],[[184]],[[185]],[[186]],[[187]],[[188]],[[189]],[[190,191]],[[192]],[[193]],[[194]],[[195]],[[196]],[[197]],[[198]],[[199]]]},{"type":"MultiPolygon","properties":{"name":"Romblon"},"id":"PH.RO","arcs":[[[200]],[[201]],[[202]],[[203]]]},{"type":"MultiPolygon","properties":{"name":"Albay"},"id":"PH.AL","arcs":[[[204]],[[205]],[[206]],[[207]],[[208,209,210,211]]]},{"type":"Polygon","properties":{"name":"Camarines Norte"},"id":"PH.CN","arcs":[[212,213,214]]},{"type":"MultiPolygon","properties":{"name":"Camarines Sur"},"id":"PH.CS","arcs":[[[215]],[[-211,216,217,-213,218],[219]]]},{"type":"Polygon","properties":{"name":"Catanduanes"},"id":"PH.CT","arcs":[[220]]},{"type":"MultiPolygon","properties":{"name":"Masbate"},"id":"PH.MB","arcs":[[[221]],[[222]],[[223]]]},{"type":"Polygon","properties":{"name":"Sorsogon"},"id":"PH.SR","arcs":[[-209,224]]},{"type":"Polygon","properties":{"name":"Abra"},"id":"PH.AB","arcs":[[225,226,227,228,229]]},{"type":"MultiPolygon","properties":{"name":"Batanes"},"id":"PH.BN","arcs":[[[230]],[[231]],[[232]],[[233]],[[234]]]},{"type":"MultiPolygon","properties":{"name":"Cagayan"},"id":"PH.CG","arcs":[[[235,236,237,238,239]],[[240]],[[241]],[[242]],[[243]],[[244]]]},{"type":"Polygon","properties":{"name":"Apayao"},"id":"PH.AP","arcs":[[245,-230,246,-238]]},{"type":"Polygon","properties":{"name":"Ilocos Norte"},"id":"PH.IN","arcs":[[-239,-247,-229,247,248]]},{"type":"Polygon","properties":{"name":"Ilocos Sur"},"id":"PH.IS","arcs":[[-228,249,250,251,252,-248]]},{"type":"Polygon","properties":{"name":"Aurora"},"id":"PH.AU","arcs":[[253,254,255,256,257,258,259]]},{"type":"MultiPolygon","properties":{"name":"Isabela"},"id":"PH.IB","arcs":[[[260,261,262]],[[263,-259,264,265,266,267,268,-236]]]},{"type":"Polygon","properties":{"name":"Ifugao"},"id":"PH.IF","arcs":[[-267,269,270,271,272]]},{"type":"Polygon","properties":{"name":"Mountain Province"},"id":"PH.MT","arcs":[[-268,-273,273,-250,-227,274]]},{"type":"Polygon","properties":{"name":"Nueva Vizcaya"},"id":"PH.NV","arcs":[[-262,275,-257,276,277,278,-271,279]]},{"type":"Polygon","properties":{"name":"Quirino"},"id":"PH.QR","arcs":[[280,-265,-258,-276,-261]]},{"type":"Polygon","properties":{"name":"Bataan"},"id":"PH.BA","arcs":[[281,282,283,284]]},{"type":"Polygon","properties":{"name":"Tarlac"},"id":"PH.TR","arcs":[[285,286,287,288]]},{"type":"Polygon","properties":{"name":"Nueva Ecija"},"id":"PH.NE","arcs":[[-256,289,290,-286,291,-277]]},{"type":"Polygon","properties":{"name":"Pampanga"},"id":"PH.PM","arcs":[[-291,292,293,-285,294,-287],[295]]},{"type":"Polygon","properties":{"name":"Benguet"},"id":"PH.BG","arcs":[[-272,-279,296,297,-251,-274],[298]]},{"type":"Polygon","properties":{"name":"Zambales"},"id":"PH.ZM","arcs":[[-288,-295,-284,299,300,301]]},{"type":"Polygon","properties":{"name":"La Union"},"id":"PH.LU","arcs":[[-298,302,303,-252]]},{"type":"MultiPolygon","properties":{"name":"Pangasinan"},"id":"PH.PN","arcs":[[[304]],[[305,306,-303,-297,-278,-292,-289,-302,307]]]},{"type":"Polygon","properties":{"name":"Cavite"},"id":"PH.CV","arcs":[[308,309,310,311,312]]},{"type":"MultiPolygon","properties":{"name":"Batangas"},"id":"PH.BT","arcs":[[[313]],[[314]],[[315,316,317,-311]]]},{"type":"Polygon","properties":{"name":"Bulacan"},"id":"PH.BU","arcs":[[-255,318,319,320,321,322,323,324,325,-293,-290]]},{"type":"Polygon","properties":{"name":"Laguna"},"id":"PH.LG","arcs":[[-316,-310,326,327,328,329]]},{"type":"Polygon","properties":{"name":"Rizal"},"id":"PH.RI","arcs":[[330,-329,331,332,333,-320]]},{"type":"Polygon","properties":{"name":"Marinduque"},"id":"PH.MQ","arcs":[[334]]},{"type":"MultiPolygon","properties":{"name":"Mindoro Occidental"},"id":"PH.MC","arcs":[[[335]],[[336,337]],[[338]]]},{"type":"Polygon","properties":{"name":"Mindoro Oriental"},"id":"PH.MR","arcs":[[-337,339]]},{"type":"MultiPolygon","properties":{"name":"Quezon"},"id":"PH.QZ","arcs":[[[340]],[[341]],[[342]],[[343]],[[344,-214,-218,345,346,347,-317,-330,-331,-319,-254]]]},{"type":"Polygon","properties":{"name":"Lanao del Norte"},"id":"PH.LN","arcs":[[348,-136,349,350,351]]},{"type":"Polygon","properties":{"name":"Lanao del Sur"},"id":"PH.LS","arcs":[[352,353,354,355,-352,356]]},{"type":"Polygon","properties":{"name":"Maguindanao"},"id":"PH.MG","arcs":[[357,358,359,360,-355,361]]},{"type":"Polygon","properties":{"name":"Cotabato"},"id":"PH.NC","arcs":[[362,363,364,365,-362,-354]]},{"type":"Polygon","properties":{"name":"Sultan Kudarat"},"id":"PH.SK","arcs":[[-366,366,367,368,369,-358]]},{"type":"Polygon","properties":{"name":"Biliran"},"id":"PH.BI","arcs":[[370]]},{"type":"MultiPolygon","properties":{"name":"Eastern Samar"},"id":"PH.ES","arcs":[[[371]],[[372,373,374]]]},{"type":"MultiPolygon","properties":{"name":"Leyte"},"id":"PH.LE","arcs":[[[375]],[[376]],[[377,378,379,380,381,382]]]},{"type":"MultiPolygon","properties":{"name":"Samar"},"id":"PH.SM","arcs":[[[383]],[[384]],[[-374,385,386]]]},{"type":"MultiPolygon","properties":{"name":"Southern Leyte"},"id":"PH.SL","arcs":[[[387]],[[-380,388]]]},{"type":"MultiPolygon","properties":{"name":"Northern Samar"},"id":"PH.NS","arcs":[[[389]],[[-375,-387,390]]]},{"type":"MultiPolygon","properties":{"name":"Agusan del Norte"},"id":"PH.AN","arcs":[[[391,392,393,394]],[[395,396,397,398,399]]]},{"type":"Polygon","properties":{"name":"Agusan del Sur"},"id":"PH.AS","arcs":[[400,401,402,403,-392,404,-400,405]]},{"type":"Polygon","properties":{"name":"Bukidnon"},"id":"PH.BK","arcs":[[-404,406,407,-363,-353,408,409,410]]},{"type":"Polygon","properties":{"name":"Camiguin"},"id":"PH.CM","arcs":[[411]]},{"type":"MultiPolygon","properties":{"name":"Davao del Norte"},"id":"PH.DV","arcs":[[[412]],[[413,414,-407,-403,415]]]},{"type":"Polygon","properties":{"name":"Compostela Valley"},"id":"PH.CL","arcs":[[416,417,-416,-402]]},{"type":"MultiPolygon","properties":{"name":"Surigao del Norte"},"id":"PH.DI","arcs":[[[418]],[[419,-398,420]],[[421]],[[422]]]},{"type":"Polygon","properties":{"name":"Surigao del Sur"},"id":"PH.SS","arcs":[[423,-406,-399,-420,424]]},{"type":"MultiPolygon","properties":{"name":"Misamis Oriental"},"id":"PH.MN","arcs":[[[425,426,427]],[[-411,428,429,-393]]]},{"type":"MultiPolygon","properties":{"name":"Davao del Sur"},"id":"PH.DS","arcs":[[[430]],[[431,432,-367,-365,433,434]]]},{"type":"Polygon","properties":{"name":"Davao Oriental"},"id":"PH.DO","arcs":[[435,-417,-401,-424]]},{"type":"MultiPolygon","properties":{"name":"Sarangani"},"id":"PH.SG","arcs":[[[436,437,-369,438]],[[439,440,441,-432]]]},{"type":"Polygon","properties":{"name":"South Cotabato"},"id":"PH.SC","arcs":[[-433,-442,442,-439,-368]]},{"type":"Polygon","properties":{"name":"Kalinga"},"id":"PH.AP","arcs":[[-269,-275,-226,-246,-237]]},{"type":"Polygon","properties":{"name":"Zamboanga"},"id":"PH.","arcs":[[-129,-133,443]]},{"type":"MultiPolygon","properties":{"name":"Isabela"},"id":"PH.","arcs":[[[444,-124]],[[445]]]},{"type":"Polygon","properties":{"name":"Cebu"},"id":"PH.","arcs":[[446,447,-114]]},{"type":"Polygon","properties":{"name":"Mandaue"},"id":"PH.","arcs":[[448,-447,-113]]},{"type":"MultiPolygon","properties":{"name":"Lapu-Lapu"},"id":"PH.","arcs":[[[449]],[[450]]]},{"type":"Polygon","properties":{"name":"Bacolod"},"id":"PH.","arcs":[[451,-121]]},{"type":"Polygon","properties":{"name":"Iloilo"},"id":"PH.","arcs":[[452,-157]]},{"type":"Polygon","properties":{"name":"Cotabato"},"id":"PH.","arcs":[[453,-360]]},{"type":"Polygon","properties":{"name":"Davao"},"id":"PH.","arcs":[[454,-434,-364,-408,-415]]},{"type":"Polygon","properties":{"name":"General Santos"},"id":"PH.","arcs":[[455,-437,-443,-441]]},{"type":"Polygon","properties":{"name":"Iligan"},"id":"PH.","arcs":[[456,-409,-357,-351,457,-426]]},{"type":"Polygon","properties":{"name":"Cagayan de Oro"},"id":"PH.","arcs":[[-410,-457,-428,458,-429]]},{"type":"Polygon","properties":{"name":"Butuan"},"id":"PH.","arcs":[[-405,-395,459,-396]]},{"type":"Polygon","properties":{"name":"Puerto Princesa"},"id":"PH.","arcs":[[460,-174,461,-191]]},{"type":"Polygon","properties":{"name":"Ormoc"},"id":"PH.","arcs":[[462,-382]]},{"type":"Polygon","properties":{"name":"Tacloban"},"id":"PH.","arcs":[[-378,463]]},{"type":"Polygon","properties":{"name":"Naga"},"id":"PH.","arcs":[[-220]]},{"type":"Polygon","properties":{"name":"Santiago"},"id":"PH.","arcs":[[-266,-281,-263,-280,-270]]},{"type":"Polygon","properties":{"name":"Angeles"},"id":"PH.","arcs":[[-296]]},{"type":"Polygon","properties":{"name":"Baguio"},"id":"PH.","arcs":[[-299]]},{"type":"Polygon","properties":{"name":"Olongapo"},"id":"PH.","arcs":[[-283,464,-300]]},{"type":"Polygon","properties":{"name":"Dagupan"},"id":"PH.","arcs":[[465,-306]]},{"type":"Polygon","properties":{"name":"Mandaluyong City"},"id":"PH.","arcs":[[466,467,468,469,470]]},{"type":"Polygon","properties":{"name":"Manila"},"id":"PH.","arcs":[[471,472,-470,473,474,475,476,477]]},{"type":"Polygon","properties":{"name":"Navotas"},"id":"PH.","arcs":[[478,479,-477,480,-325]]},{"type":"MultiPolygon","properties":{"name":"Caloocan"},"id":"PH.","arcs":[[[-478,-480,481,482,483]],[[484,485,-322]]]},{"type":"Polygon","properties":{"name":"Malabon"},"id":"PH.","arcs":[[486,-482,-479,-324]]},{"type":"Polygon","properties":{"name":"Valenzuela"},"id":"PH.","arcs":[[487,-483,-487,-323,-486]]},{"type":"Polygon","properties":{"name":"Quezon City"},"id":"PH.","arcs":[[-334,488,489,-467,490,-472,-484,-488,-485,-321]]},{"type":"Polygon","properties":{"name":"Marikina"},"id":"PH.","arcs":[[491,-489,-333]]},{"type":"Polygon","properties":{"name":"San Juan"},"id":"PH.","arcs":[[-471,-473,-491]]},{"type":"Polygon","properties":{"name":"Pasig"},"id":"PH.","arcs":[[-332,492,493,494,-468,-490,-492]]},{"type":"Polygon","properties":{"name":"Makati"},"id":"PH.","arcs":[[-495,495,496,497,-474,-469]]},{"type":"Polygon","properties":{"name":"Pasay"},"id":"PH.","arcs":[[498,499,500,-475,-498]]},{"type":"Polygon","properties":{"name":"Paranaque"},"id":"PH.","arcs":[[501,502,503,504,-500]]},{"type":"Polygon","properties":{"name":"Las Pinas"},"id":"PH.","arcs":[[505,-313,506,-504]]},{"type":"Polygon","properties":{"name":"Muntinlupa"},"id":"PH.","arcs":[[-327,-309,-506,-503,507]]},{"type":"Polygon","properties":{"name":"Taguig"},"id":"PH.","arcs":[[508,-493,-328,-508,-502,-499,-497]]},{"type":"Polygon","properties":{"name":"Pateros"},"id":"PH.","arcs":[[-509,-496,-494]]},{"type":"Polygon","properties":{"name":"Lucena"},"id":"PH.","arcs":[[509,-347]]}]}},"arcs":[[[2553,72],[-18,-61],[-6,-1],[-5,2],[-2,5],[4,5],[0,3],[-2,3],[3,4],[5,4],[4,6],[2,7],[-2,4],[-4,1],[-4,-1],[-5,1],[1,4],[4,3],[1,3],[11,6],[2,3],[3,2],[2,3],[4,2],[2,-8]],[[3174,217],[2,-7],[-2,-4],[-6,-2],[-2,-3],[-1,-4],[-2,-7],[-4,-5],[-5,-2],[-7,-1],[-6,3],[-1,3],[1,2],[-1,2],[-4,2],[4,3],[0,4],[4,0],[3,1],[1,3],[0,2],[-4,2],[2,3],[-1,3],[6,3],[1,-1],[7,1],[4,-1],[3,1],[-3,2],[11,-3]],[[3382,227],[-5,-5],[-9,-3],[-15,2],[-6,5],[-3,-1],[4,3],[7,3],[15,7],[11,-3],[6,-3],[-1,-3],[-4,-2]],[[3478,287],[3,-7],[-1,-3],[-6,-7],[-7,-3],[-11,-2],[-13,-5],[-8,3],[-5,7],[5,3],[13,4],[11,6],[6,3],[7,-1],[4,0],[2,2]],[[3509,303],[-12,-22],[-8,4],[-6,4],[-1,1],[1,2],[1,1],[-1,2],[0,3],[3,1],[1,4],[7,3],[12,3],[3,-6]],[[3664,307],[-1,-1],[-9,5],[0,8],[-5,4],[-2,4],[14,-2],[4,-3],[4,-3],[5,-3],[0,-1],[-3,-3],[-2,-5],[-5,0]],[[3518,342],[-3,-1],[1,2],[2,-1]],[[3777,341],[-4,-2],[0,-4],[-2,-2],[-7,2],[-9,1],[1,1],[-2,2],[-1,-3],[-4,1],[4,5],[11,1],[15,1],[2,-2],[-4,-1]],[[3856,341],[2,-2],[3,0],[-7,-2],[-8,0],[-1,2],[-8,4],[-4,3],[11,0],[12,-5]],[[3508,321],[-4,-1],[1,2],[-2,0],[-2,0],[2,2],[1,4],[-4,2],[-1,6],[-5,1],[-3,3],[2,3],[0,4],[6,3],[12,1],[9,-6],[-5,-1],[-3,-2],[-1,-3],[0,-3],[3,-2],[-4,-4],[-1,-5],[-1,-4]],[[3098,355],[-4,-4],[-2,2],[3,4],[3,-2]],[[3435,364],[17,-9],[-3,-1],[-8,2],[-9,5],[-3,-1],[1,-3],[3,-1],[5,-1],[7,-1],[5,-4],[5,1],[6,-1],[6,-3],[3,-7],[-1,-4],[2,-3],[0,-4],[-16,-7],[-15,-2],[-5,-3],[-5,-1],[-9,4],[-11,0],[-6,1],[1,3],[2,2],[5,3],[2,1],[-6,-2],[-5,-1],[-1,1],[13,14],[2,11],[4,7],[7,5],[7,-1]],[[3521,352],[-8,-1],[-2,5],[-3,7],[5,3],[12,0],[5,-5],[-6,-5],[-3,-4]],[[3403,419],[2,-12],[-10,6],[-5,0],[-3,2],[-3,1],[-1,3],[-3,3],[-4,4],[15,2],[7,-4],[5,-5]],[[3492,442],[7,-3],[-7,-4],[-11,-2],[-13,-2],[-8,1],[-6,8],[4,4],[4,-3],[5,0],[2,2],[7,1],[5,2],[3,-2],[8,-2]],[[3541,449],[-12,-2],[16,9],[13,0],[1,-6],[-10,-1],[-8,0]],[[3766,471],[13,-11],[0,-4],[-3,-1],[-7,-2],[-8,1],[-12,4],[-3,3],[-1,4],[3,0],[3,-1],[4,-3],[4,-2],[-1,3],[4,0],[5,-2],[4,-1],[1,2],[-9,7],[-3,0],[-9,3],[1,3],[8,0],[6,-3]],[[3763,488],[-5,-9],[-9,9],[10,7],[4,-7]],[[3899,505],[7,-4],[8,-6],[3,-18],[-3,1],[-5,3],[5,3],[-3,7],[-6,9],[-7,2],[-4,-1],[4,-2],[-8,0],[0,5],[9,1]],[[8839,496],[-8,-23],[3,-6],[-18,-19],[-9,-1],[-5,4],[1,10],[-3,4],[-4,2],[-1,2],[5,0],[-2,1],[-5,1],[-2,2],[5,4],[-2,3],[0,2],[10,2],[5,2],[-1,1],[-7,0],[-7,1],[3,5],[8,5],[5,0],[0,1],[-2,4],[3,5],[11,1],[11,-5],[5,-3],[1,-5]],[[3952,510],[-3,0],[-6,0],[-12,5],[-9,8],[1,7],[10,7],[3,10],[6,3],[26,5],[8,-2],[9,-5],[0,-7],[-1,-5],[0,-3],[-8,-8],[-10,-4],[-14,-11]],[[3445,587],[-12,-4],[-3,3],[-1,4],[1,1],[5,1],[5,0],[5,-2],[0,-3]],[[4259,626],[-3,-6],[-7,-4],[-4,-1],[-5,-1],[-7,-3],[-6,0],[-16,4],[-9,5],[-1,4],[6,1],[8,-1],[25,5],[13,1],[6,-4]],[[2848,684],[-15,-4],[9,4],[10,4],[4,-1],[-8,-3]],[[3574,696],[-3,-4],[-3,3],[-2,-1],[2,-3],[6,0],[1,-2],[-2,-2],[1,-3],[3,-1],[3,0],[1,1],[2,3],[-3,2],[-4,2],[6,1],[5,-5],[-1,-6],[-4,-2],[-10,3],[-8,7],[-5,13],[15,-6]],[[3077,739],[5,0],[4,2],[1,-1],[2,-2],[3,-2],[-7,-1],[-15,4],[4,2],[3,-2]],[[3090,747],[10,-2],[5,-1],[5,-4],[0,-6],[-1,-1],[-5,1],[-11,3],[-2,3],[-1,2],[0,2],[-2,1],[-9,-1],[-4,-2],[6,5],[9,0]],[[3121,746],[2,-9],[11,2],[6,2],[3,0],[5,1],[6,1],[8,1],[3,-1],[-4,-3],[-4,-3],[-1,-1],[0,-2],[-5,1],[-6,0],[-8,-1],[-5,0],[-1,1],[-8,-1],[-8,6],[1,11],[8,-1],[-3,-4]],[[3150,781],[1,-7],[-3,0],[-1,-3],[-2,0],[0,-2],[-1,-1],[-4,2],[-10,-2],[-4,6],[4,-1],[0,2],[-3,2],[10,5],[13,-1]],[[3246,804],[3,-1],[-1,0],[2,-4],[4,-4],[9,-5],[2,-6],[-4,-4],[-12,14],[-6,7],[3,3]],[[4792,783],[-11,-6],[-13,2],[-6,9],[16,15],[7,1],[10,-3],[2,-4],[4,-3],[-1,-4],[-8,-7]],[[4737,817],[-14,-1],[3,2],[3,4],[5,6],[5,6],[12,9],[9,-1],[3,-6],[-6,-2],[5,-3],[-3,-2],[3,-1],[-11,-3],[-6,-1],[3,-3],[-11,-4]],[[4626,823],[-35,0],[-7,3],[-1,5],[4,6],[19,10],[10,-1],[9,-2],[5,-4],[4,-7],[0,-6],[-8,-4]],[[4900,842],[6,2],[8,-1],[7,-2],[15,-4],[0,-2],[-20,-6],[-11,-8],[-4,-6],[-29,-4],[-10,3],[-1,3],[7,5],[6,2],[6,1],[6,3],[7,6],[0,4],[-2,2],[-4,0],[-7,0],[-2,3],[5,9],[9,1],[12,-3],[3,-3],[-5,-1],[-2,-1],[0,-3]],[[3718,887],[-6,-1],[-7,5],[-3,8],[3,7],[16,-2],[10,-8],[-3,-4],[-10,-5]],[[5059,890],[-13,-2],[-10,2],[-8,4],[3,5],[21,8],[8,-1],[7,-3],[2,-2],[1,-3],[-3,-4],[-8,-4]],[[4089,905],[0,-3],[5,1],[6,-1],[1,-2],[-8,-6],[-13,-2],[-3,0],[0,1],[-5,1],[-1,2],[3,2],[3,0],[2,0],[0,2],[1,2],[3,2],[1,3],[2,1],[3,-1],[0,-2]],[[5026,900],[-7,-2],[-5,3],[-4,3],[-2,3],[4,7],[11,9],[12,-2],[8,-8],[1,-5],[-18,-8]],[[3635,921],[0,-5],[-6,-7],[-4,-4],[-5,-2],[3,3],[-2,0],[-2,2],[3,4],[2,1],[0,3],[3,1],[0,2],[-2,-1],[-10,1],[-3,-2],[2,0],[2,0],[1,-1],[1,-2],[-3,0],[2,-3],[0,-5],[-6,-3],[-2,-1],[1,-3],[-8,3],[-5,2],[-1,2],[-1,2],[0,-2],[-6,2],[-5,2],[-2,3],[5,3],[5,1],[2,2],[9,3],[9,0],[4,1],[13,-1],[6,-1]],[[4101,916],[-3,-2],[-4,1],[-5,-1],[-4,-2],[-5,-1],[-4,-4],[-1,-2],[1,-1],[-3,-2],[-4,-1],[-2,0],[-1,2],[2,3],[8,7],[10,5],[19,8],[9,1],[5,-5],[-6,-2],[-9,-2],[-3,-2]],[[4165,941],[14,-10],[-8,-4],[-4,2],[5,5],[-6,1],[-6,1],[-6,0],[0,2],[-2,0],[-2,-3],[3,-1],[-2,-2],[6,2],[7,0],[-2,-2],[-4,-2],[1,0],[5,1],[1,-3],[-4,-2],[-4,1],[-3,-1],[1,-1],[-1,-1],[-7,5],[-4,7],[5,5],[1,3],[5,-1],[11,-2]],[[1164,992],[-13,-5],[-1,0],[6,6],[8,-1]],[[1089,1002],[-1,0],[-1,2],[2,0],[1,-1],[-1,-1]],[[3839,1002],[-1,-3],[3,1],[2,-2],[-3,-3],[-1,-1],[1,-5],[-4,-4],[-7,-7],[-10,-5],[-5,-2],[-7,-1],[-11,9],[5,7],[1,2],[1,-1],[3,0],[2,1],[3,2],[8,6],[5,-1],[4,-5],[4,-4],[1,3],[-2,1],[3,4],[0,10],[3,1],[2,-1],[0,-2]],[[5214,997],[-1,-4],[9,0],[1,0],[7,3],[7,-1],[-17,-4],[-19,-4],[-6,2],[6,1],[-1,3],[-5,3],[-5,0],[-11,-1],[-4,4],[1,5],[7,4],[12,-1],[7,-1],[7,-1],[5,-8]],[[4041,1027],[0,-1],[4,2],[5,-1],[10,-8],[-6,-9],[-7,-3],[-6,-2],[-15,1],[-3,4],[4,4],[3,0],[3,-1],[2,-3],[3,1],[4,2],[4,2],[6,3],[0,2],[-3,0],[-1,-2],[-3,-1],[-3,2],[-2,2],[-2,-2],[0,-1],[-4,-1],[-3,0],[-4,2],[1,4],[5,3],[7,2],[1,-1]],[[3872,1061],[-3,-1],[-12,3],[-12,1],[-1,7],[11,5],[11,4],[14,3],[4,1],[4,0],[4,-3],[2,-3],[-3,-6],[0,-5],[1,-4],[-4,-1],[-8,-1],[-8,0]],[[3970,1080],[1,-8],[-4,5],[-12,6],[4,4],[7,-2],[-2,-1],[6,-4]],[[9068,1367],[-13,-2],[-16,5],[-7,6],[-5,7],[-8,6],[-2,5],[5,5],[6,3],[5,1],[10,0],[12,-3],[13,-11],[5,-8],[0,-8],[-5,-6]],[[8981,3079],[5,-2],[4,2],[4,1],[4,0],[3,-1],[4,1],[4,-1],[-2,-4],[-4,-2],[-4,-2],[5,-3],[2,-4],[-1,-4],[-2,-6],[0,-2],[5,-8],[-3,0],[-1,-1],[1,-1],[-16,6],[0,2],[0,8],[-1,5],[-4,1],[1,2],[-6,3],[-1,-2],[-4,-1],[-12,1],[4,3],[0,2],[0,6],[10,4],[5,-3]],[[9066,3124],[1,-6],[9,0],[11,-3],[4,-1],[-10,-6],[-8,-5],[2,-7],[-7,4],[-3,3],[-4,-1],[-3,1],[-10,0],[0,4],[-3,9],[-1,6],[6,-3],[4,1],[7,4],[-1,4],[0,5],[11,-4],[-5,-5]],[[8886,3162],[-7,0],[-4,5],[-11,0],[-10,8],[-3,3],[3,6],[-3,3],[-2,5],[2,5],[4,-2],[0,-2],[3,-2],[0,-2],[2,-2],[0,-2],[5,-1],[2,-1],[7,-2],[2,-7],[13,-6],[9,-4],[-12,-2]],[[8400,3184],[-4,-2],[-6,9],[5,3],[-1,7],[-5,10],[-3,4],[-4,8],[10,0],[3,-6],[6,-7],[3,-6],[0,-3],[-2,-8],[-2,-9]],[[7560,3371],[3,-3],[-5,-3],[-6,-1],[-1,0],[-6,-5],[-18,-6],[-13,-3],[-7,1],[0,5],[-1,0],[-7,-1],[-7,6],[13,5],[6,0],[7,0],[4,2],[7,0],[8,3],[3,0],[11,1],[9,-1]],[[8838,3502],[-11,0],[-7,1],[-5,6],[-2,3],[-6,4],[-1,2],[-1,2],[-2,4],[6,2],[11,-3],[10,-3],[10,-4],[-1,-5],[-5,-3],[4,-6]],[[5966,3519],[-4,-1],[-5,0],[-9,0],[-6,-2],[-8,-4],[-5,1],[-1,6],[0,4],[-3,4],[13,6],[20,-5],[5,-3],[3,-2],[0,-4]],[[9321,3708],[2,-10],[-1,0],[-10,4],[-7,4],[-6,4],[4,5],[18,-7]],[[7850,3704],[-22,-9],[-23,1],[0,11],[37,26],[23,6],[9,-2],[-1,-7],[-7,-5],[-3,-4],[1,-4],[-2,-3],[-5,-5],[-7,-5]],[[8999,3841],[-16,-5],[-12,4],[-10,7],[0,3],[-2,5],[16,2],[27,-6],[-3,-10]],[[6431,4037],[7,-1],[6,2],[3,-2],[7,-4],[-3,-3],[-4,-2],[-3,-4],[-6,-1],[0,-2],[-9,-4],[-1,-8],[-4,0],[-1,2],[-1,2],[-2,-2],[-7,-6],[-4,1],[-1,7],[1,5],[9,8],[-2,4],[-2,5],[-1,4],[1,3],[4,2],[7,0],[6,-6]],[[7180,4029],[-14,-4],[-5,13],[3,13],[8,13],[12,3],[2,-12],[0,-8],[-5,-5],[-1,-13]],[[6493,4166],[6,-16],[-1,-5],[1,-2],[-9,-6],[-18,-4],[-11,3],[-3,3],[-6,0],[-7,2],[-3,5],[3,3],[17,3],[1,4],[6,5],[12,0],[5,-2],[3,0],[3,4],[-1,2],[2,1]],[[6622,4218],[3,-3],[-1,-6],[-2,-2],[-4,3],[-8,-3],[-13,-7],[-2,1],[0,3],[0,3],[-8,4],[7,5],[16,-1],[10,0],[2,3]],[[8153,4273],[14,-3],[7,1],[7,0],[6,-5],[9,-1],[9,2],[5,-4],[3,-5],[-3,-2],[-18,-7],[6,-10],[-1,-5],[-3,-2],[-16,-3],[-2,2],[-6,3],[-7,2],[-6,-1],[-5,2],[3,8],[-5,7],[1,3],[2,3],[-14,11],[3,5],[-3,8],[3,1],[3,-3],[2,-3],[3,-2],[3,-2]],[[7638,4318],[-12,-3],[-14,3],[-11,5],[-9,8],[2,8],[10,5],[10,4],[13,1],[12,-2],[10,-8],[-1,-12],[-10,-9]],[[6392,4364],[-12,-4],[1,15],[13,1],[5,-3],[-7,-9]],[[6954,4392],[-4,-11],[-13,6],[-2,5],[2,9],[7,1],[4,0],[4,-1],[2,-9]],[[7760,4389],[-9,-1],[-23,5],[-7,2],[-2,5],[2,6],[6,5],[12,6],[12,1],[7,-2],[3,-2],[5,-7],[3,-14],[-9,-4]],[[7604,4399],[-10,-2],[-3,2],[-7,1],[-6,6],[-4,2],[3,2],[1,3],[3,3],[13,4],[3,2],[1,2],[11,8],[5,0],[6,2],[13,1],[1,-3],[3,-3],[-1,-5],[-19,-14],[-4,-7],[-9,-4]],[[4775,4395],[-20,-3],[-9,4],[-5,4],[0,4],[9,16],[-5,8],[0,6],[11,3],[4,0],[8,-3],[10,-7],[4,-7],[0,-4],[5,-9],[-1,-9],[-11,-3]],[[7735,4437],[-7,-2],[-4,1],[-7,0],[-9,3],[-1,5],[3,8],[11,3],[10,-2],[8,-6],[1,-5],[-5,-5]],[[5158,4423],[-8,0],[-2,5],[-16,14],[-12,12],[10,5],[12,-4],[0,-4],[3,-2],[2,-2],[-3,-6],[2,-3],[6,-2],[0,-2],[5,0],[4,-1],[4,-1],[-1,-2],[1,-2],[-4,-2],[-3,-3]],[[5178,4485],[-4,-4],[-21,2],[-19,7],[-6,9],[0,11],[8,4],[11,3],[13,0],[9,-7],[8,-11],[0,-11],[1,-3]],[[4215,4590],[7,-9],[-10,3],[-7,-4],[6,-7],[-4,2],[-7,4],[-3,1],[-2,2],[3,1],[5,0],[-4,3],[-9,-2],[-3,6],[8,13],[10,-2],[7,-8],[3,-3]],[[7403,4632],[-13,-16],[-1,1],[0,6],[-1,5],[-7,2],[6,6],[16,-4]],[[7580,4688],[-6,-6],[-12,5],[-14,17],[-10,25],[1,6],[5,4],[10,-4],[10,-8],[15,-21],[2,-9],[-1,-9]],[[7739,4802],[5,-2],[5,1],[10,-3],[1,-4],[-1,-3],[-1,-1],[-9,1],[-10,2],[-6,1],[-14,4],[-5,3],[9,7],[8,4],[4,-4],[4,-6]],[[7823,4795],[-16,-7],[-9,11],[-6,3],[-9,7],[4,6],[11,-2],[9,-6],[5,-3],[3,-1],[1,-4],[7,-4]],[[7694,4826],[7,-7],[-9,-7],[-5,2],[-6,6],[-3,-3],[-8,1],[-4,3],[-2,3],[2,4],[1,3],[-3,1],[3,3],[10,0],[11,-4],[6,-5]],[[8341,4824],[20,-7],[16,0],[8,-2],[7,-7],[-3,-3],[-6,-4],[-9,-3],[-13,-1],[-7,1],[-12,7],[-7,1],[-5,4],[-16,24],[-2,14],[10,-2],[12,-6],[2,-6],[0,-7],[5,-3]],[[8413,4827],[-7,-1],[-25,2],[-10,3],[-7,6],[2,3],[6,1],[7,3],[-3,4],[-8,4],[-8,2],[-8,3],[1,4],[3,2],[-1,2],[1,4],[5,5],[8,1],[11,1],[9,-1],[10,-20],[2,-10],[5,-8],[6,-2],[3,-3],[-2,-5]],[[7676,4876],[5,0],[5,1],[-1,-2],[-1,-1],[2,-1],[6,-5],[4,-8],[1,-5],[-1,-5],[-6,-2],[-5,-1],[-16,11],[-5,3],[-2,9],[-1,3],[-5,4],[-2,5],[6,1],[16,-7]],[[5280,4939],[-13,-3],[-9,2],[-7,3],[-3,3],[-6,0],[-3,3],[9,5],[11,4],[10,2],[15,4],[8,1],[9,3],[-1,-5],[-8,-13],[-12,-9]],[[5297,5012],[-15,0],[-10,6],[1,3],[3,4],[-6,4],[-9,2],[-3,1],[-1,2],[-2,3],[1,4],[7,3],[26,2],[27,-3],[4,-4],[-1,-7],[-4,-8],[-7,-8],[-11,-4]],[[6146,5156],[-3,-3],[-11,0],[-4,2],[-8,1],[-8,10],[-7,7],[10,-3],[14,-9],[15,-4],[2,-1]],[[5969,5268],[-5,-4],[-7,12],[2,12],[10,-2],[-2,-2],[0,-5],[2,-11]],[[5403,5389],[4,-15],[-14,9],[10,6]],[[5356,5391],[3,-10],[-8,3],[-14,3],[-6,0],[1,3],[-2,2],[3,2],[6,-1],[9,0],[8,-2]],[[3542,5468],[10,-2],[20,0],[3,-1],[3,-2],[6,-9],[-5,-6],[-9,1],[-6,2],[-11,0],[-4,2],[-8,4],[-14,5],[-48,12],[-7,4],[1,2],[61,-8],[8,-4]],[[3468,5569],[5,-1],[5,1],[3,-1],[5,-7],[6,-4],[2,-3],[-1,-3],[-18,-11],[-15,0],[-18,5],[-9,4],[-2,5],[-2,4],[-4,-1],[-5,1],[4,3],[10,1],[8,3],[5,10],[11,-2],[10,-4]],[[3209,5599],[-12,-5],[-11,4],[-10,3],[-7,3],[0,6],[1,1],[7,2],[21,-4],[11,-10]],[[5008,5616],[-1,-10],[-10,-5],[-3,3],[2,8],[-7,3],[-20,-8],[-8,-1],[-7,7],[-3,12],[5,2],[5,2],[1,2],[-4,7],[4,2],[9,-1],[24,-5],[7,-5],[-2,-5],[1,-2],[7,-6]],[[7119,5625],[2,-5],[3,-5],[-5,-5],[-5,-2],[-8,12],[-2,1],[-3,0],[-5,0],[-2,4],[1,3],[-3,2],[4,4],[0,2],[-4,4],[-2,3],[9,2],[-2,8],[2,6],[4,2],[16,-1],[3,-5],[-6,-2],[1,-3],[3,-6],[-4,-7],[3,-12]],[[7650,5643],[-12,-4],[-9,1],[-16,9],[-4,6],[6,5],[9,0],[1,1],[-1,3],[4,-1],[26,-17],[-1,-2],[-3,-1]],[[6586,5746],[1,-3],[5,1],[0,-5],[-5,-4],[-2,-1],[0,-3],[-4,-1],[-6,7],[-2,4],[-8,3],[-11,6],[14,3],[18,-7]],[[5041,5832],[-5,-4],[-5,1],[-3,6],[-5,4],[-5,5],[-2,7],[2,5],[21,5],[3,-1],[17,-4],[2,-5],[-16,-14],[-1,-3],[-3,-2]],[[3742,5913],[14,-2],[8,2],[17,-2],[-1,0],[-7,-1],[-15,-2],[-9,-6],[-14,1],[-3,2],[2,6],[8,2]],[[5258,5922],[-4,-5],[-2,11],[-5,9],[0,7],[3,1],[4,-2],[8,-3],[0,-5],[4,-4],[-5,-4],[-3,-5]],[[6201,5976],[3,-1],[7,0],[-3,-5],[-7,-6],[4,-2],[4,0],[-1,-4],[-8,0],[-6,-3],[1,-3],[0,-3],[-8,-2],[-4,1],[1,3],[-3,-1],[-9,1],[-4,-3],[-6,-2],[-3,-2],[-11,4],[3,3],[4,3],[1,0],[3,3],[6,0],[6,1],[1,4],[2,0],[3,-1],[4,0],[8,5],[3,5],[6,3],[3,2]],[[5297,6190],[-11,-3],[-20,0],[-5,0],[-6,2],[-7,1],[-6,1],[0,2],[-9,12],[3,2],[5,1],[6,-1],[17,-2],[19,-6],[14,-9]],[[3110,7117],[-5,-2],[-12,4],[-14,1],[-4,3],[-10,2],[-7,1],[-2,3],[-1,10],[3,5],[9,4],[9,0],[8,-1],[23,-17],[2,-5],[1,-8]],[[5367,8420],[-30,-9],[3,18],[3,4],[-10,7],[1,4],[6,6],[3,1],[7,2],[7,2],[6,2],[7,-1],[6,-2],[4,-4],[1,-3],[-1,-9],[-8,-9],[1,-6],[-6,-3]],[[4717,8968],[-3,0],[-6,4],[-1,4],[3,8],[8,-8],[1,-4],[-2,-4]],[[5023,9501],[-5,-1],[-8,4],[1,8],[11,11],[8,-13],[-6,-5],[-1,-4]],[[2996,86],[-17,0],[-15,4],[-7,8],[19,2],[24,-7],[4,-6],[-8,-1]],[[2600,7],[-11,-7],[0,38],[6,35],[-6,41],[-9,19],[-13,17],[12,2],[12,-3],[10,-4],[8,-7],[3,-4],[2,-5],[2,-5],[0,-5],[4,-12],[15,-20],[3,-10],[-1,-11],[-3,-10],[-4,-9],[-30,-40]],[[2982,126],[-16,0],[-23,10],[-9,16],[3,10],[12,3],[11,-3],[6,-5],[22,-6],[9,-10],[-1,-9],[-8,-5],[-6,-1]],[[2952,245],[-7,-2],[-4,1],[-5,-1],[-2,-2],[-4,-4],[-12,-2],[-23,-4],[-7,5],[3,11],[21,21],[14,8],[16,7],[8,-2],[0,-8],[1,-7],[4,-7],[2,-7],[-5,-7]],[[3379,373],[8,-1],[8,2],[8,1],[9,-4],[1,-9],[-16,-37],[-5,-25],[-6,-12],[-11,-9],[-15,3],[-11,4],[-7,6],[-2,10],[6,18],[1,8],[-7,5],[-7,-1],[-3,-4],[-1,-5],[-3,-3],[-6,0],[-18,0],[-8,3],[-8,5],[-6,7],[-4,6],[-11,-8],[-2,-20],[-8,-9],[-15,-3],[-16,2],[-14,3],[-12,2],[-21,-1],[-8,-5],[-4,-7],[-9,-8],[-7,-1],[-10,1],[-8,-1],[-4,-5],[-7,-19],[-16,-7],[-12,1],[-9,5],[-12,1],[-9,-3],[-14,-11],[-9,-3],[-32,0],[-14,-3],[-9,-3],[-9,0],[-11,6],[-2,8],[2,21],[-7,9],[10,5],[8,3],[36,7],[32,9],[6,3],[7,2],[36,13],[14,15],[9,4],[32,3],[25,6],[9,1],[7,2],[17,10],[11,1],[8,-2],[7,-1],[10,2],[2,3],[5,12],[4,4],[28,10],[9,7],[13,4],[24,5],[19,8],[12,2],[10,-1],[6,-4],[2,-7],[0,-32],[4,-4]],[[7068,2973],[-21,-1],[-16,2],[-12,16],[-12,4],[1,3],[12,2],[9,3],[7,4],[12,5],[17,6],[40,9],[21,2],[20,-7],[8,-6],[-6,-7],[-19,-12],[-41,-18],[-20,-5]],[[7918,3330],[-11,-10],[-1,-9],[3,-9],[-9,-4],[-14,2],[-15,-3],[-12,-10],[-10,-5],[-11,5],[-4,6],[0,5],[-3,7],[-1,8],[6,3],[9,-1],[6,1],[5,3],[5,3],[6,0],[10,1],[14,5],[6,4],[7,1],[14,2],[0,-5]],[[7652,3337],[7,-25],[11,6],[16,15],[15,4],[3,-8],[9,-11],[11,-8],[12,2],[47,-24],[14,-5],[31,1],[11,-2],[19,-7],[30,-9],[11,-6],[-4,-15],[0,-11],[-4,-6],[-12,10],[-3,-12],[0,-9],[-2,-6],[-8,-11],[16,-8],[12,-11],[1,-10],[-20,-4],[-16,-6],[21,-13],[56,-23],[-26,-32],[-3,-7],[-11,-3],[-26,0],[-26,2],[-15,3],[-4,5],[1,6],[-3,5],[-16,1],[-7,-4],[-31,-19],[-10,-3],[-13,-3],[-11,-4],[-5,-7],[-1,-8],[-2,-7],[-5,-6],[-7,-6],[-30,-13],[-44,-11],[-46,-8],[-35,-1],[-41,1],[-161,-6],[-132,13],[-47,9],[-21,8],[-9,10],[3,13],[7,12],[1,11],[-11,8],[-19,2],[-21,-1],[-18,2],[-7,11],[3,14],[6,13],[20,25],[13,9],[36,18],[7,9],[3,8],[8,1],[14,-3],[10,2],[6,4],[4,6],[5,4],[34,7],[47,7],[43,11],[18,19],[2,13],[5,10],[12,6],[30,4],[0,4],[-2,5],[2,6],[8,4],[14,5],[6,3],[16,13],[9,4],[18,4],[40,4],[42,0],[70,6],[19,-6]],[[7269,3474],[-46,15]],[[7223,3489],[-29,21],[-36,-17],[-36,-33],[11,-26],[21,-38]],[[7154,3396],[-12,-4],[-26,-1],[-24,-2],[-15,-6],[-21,-17],[-56,-26],[-8,-9],[-2,-13],[-5,-9],[-9,-7],[-13,-6],[-9,-3],[-12,-2],[-7,-4],[-4,-3],[-5,-5],[-3,-5],[-2,-5],[0,-48],[-13,-32],[-2,-12],[-4,-5],[-10,-3],[-10,-2],[-4,-2],[-95,-130],[-7,-23],[-15,-30],[-9,-11],[-9,-6],[-18,-6],[-9,-4],[-10,-7],[-13,-14],[-55,-38],[-12,-6],[-16,-5],[-16,1],[-6,13],[-7,34],[0,13],[52,169],[41,56],[5,12],[1,15],[-4,3],[-20,6],[-4,3],[4,19],[3,4],[9,3],[6,-2],[3,-3],[3,-1],[5,4],[2,5],[0,13],[6,16],[13,11],[38,17],[37,23],[14,14],[12,28],[50,39],[16,38],[9,10],[18,10],[87,68],[5,9],[2,3],[5,3],[5,4],[2,7],[-8,19],[2,8],[10,12],[26,18],[11,25],[13,14],[16,12],[40,25],[18,17],[69,114],[20,18],[-5,15],[-13,21],[7,11],[11,7],[10,9],[0,15],[7,0],[4,-5],[4,-3],[14,-5],[-12,33],[-6,7],[-4,9],[8,11],[11,12],[50,38],[28,12],[31,-5],[-2,-4],[-5,-18],[-13,-17],[-5,-12],[-4,-22],[-6,-12],[-32,-21],[-11,-11],[10,-2],[3,-4],[2,-5],[3,-1],[21,0],[9,2],[9,2],[-3,-12],[10,-36],[-2,-13],[-6,-20],[1,-11],[12,-14],[2,-7],[-4,-6],[-14,-14],[-4,-6],[-3,-15],[-18,-24],[-6,-14],[3,-24],[28,-49],[4,-22],[-3,-1],[-8,-2],[-7,-3],[-4,-3],[1,-3],[6,-2],[1,-3],[-1,-48],[-5,-10],[-27,-38],[1,-6],[9,-9],[-4,-5],[-23,-9],[-3,7],[-4,4],[-7,1]],[[7031,3938],[-4,-1],[-12,9],[-26,39],[-4,14],[4,7],[7,7],[18,12],[13,5],[9,-2],[7,-6],[29,-49],[12,-12],[11,-8],[7,-7],[-3,-4],[-68,-4]],[[6634,3484],[-22,-28],[-3,-12],[-1,-41],[-5,-12],[-32,-37],[-4,-14],[-1,-15],[-4,-12],[-6,-11],[-48,-41],[-9,-15],[-7,-4],[-8,-3],[-3,-3],[-14,-28],[-29,-19],[-15,-10],[-5,-14],[14,-104],[-6,-15],[-1,-6],[-4,-9],[-7,0],[-10,1],[-8,-2],[0,-17],[43,-17],[-7,-16],[-10,12],[-18,-6],[-8,-12],[18,-7],[29,-3],[9,-6],[2,-10],[6,-14],[14,-9],[22,-8],[20,-9],[16,-28],[18,-11],[21,-11],[17,-12],[7,-24],[-11,-28],[-20,-25],[-57,-48],[-4,-10],[-9,-8],[-72,-25],[-14,-2],[-37,0],[-12,-2],[-21,-5],[-23,-3],[-15,-5],[-10,-2],[-44,9],[-34,19],[-25,25],[-43,60],[-6,41],[-6,11],[-12,10],[-25,15],[-18,7],[-17,3],[-68,2],[-21,2],[-46,14],[-14,3],[-10,2],[-9,5],[-7,6],[-6,3],[-13,2],[-14,1],[-11,2],[-2,3]],[[5839,2904],[429,320],[156,167],[13,19],[0,18],[-33,73],[26,3],[26,7],[26,4],[25,-2],[5,-2],[3,-2],[2,-3],[1,-3],[3,-5],[4,-1],[6,0],[25,-6],[58,-6],[20,-1]],[[6978,2738],[4,0],[13,-4],[8,-5],[-7,-3],[-13,-10],[-5,-3],[-9,-1],[-30,1],[-8,0],[-5,-2],[-4,-4],[-1,-4],[-3,-5],[-8,0],[-18,3],[-19,0],[-19,2],[-18,4],[-84,35],[-9,9],[4,7],[26,14],[18,-7],[24,3],[25,7],[31,16],[8,2],[5,4],[2,10],[5,7],[13,2],[16,0],[14,-2],[9,-9],[15,-18],[9,-4],[17,-3],[-4,-9],[-11,-8],[-6,-4],[0,-7],[3,-4],[12,-10]],[[5839,2904],[-7,8],[-21,15],[-19,9],[-23,29],[-15,6],[-11,2],[-8,6],[-31,38],[-10,8],[7,6],[-3,5],[-18,10],[-6,-2],[-10,-4],[-6,-2],[2,9],[6,15],[0,9],[-6,-2],[-16,-4],[-7,-2],[1,24],[6,22],[1,20],[-15,17],[0,4],[11,6],[39,42],[18,26],[14,6],[21,1],[44,6],[23,1],[68,-8],[18,-5],[14,6],[53,6],[22,7],[55,33],[26,10],[20,-7],[19,6],[29,20],[6,11],[-3,15],[-14,26],[-7,26],[14,74],[-10,27],[-39,47],[-7,26],[9,11],[19,5],[20,3],[8,4],[6,5],[37,22],[10,13]],[[6173,3621],[108,-16],[45,54],[-96,37]],[[6230,3696],[-4,39],[-3,3],[-15,6],[-4,4],[2,12],[2,5],[4,5],[9,7],[28,19],[9,3],[47,2],[21,2],[20,4],[85,32],[45,11],[48,-1],[3,-2],[3,-4],[5,-4],[7,-2],[19,0],[6,0],[11,-5],[19,-9],[12,-3],[13,1],[26,6],[11,1],[14,-4],[-2,-5],[-7,-5],[1,-7],[10,-3],[8,2],[8,6],[10,4],[16,1],[11,-1],[11,-2],[37,-5],[19,-5],[14,-9],[7,-24],[5,-6],[15,-11],[3,-2],[4,0],[3,0],[4,-2],[1,-3],[-5,-29],[-9,-11],[-30,-24],[-17,-24],[-32,-80],[-12,-14],[-87,-54],[-11,-10],[-14,-17]],[[4831,1161],[-7,-4],[-7,5],[-2,14],[-7,8],[-12,9],[-7,7],[8,3],[9,5],[8,11],[10,6],[13,-10],[0,-41],[-6,-13]],[[5138,1227],[10,-20],[20,-3],[17,-36],[138,5],[-44,52],[-7,26],[0,15]],[[5272,1266],[18,0],[8,0],[10,-3],[14,-9],[8,-3],[11,-3],[26,-3],[12,-1],[3,-2],[5,-6],[8,-6],[12,-2],[47,-4],[10,-3],[7,-4],[5,-3],[5,-3],[11,-3],[27,-4],[9,-3],[33,-12],[7,-6],[-15,-9],[-21,-4],[-48,-1],[-20,-6],[-11,-8],[-9,-8],[-7,-10],[-5,-9],[-6,-28],[-10,-10],[-23,-4],[-24,-1],[-22,-2],[-67,-15],[-19,-3],[-46,0],[-33,-3],[-5,2],[-1,12],[-3,6],[-4,4],[-72,36],[-1,32],[-5,11],[-20,6],[-23,1],[-19,4],[-8,16],[4,16],[11,10],[18,4],[84,5]],[[6824,2407],[7,-235]],[[6831,2172],[-380,-1],[-13,-3],[-5,-9],[0,-103],[6,-13],[3,-5],[3,-5],[1,-5],[1,-5],[-1,0],[-30,6],[-30,4],[-31,1],[-32,-3],[-27,-9],[-19,-11],[-16,-12],[-21,-11],[-39,-8],[-33,1]],[[6168,1981],[-7,1],[-78,12],[-43,4],[-41,-1],[-40,-6],[-146,-32],[-11,-5],[-22,-9],[-106,-65],[-1,0],[-16,-6],[-36,-9],[-16,-7],[-8,-9],[-7,-23],[-7,-10],[-11,-8],[-25,-13],[-11,-7],[-12,-14],[-22,-47],[-12,-17]],[[5490,1710],[-59,-52],[-12,-14],[-6,-11],[0,-12],[1,-15],[0,-10],[-8,-15],[-3,-9],[-10,-16],[-21,-22],[-24,-18],[-2,-1],[-19,-7],[-201,9],[-4,0]],[[5122,1517],[30,39],[74,38],[35,9],[8,3],[4,4],[3,6],[-2,5],[-9,2],[-11,7],[3,16],[12,27],[-1,19],[1,6],[6,7],[13,11],[2,5],[3,14],[8,9],[13,6],[18,6],[12,5],[19,10],[9,10],[-34,9],[-2,10],[11,23],[1,26],[-6,14],[-13,6],[-8,7],[8,16],[25,26],[89,65],[26,27],[12,9],[12,6],[30,12],[32,5],[38,13],[81,16],[25,3],[17,-6],[4,6],[7,2],[9,0],[7,-4],[19,5],[79,10],[40,10],[12,4],[19,21],[11,8],[6,-6],[8,-13],[19,-8],[25,-2],[25,0],[100,10],[13,6],[12,1],[24,1],[11,1],[11,2],[22,7],[59,29],[12,14],[-14,11],[-37,14],[-3,4],[-4,13],[0,4],[6,3],[18,7],[4,1],[2,3],[5,3],[5,4],[2,6],[-1,7],[-6,13],[0,7],[8,11],[23,18],[5,11],[5,7],[11,9],[14,9],[12,6],[15,3],[82,7],[35,7],[17,0],[4,-2],[11,-8],[6,-3],[11,-1],[61,3],[18,6],[13,8],[16,14],[3,4],[15,28],[8,6],[16,3],[5,-1],[6,-2],[6,-2],[7,1],[5,2],[13,6],[9,3],[-5,7],[-33,22],[-8,8],[-2,6],[7,2],[15,2],[14,0],[6,-2],[6,-1],[26,-9],[17,-7],[11,-2],[12,1],[13,3],[1,-31],[8,-15],[19,1],[6,-3],[4,0]],[[6216,1666],[10,-10],[-21,2],[-7,2],[6,-10],[2,-6],[-2,-4],[-7,-4],[-7,-1],[-7,1],[-6,-1],[-30,-13],[-13,-4],[-8,-1],[-14,-1],[-7,-1],[-4,-3],[-5,-8],[-4,-2],[-16,-2],[-10,3],[-9,6],[-8,9],[-6,16],[-1,23],[10,20],[26,8],[15,-5],[12,-9],[13,-7],[16,1],[7,6],[2,8],[3,7],[11,3],[19,-4],[22,-9],[18,-10]],[[6355,1857],[-12,-11],[-28,-17],[-8,-8],[2,-6],[3,-6],[-1,-7],[-4,-3],[-14,-5],[-3,-3],[1,-4],[4,-2],[2,-3],[0,-5],[-6,-11],[-16,-13],[-7,-9],[-2,-9],[2,-18],[-6,-7],[-11,-3],[-6,2],[-5,4],[-11,2],[-1,0],[-24,4],[-8,8],[-16,23],[-10,6],[-13,-3],[-13,-7],[-11,-8],[-6,-7],[-1,-8],[3,-6],[-1,-4],[-15,-7],[-11,-3],[-15,-1],[-16,0],[-15,4],[6,8],[-3,5],[-6,2],[-4,0],[-2,-2],[-4,-1],[-5,0],[-3,1],[-1,3],[2,3],[4,2],[2,0],[-1,14],[5,8],[12,1],[20,-6],[2,13],[-8,9],[-11,8],[-5,9],[-8,38],[-6,10],[8,8],[7,12],[5,13],[2,11],[-11,9],[-25,1],[-43,-4],[-8,4],[-17,13],[-11,4],[-46,0],[-9,-1],[-21,-6],[-12,-1],[-23,-8],[-88,-40],[-27,-18],[-43,-35],[-10,-11],[-1,-7],[19,-3],[21,4],[14,-1],[0,-15],[-7,-9],[-12,-10],[-13,-9],[-11,-5],[8,21],[-1,4],[-11,1],[-12,-6],[-9,-8],[-4,-6],[-10,-6],[-48,-16]],[[5593,1711],[-103,-1]],[[6168,1981],[-2,-29],[9,-24],[44,0],[53,-7],[40,1],[32,-8],[11,-57]],[[6957,2037],[-2,-6],[-4,-12],[-2,-7],[1,0],[1,-1],[4,-2],[1,0],[12,3]],[[6968,2012],[0,-1],[6,-13],[8,-11],[2,-11],[-11,-12],[-21,-9],[-47,-16],[-13,-9]],[[6892,1930],[-1,0],[-5,1],[-23,2],[-66,-2],[-19,-2],[-26,-6],[-24,-7],[-12,-6],[3,-21],[29,-17],[23,-18],[-13,-28],[-9,-6],[-11,-6],[-11,-4],[-11,-4],[-37,-4],[-10,-2],[-4,-5],[-1,-7],[1,-13],[-4,-2],[-21,8],[-10,0],[-9,-10],[14,-12],[20,-12],[10,-10],[7,-15],[16,-8],[18,-6],[17,-10],[7,-13],[-1,-13],[-6,-13],[-11,-9],[-11,-3],[-12,3],[-32,14],[-33,9],[-15,6],[-30,19],[-9,9],[-15,7],[-3,3],[0,13],[-2,5],[-5,4],[-16,4],[-21,-1],[-19,-5],[-8,-8],[-6,-8],[-13,-5],[-17,0],[-13,3],[-31,16],[-14,11],[-5,12],[5,13],[15,5],[19,1],[18,4],[10,10],[0,13],[-12,10],[-23,5],[-13,6],[-5,15],[-2,17],[-5,12],[-12,5],[-11,-6],[-11,-11]],[[6831,2172],[-5,-63],[4,-35],[17,-19],[42,-4],[12,-2],[8,-5],[4,-4],[6,-4],[18,0],[20,1]],[[6824,2407],[12,-4],[7,-2],[4,-3],[10,-13],[10,6],[2,5],[-1,7],[3,7],[6,5],[15,11],[-12,7],[14,5],[17,-1],[-5,-11],[84,-11],[13,-3],[9,-5],[8,-10],[7,0],[9,4],[5,-1],[8,-12],[-2,0],[12,-19],[4,-3],[6,-9],[44,-31],[17,-21],[13,-26],[9,-27],[3,-74],[16,-35],[-2,-12],[-10,-7],[-109,-57],[-23,-7],[-45,-1],[-18,-6],[-7,-16]],[[4080,512],[-18,-2],[-31,6],[-7,3],[-11,6],[-10,8],[-4,6],[5,6],[11,6],[14,4],[13,3],[12,-1],[18,-9],[15,-12],[5,-11],[-12,-13]],[[4000,614],[-13,-2],[-9,2],[-3,7],[12,11],[26,6],[16,0],[12,-2],[20,-5],[3,-6],[-9,-1],[-14,-5],[-22,-4],[-19,-1]],[[4108,641],[-15,-7],[-20,6],[1,19],[13,11],[12,-4],[14,-12],[-5,-13]],[[4425,695],[-6,-1],[-29,1],[-36,-8],[-17,1],[-11,11],[0,9],[7,7],[11,6],[10,3],[18,-1],[16,-4],[13,-5],[10,-7],[13,-2],[5,-4],[-4,-6]],[[5061,842],[26,-6],[33,1],[27,7],[12,0],[3,-7],[-6,-3],[-26,-8],[-46,-10],[-11,2],[-54,21],[-21,13],[-9,11],[18,-1],[54,-20]],[[4230,875],[36,-1],[20,1],[19,-1],[11,-3],[23,-8],[12,-1],[20,-7],[24,-31],[16,-8],[19,2],[17,9],[20,5],[46,-12],[24,-1],[44,1],[22,-4],[19,-8],[7,-10],[-9,-13],[-10,-3],[-10,0],[-9,-2],[-3,-8],[1,-10],[-4,0],[-39,-3],[-8,-1],[-10,-5],[-29,-19],[-10,-3],[-12,0],[-11,3],[-9,5],[-9,8],[-1,7],[1,6],[-1,5],[-25,16],[-40,-1],[-84,-22],[-21,-8],[-7,-2],[-9,1],[-6,3],[-13,11],[-5,2],[-43,5],[-9,-2],[-37,-15],[-21,-5],[-9,-1],[-12,2],[-5,3],[-1,4],[0,3],[-2,3],[-6,2],[-13,2],[-5,2],[-16,13],[-5,12],[5,10],[13,13],[17,9],[39,10],[29,12],[22,1],[10,3],[23,19],[9,4],[10,1]],[[3730,961],[-14,0],[-41,4],[-12,3],[-6,6],[3,5],[10,2],[14,1],[7,3],[9,6],[6,8],[3,6],[3,4],[15,14],[6,13],[7,6],[10,4],[10,2],[7,-3],[5,-6],[4,-5],[1,-6],[-1,-12],[-22,-41],[-6,-6],[-7,-5],[-11,-3]],[[5833,4189],[-7,-5],[-7,-8],[-9,-7],[-12,-5],[-16,-5],[-11,-5],[-11,-15],[-7,-6],[-27,-4],[-39,-1],[-69,4],[-8,-9],[-7,-23],[-12,-24],[-27,-15],[-78,-11],[-40,-3],[-39,0]],[[5407,4047],[-5,7],[1,4],[4,5],[2,6],[1,11],[-1,5],[-3,4],[-5,2],[-5,1],[-3,1],[-2,3],[0,2],[2,2],[3,3],[3,5],[-3,2],[-6,1],[-4,3],[-8,10],[-21,13],[-8,8],[1,6],[10,21],[3,2],[11,4],[2,3],[-2,2],[-9,7],[-3,3],[-1,8],[4,5],[4,6],[3,5],[-2,11],[-5,10],[-2,11],[4,10],[15,14],[8,11],[-2,11],[-17,16],[-20,10],[-52,13],[-42,18],[-27,4],[-29,1],[-27,-2],[-28,-7],[-44,-20],[-33,-8]],[[5069,4320],[1,1],[2,5],[10,8],[12,7],[8,4],[4,5],[2,12],[1,13],[-4,6],[4,9],[5,5],[9,3],[15,0],[7,3],[13,11],[7,3],[7,1],[6,3],[5,1],[9,-3],[5,-3],[4,-4],[4,-3],[36,-6],[11,-4],[24,-18],[20,-11],[22,-9],[25,-6],[114,-15],[38,-9],[36,-14],[23,-12],[14,-3],[43,-2],[11,-4],[42,-35],[13,-7],[14,-3],[11,-5],[49,-28],[62,-14],[16,-7],[4,-6]],[[5407,4047],[10,-12],[1,-15],[-1,-15],[2,-15],[7,-13],[9,-11],[14,-9],[20,-9]],[[5469,3948],[56,-30],[26,-18],[12,-16],[-13,-32],[-6,-3],[-17,-6],[-6,-4],[-3,-6],[2,-11],[-3,-6],[-9,-6],[-25,-10],[-10,-6],[-14,-13],[-24,-29],[-17,-27],[-13,-12],[-15,-11],[-16,-10],[-25,-10],[-50,-18],[-21,-12],[-21,-20],[-11,-18],[-10,-43],[-9,-27],[4,-11],[20,-7],[4,-1]],[[5255,3525],[-18,-9],[-35,-10],[-33,2],[-21,21],[3,25],[41,45],[13,26],[0,13],[-7,38],[-6,9],[-29,18],[-8,13],[3,11],[15,18],[6,19],[19,31],[69,68],[9,28],[0,103],[-3,13],[-7,14],[-2,14],[8,12],[12,11],[5,13],[8,71],[2,3],[5,4],[5,4],[23,99],[-6,22],[-18,18],[-25,6],[-32,1],[-39,4],[-35,8],[-17,3],[-22,1],[-39,-1],[-18,2],[-12,4]],[[4730,4366],[-9,-5],[-23,-6],[-23,0],[-17,2],[-11,3],[-6,1],[-5,1],[-4,3],[-5,-1],[-9,-3],[-5,2],[3,5],[10,7],[18,4],[11,1],[21,-1],[38,-7],[16,-6]],[[4602,4461],[-19,-1],[-12,6],[-8,10],[-4,10],[1,4],[6,13],[-3,6],[-6,4],[-3,4],[5,6],[-2,5],[0,1],[9,-2],[40,-29],[7,-10],[4,-10],[-3,-10],[-12,-7]],[[6344,4173],[-20,-27],[-24,-19],[-2,-26],[-10,-9],[-28,-14],[-15,-6],[-21,-2],[-19,-5],[-6,-10],[3,-11],[8,-11],[-39,-4],[-18,-4],[-15,-9],[-1,-5],[1,-20],[0,-8],[-9,-10],[-16,-3],[-19,1],[-18,4],[-6,-1],[-31,-7],[-9,17],[-38,2],[-79,-7],[-29,6],[-28,6],[-28,5],[-27,-2],[-3,-11],[-8,-7],[-12,-6],[-18,-4],[-17,-2],[-15,2],[-16,2],[-19,2],[-14,-1],[-28,-3],[-14,2],[-62,16],[-28,0],[-28,-9],[-50,-27]],[[5833,4189],[3,-3],[3,-11],[7,-9],[19,-5],[6,1],[13,6],[14,4],[0,5],[-4,6],[-1,3],[5,10],[6,2],[14,-5],[13,-9],[6,-2],[12,0],[-10,8],[1,3],[8,3],[8,3],[21,13],[3,6],[-4,1],[-2,3],[-3,2],[31,1],[40,-1],[38,-4],[25,-9],[9,-9],[6,-9],[6,-8],[12,-3],[14,-1],[46,-11],[-52,-22],[-19,-13],[0,-11],[26,-6],[28,8],[28,12],[27,6],[28,4],[37,18],[43,7]],[[5857,3708],[-85,23],[-44,-17],[-19,-52]],[[5709,3662],[-22,0],[-88,-8],[-9,-2],[-14,-6],[-5,-1],[-36,1],[-11,-1],[-11,-3],[-14,-7],[-10,-2],[-11,0],[-12,2],[-11,0],[-12,-5],[-43,-20],[-12,-4],[-10,-1],[-11,0],[-13,-1],[-28,-13],[-64,-62],[-7,-4]],[[6344,4173],[4,1],[29,11],[26,15],[15,16],[7,0],[1,-37],[-8,-9],[-8,-2],[-12,-1],[-11,-2],[-5,-4],[1,-6],[6,-3],[10,0],[12,1],[-10,-10],[8,-1],[23,2],[4,-8],[-5,-8],[-9,-9],[-4,-10],[4,-17],[-1,-9],[-11,-11],[0,-3],[-2,-3],[-19,-1],[-4,-3],[0,-4],[-3,-5],[2,-1],[-2,-16],[-1,0],[-6,-12],[-2,-10],[2,-22],[3,-5],[8,-3],[7,-4],[3,-8],[-5,-9],[-20,-9],[-4,-9],[-23,6],[-26,4],[-20,-3],[-13,-33],[-14,-11],[-20,-8],[-25,-5],[6,-8],[-5,-5],[-23,-8],[2,6],[-1,6],[-4,4],[-9,1],[-6,-3],[-3,-13],[-6,-5],[-10,-2],[-7,2],[-8,3],[-10,1],[-6,-1],[-23,-11],[0,8],[-24,-7],[-28,-11],[-24,-14],[-9,-12],[5,-19],[10,-15],[3,-15],[-11,-19],[-26,-20],[-18,-10],[-16,-3],[-10,1],[-18,5],[-8,2],[-8,-2],[-20,-6],[-12,-2],[-13,-3],[-13,-5],[-16,-7]],[[5956,3691],[28,-24],[-1,-33],[-16,-33],[-36,-49],[-23,-21],[-31,-16],[-41,-7],[11,17],[-11,-1],[-17,-7],[-8,-5],[-6,-2],[-18,-8],[-11,-2],[-6,2],[-5,6],[-7,13],[-1,2],[2,8],[-1,2],[-5,2],[-13,1],[-3,1],[-4,2],[-10,6],[-3,6],[13,3],[12,0],[10,0],[7,3],[3,7],[3,5],[18,5],[7,5],[-19,2],[-8,10],[2,13],[8,10],[12,9],[16,18],[11,9],[17,4],[18,3],[16,4],[10,23],[12,8],[14,7],[12,9],[31,-13],[11,-4]],[[1624,1450],[8,-5],[13,-14],[-7,-4],[-18,5],[0,-7],[11,-14],[-13,-5],[-16,0],[-27,5],[-33,2],[-10,4],[-7,10],[-1,8],[4,5],[10,4],[16,4],[19,-2],[12,2],[11,3],[13,1],[15,-2]],[[130,2049],[2,-4],[9,-7],[-4,-5],[-11,-3],[-5,-3],[1,-10],[11,-22],[2,-12],[-1,-3],[-5,-6],[-1,-2],[-1,-11],[1,-1],[7,-4],[1,-3],[-4,-1],[-2,-1],[-8,-4],[-1,-2],[-5,-6],[-12,-8],[-16,-7],[-17,-1],[11,-11],[-8,-4],[-17,1],[-15,5],[6,10],[-5,9],[-21,19],[-21,31],[-1,3],[7,82],[11,-4],[3,-6],[1,-6],[6,-5],[15,0],[6,8],[3,9],[8,4],[47,5],[18,0],[10,-7],[-5,-12],[0,-5]],[[88,2078],[-10,-6],[-10,6],[-5,6],[-7,6],[-14,3],[33,16],[19,4],[13,-7],[10,-19],[0,-4],[-9,-3],[-10,-1],[-10,-1]],[[260,2125],[-22,-3],[-24,4],[-10,8],[3,6],[13,-1],[23,-1],[16,-6],[1,-7]],[[172,2165],[-11,-3],[-24,1],[-6,5],[-3,12],[6,3],[17,-1],[17,-6],[8,-6],[-4,-5]],[[376,2228],[1,-1],[3,0],[3,0],[31,-12],[0,-17],[-6,-19],[11,-15],[-9,-7],[-9,-7],[-11,-2],[-14,4],[-30,-9],[-11,14],[-3,21],[-6,15],[7,9],[3,18],[5,7],[9,-3],[9,0],[9,2],[8,4],[0,-2]],[[291,2227],[7,-5],[11,4],[7,0],[4,-5],[0,-7],[-22,-11],[-29,-11],[-26,-2],[-9,16],[9,7],[55,26],[-2,-8],[-1,-2],[-4,-2]],[[3109,2565],[1,-2],[-2,0],[1,2]],[[3121,2566],[-2,0],[-1,2],[4,-1],[-1,-1]],[[3115,2570],[0,-1],[1,1],[0,-1],[-1,-1],[-1,1],[0,-1],[-1,1],[2,1]],[[3118,2573],[0,-1],[0,-1],[-1,0],[-1,1],[2,1]],[[1520,2765],[0,-2],[-1,7],[3,3],[1,9],[5,6],[6,-1],[6,-5],[5,-2],[4,-10],[-13,-5],[-16,0]],[[4417,2992],[-13,-4],[3,5],[10,13],[5,2],[11,3],[6,6],[6,7],[8,6],[0,-4],[-2,-2],[-2,-1],[-2,-2],[5,-2],[0,-2],[-23,-18],[-12,-7]],[[1477,3037],[265,-83]],[[1742,2954],[-48,-45],[-36,-21],[-5,-6],[-5,-11],[-11,-12],[-40,-31],[-6,-2],[-39,-15],[-9,-2],[-16,-5],[-52,-32],[-16,-17],[-11,-6],[-19,-2],[-42,0],[-11,-2],[-24,-8],[-12,-3],[-63,-1],[-18,-5],[-8,-3],[-28,-8],[-5,-2],[-5,-19],[-15,-16],[-1,-3],[2,-6],[-1,-3],[-4,-1],[-7,0],[-7,-1],[-3,-5],[-3,-11],[-9,-14],[-23,-27],[-46,-39],[-14,-6],[-93,-29],[-73,-34],[-69,-43],[-19,-8],[-23,-3],[-22,-2],[-14,-3],[-13,-4],[-19,-4],[-21,0],[-60,4],[-24,-6],[-9,-14],[1,-25],[-8,-13],[-28,-22],[-6,-13],[-5,-7],[-10,-3],[-10,-1],[-4,3],[-5,5],[-13,1],[-96,-17],[-35,-9],[-28,-12],[-3,-3],[-8,-11],[-3,-2],[-36,-7],[-6,-10],[-15,-8],[-28,-12],[-25,-18],[-8,2],[-3,17],[3,7],[9,12],[6,13],[6,5],[8,4],[4,3],[1,6],[-2,13],[1,9],[-1,6],[1,4],[3,3],[9,3],[6,15],[9,12],[22,20],[-2,1],[-4,12],[16,-3],[7,9],[5,13],[10,6],[12,3],[15,8],[16,9],[11,9],[-15,0],[22,20],[17,9],[43,8],[18,8],[16,11],[72,66],[24,16],[82,40],[18,18],[8,13],[8,9],[14,5],[24,2],[13,6],[8,2],[3,-6],[4,-4],[11,-1],[11,1],[10,2],[12,5],[6,5],[13,21],[2,1],[6,3],[3,5],[-2,4],[-5,6],[13,7],[41,15],[14,3],[17,7],[25,28],[15,7],[42,-4],[22,1],[24,6],[-2,-7],[2,-6],[5,-4],[9,-3],[13,6],[10,6],[20,17],[10,6],[75,28],[7,3],[1,6],[-4,13],[3,7],[15,7],[24,7],[22,8],[24,34],[63,26],[22,21],[29,15],[7,4],[2,3],[5,3],[5,4],[2,7],[-1,13],[4,6],[11,8],[12,-3],[11,2]],[[2282,3602],[0,-3],[2,-1],[-1,-2],[7,-1],[4,2],[1,3],[5,-3],[8,-1],[4,-3],[7,0],[4,-1],[-1,-2],[-6,-2],[-6,0],[-4,1],[-1,3],[-10,1],[-10,-3],[-5,1],[-4,0],[-10,-5],[-8,-4],[-6,2],[-1,0],[-2,-1],[-1,-2],[-3,0],[4,5],[-2,5],[6,1],[-4,3],[-4,1],[-5,1],[-1,3],[8,5],[2,-4],[12,2],[5,-3],[11,6],[5,1],[0,-5]],[[3141,3583],[0,-4],[3,-6],[-9,-5],[-17,-2],[-18,4],[-1,-4],[-3,-3],[-2,-2],[-2,-3],[-25,20],[-10,5],[3,-12],[6,-12],[3,-12],[-6,-10],[-8,-1],[-12,1],[-11,0],[-4,-6],[-4,-4],[-9,-1],[-19,-1],[-15,-3],[-15,-4],[-15,-2],[-19,7],[-8,9],[-3,13],[1,25],[-13,-3],[-9,2],[-5,4],[2,2],[42,18],[11,8],[24,25],[9,6],[6,3],[7,2],[10,-1],[32,-11],[30,-8],[32,-5],[24,-5],[27,-9],[12,-10],[-22,-5]],[[4276,3745],[-26,-3],[-28,1],[-18,9],[8,18],[7,4],[36,12],[20,11],[7,1],[2,-9],[0,-13],[-15,-20],[7,-11]],[[4138,3838],[-10,-2],[-9,10],[18,5],[6,-4],[4,-6],[-9,-3]],[[2429,3861],[-4,-3],[0,-3],[3,-4],[-8,-3],[-4,-5],[2,-3],[6,-4],[1,-5],[3,-3],[-12,-5],[-5,3],[-5,2],[-4,2],[-4,-1],[-3,3],[-1,5],[-1,3],[-5,2],[3,6],[6,3],[0,1],[-4,1],[-1,3],[1,4],[0,4],[9,0],[5,-1],[1,-3],[3,3],[3,2],[9,0],[6,-4]],[[2877,3858],[-4,0],[-8,8],[-1,2],[5,2],[4,0],[10,-4],[3,-3],[-9,-5]],[[2817,3875],[-6,-4],[-2,14],[8,4],[0,2],[1,2],[3,3],[4,1],[4,-3],[4,-3],[-2,-6],[-1,-2],[-3,-2],[-10,-6]],[[2788,3870],[-1,-8],[-7,0],[-6,2],[-7,0],[-8,-3],[-8,-3],[-5,9],[-12,7],[-12,3],[-6,3],[-3,23],[3,9],[42,-10],[12,-7],[8,-7],[6,-9],[4,-9]],[[2835,3916],[2,-2],[-1,-3],[-2,-3],[-1,-3],[-5,-2],[-9,-1],[-4,-3],[2,5],[4,4],[-1,1],[0,4],[-3,2],[-4,0],[-1,1],[-2,2],[-4,4],[-2,3],[1,3],[4,0],[8,1],[7,0],[3,-1],[3,-1],[1,-3],[-1,-6],[5,-2]],[[4152,3935],[-9,-2],[-13,2],[-8,4],[-3,4],[3,5],[37,9],[7,0],[5,-5],[-2,-5],[-17,-12]],[[2771,3963],[-5,-5],[-19,-10],[-21,-9],[-6,-2],[-14,3],[-3,8],[3,8],[3,5],[3,0],[18,5],[5,2],[2,3],[5,2],[9,1],[16,-6],[4,-5]],[[2482,3991],[10,-5],[5,0],[5,4],[3,-2],[-2,-6],[1,-3],[2,-1],[3,-7],[-8,3],[-7,1],[-7,4],[-10,0],[-7,3],[-3,3],[0,4],[3,0],[3,1],[0,2],[-2,2],[1,2],[-1,5],[7,1],[3,-4],[1,-7]],[[3869,4040],[3,-4],[-2,-4],[-4,-1],[-8,-3],[-6,3],[1,4],[2,1],[-5,2],[-3,-2],[-3,2],[2,3],[10,6],[8,0],[6,-1],[-1,-6]],[[2833,4045],[0,-4],[-4,-8],[-4,-3],[-2,-3],[-6,-4],[-3,-11],[-13,6],[-2,4],[-2,3],[-3,6],[2,9],[8,2],[9,-1],[6,4],[0,3],[9,3],[4,0],[1,-6]],[[3243,4090],[9,-3],[5,1],[9,-4],[-2,-5],[-3,-6],[-17,2],[-2,7],[4,3],[-3,2],[-8,0],[-3,0],[-1,2],[12,1]],[[2319,3279],[-116,66],[6,24],[-100,59]],[[2109,3428],[17,3],[16,2],[-3,10],[8,8],[4,6],[-16,5],[-10,-2],[-13,-5],[-12,-1],[-8,8],[3,7],[11,9],[12,9],[10,4],[17,1],[17,-1],[16,-4],[13,-4],[7,8],[0,6],[5,5],[24,2],[-8,8],[-9,4],[-6,4],[1,9],[6,3],[20,5],[10,4],[-2,-6],[-2,-3],[-3,-3],[5,-8],[9,-36],[8,-4],[18,6],[30,17],[11,13],[4,4],[7,2],[10,1],[8,3],[10,13],[35,5],[15,9],[-10,7],[-13,7],[-9,7],[4,8],[19,-5],[22,6],[19,10],[10,10],[27,81],[-3,7],[-13,9],[-4,4],[-4,5],[-5,4],[-8,2],[-7,-2],[-11,-6],[-7,0],[-11,6],[-4,8],[1,17],[-5,8],[-13,7],[-17,5],[-15,3],[31,22],[5,2],[-9,7],[-13,4],[-8,5],[9,10],[-16,5],[10,6],[16,-1],[4,-15],[7,0],[1,3],[6,6],[4,-5],[5,-3],[6,0],[6,4],[7,0],[-4,-8],[-3,-2],[-7,-3],[14,-16],[-21,0],[7,-7],[11,-2],[13,1],[12,3],[-7,-12],[4,-6],[11,-5],[13,-10],[7,0],[0,5],[7,0],[5,-12],[17,-6],[19,-5],[9,-9],[3,-6],[7,-4],[8,0],[7,5],[7,-5],[8,-6],[6,-7],[2,-5],[4,-3],[12,0],[11,3],[2,5],[-4,6],[-6,5],[-14,19],[-7,4],[5,8],[8,9],[5,4],[-7,6],[-16,7],[-17,5],[-14,2],[-17,0],[-19,2],[-15,6],[-9,13],[2,6],[11,12],[1,3],[-9,1],[-14,-1],[-14,0],[-6,6],[1,35],[7,9],[0,4],[7,0],[2,-7],[6,-4],[8,-2],[12,0],[-8,14],[-26,25],[-1,15],[9,8],[13,-8],[16,-14],[15,-6],[10,-2],[10,-2],[9,0],[10,4],[4,7],[0,16],[13,17],[-6,7],[-9,4],[-2,-1],[-17,12],[-7,7],[-4,10],[13,-1],[13,7],[11,10],[5,9],[0,13],[-9,29],[6,10],[4,3],[4,2],[1,3],[1,4],[3,3],[7,0],[5,-2],[-1,-3],[17,10],[9,7],[3,6],[3,17],[4,9],[7,6],[12,1],[7,-6],[4,-9],[2,-8],[0,-10],[1,-4],[3,-7],[4,-6],[7,-6],[10,-4],[3,3],[6,2],[5,3],[15,-22],[2,-24],[-8,-25],[-16,-25],[-26,-25],[-4,-12],[12,-14],[26,-14],[9,-8],[11,-26],[-2,-5],[-12,-4],[-22,7],[-14,3],[-7,-3],[-12,-18],[-2,-7],[2,-8],[4,-13],[1,-7],[-1,-5],[-5,-12],[-1,-7],[3,-7],[9,-9],[4,-13],[4,-6],[8,-5],[11,-2],[13,1],[9,3],[5,3],[5,2],[13,1],[4,1],[4,2],[10,-8],[-1,-8],[-6,-9],[-3,-7],[7,-19],[0,-22],[-4,-13],[-6,-8],[1,-6],[16,-4],[21,1],[15,5],[13,-1],[15,-14],[-10,2],[-8,1],[-9,-1],[-8,-2],[5,-5],[3,-3],[0,-4],[-1,-4],[14,-8],[8,-25],[10,-11],[43,-12],[12,-9],[-16,-15],[-8,-2],[-25,-3],[-10,-3],[-21,-19],[-9,-3],[-48,-24],[-18,-15],[-13,-4],[-22,-2],[-43,0],[-12,1],[-17,4],[-10,0],[-14,-3],[-31,-12],[-22,-2],[-20,-4],[-23,-9],[-73,-41],[-29,-24],[-21,-26],[-17,-58],[-26,-17]],[[4022,4111],[-7,-4],[-10,9],[-3,6],[4,2],[5,1],[1,-3],[4,-1],[8,-4],[-2,-6]],[[3330,4118],[-6,-2],[8,15],[11,3],[6,-4],[6,-5],[-13,0],[-4,-1],[-4,-4],[-4,-2]],[[3023,4144],[-7,-24],[-17,-22],[-21,-16],[-11,6],[-2,7],[5,8],[8,8],[-13,0],[-17,4],[-9,0],[-6,-7],[-7,-6],[-12,-3],[-1,3],[-7,5],[-8,6],[-8,2],[-12,3],[-6,12],[-15,2],[13,11],[13,-6],[15,-11],[16,-6],[10,4],[4,11],[1,18],[8,-6],[10,-10],[10,-5],[6,6],[5,1],[6,-2],[4,-5],[8,9],[4,9],[-3,8],[-16,3],[12,5],[11,3],[11,0],[9,-4],[9,-21]],[[3347,4324],[7,-9],[0,-4],[-4,-2],[-4,0],[-5,-1],[-8,-2],[-7,-2],[-20,5],[-8,0],[-3,3],[-5,8],[-1,3],[2,2],[9,-6],[7,1],[4,-1],[4,0],[3,0],[7,-4],[7,1],[3,0],[-2,5],[-6,6],[-1,1],[9,0],[5,-1],[7,-3]],[[3439,4353],[-11,-5],[-13,12],[-18,30],[-36,38],[11,1],[47,11],[9,0],[9,-2],[6,-4],[2,-5],[1,-12],[-2,-2],[-11,-1],[-5,-1],[-4,-4],[2,-4],[4,-4],[2,-3],[-7,-16],[-1,-6],[3,-6],[11,-12],[1,-5]],[[3114,4423],[-5,-6],[18,-2],[46,0],[11,-1],[0,-3],[-6,-3],[-24,-3],[5,-4],[12,-5],[6,-1],[28,-14],[22,-3],[10,-3],[-7,-1],[-27,-3],[-2,-6],[4,-8],[-14,-9],[0,-3],[5,-1],[9,-4],[0,5],[10,-3],[8,-3],[7,-4],[4,-3],[-21,-14],[-8,-3],[15,-12],[-20,-20],[-34,-16],[-31,-2],[-18,-9],[-13,9],[-4,18],[6,16],[14,-6],[4,-3],[3,-4],[8,0],[-2,9],[-2,3],[-4,5],[14,8],[11,8],[4,9],[-7,8],[-8,-4],[-5,0],[-9,4],[-5,-13],[-13,-6],[-16,1],[-15,5],[-9,8],[-9,17],[-11,5],[6,2],[9,5],[7,1],[-11,10],[-27,15],[-12,9],[-7,8],[-14,29],[9,-1],[5,-2],[5,-1],[9,0],[-2,-1],[3,-2],[6,-1],[4,-1],[3,2],[1,3],[-1,3],[-3,1],[1,5],[13,9],[15,2],[10,-12],[36,-13]],[[3016,4446],[-10,-3],[-5,1],[-5,-2],[-11,-11],[-10,-5],[-3,-1],[-4,-2],[-4,-1],[3,5],[3,5],[11,7],[14,9],[14,1],[7,-3]],[[3083,4633],[2,-5],[15,-3],[40,-3],[16,-3],[17,-6],[29,-13],[24,-15],[8,-3],[8,-2],[18,0],[9,-3],[-11,-1],[-7,-3],[-3,-5],[1,-7],[23,0],[55,-25],[27,-8],[2,6],[7,4],[9,0],[11,-2],[0,57],[6,-1],[14,-10],[8,-10],[2,-9],[-1,-17],[6,-6],[15,1],[14,1],[6,-11],[4,2],[1,0],[1,0],[2,3],[31,-17],[13,-10],[6,-8],[-3,-9],[-7,-3],[-10,-2],[-9,-5],[-5,-8],[5,-3],[8,1],[6,6],[5,-1],[1,0],[0,-2],[1,-2],[8,5],[5,-9],[-4,-5],[-10,-4],[-13,-3],[-14,-2],[-7,1],[-5,3],[-10,2],[-17,1],[-13,-4],[-11,-4],[-15,-2],[-14,3],[-11,6],[-12,4],[-13,-4],[-2,10],[-13,2],[-18,1],[-16,4],[-8,-5],[7,-7],[0,-7],[-4,-6],[-3,-9],[-9,3],[-4,0],[-4,-2],[-4,-5],[-6,0],[-15,16],[-12,5],[-45,-4],[-18,3],[-21,6],[-17,9],[-14,18],[-30,20],[-6,12],[0,9],[-2,8],[-5,6],[-11,6],[-7,7],[-2,8],[-4,9],[-12,8],[-12,-6],[-10,-7],[-9,-8],[-4,-9],[-14,5],[3,5],[10,5],[8,6],[2,8],[0,6],[-2,9],[5,12],[14,5],[18,3],[20,8],[-26,0],[-10,-1],[-7,-4],[-3,24],[7,9],[25,0],[18,-4],[7,-10],[1,-9]],[[5868,4630],[-14,-2],[-5,1],[-16,13],[-9,3],[-21,4],[-10,3],[-25,25],[-18,12],[-24,5],[-24,2],[-20,5],[-14,7],[-10,11],[0,22],[23,12],[38,6],[117,0],[39,-5],[12,-3],[5,-4],[7,-13],[6,-8],[8,-8],[19,-14],[-1,-8],[-17,-44],[-11,-7],[-17,-8],[-18,-7]],[[5541,4764],[-31,-16],[-17,11],[-9,11],[-3,11],[0,13],[-1,2],[-3,3],[-2,3],[0,4],[2,3],[8,2],[4,3],[7,13],[5,5],[9,4],[0,-9],[18,-19],[15,-22],[-2,-22]],[[5382,4844],[-5,-3],[-16,1],[-7,-3],[0,-5],[7,-34],[-5,-19],[-25,-42],[-8,-45],[-19,-43],[-31,-44],[-8,-7],[-7,-10],[12,-9],[14,-7],[-1,-9],[-14,8],[-6,-4],[-19,-10],[-4,-5],[0,-31],[-7,0],[-22,15],[-5,8],[6,10],[-28,2],[-6,10],[5,30],[10,-14],[14,-3],[13,7],[6,12],[-3,8],[-9,3],[-11,1],[-12,3],[-43,25],[-9,4],[3,22],[11,24],[12,12],[33,8],[16,18],[4,22],[0,21],[-7,35],[5,14],[24,11],[60,10],[29,8],[11,15],[31,-5],[11,-6],[0,-9]],[[4911,5037],[14,-2],[4,0],[8,-5],[6,-6],[-3,-6],[-5,-3],[-4,-1],[-3,-1],[2,-2],[3,-3],[-4,-2],[-7,0],[-5,3],[-3,0],[-5,0],[-7,6],[-8,3],[-2,3],[-1,7],[7,7],[13,2]],[[7507,5175],[-13,-3],[-36,5],[-14,3],[-13,1],[-23,1],[-16,2],[-30,7],[-4,4],[20,4],[30,6],[10,3],[16,1],[41,-7],[20,-6],[12,-10],[0,-11]],[[7252,5241],[25,-7],[8,2],[8,2],[14,-1],[1,0],[1,-1],[8,-5],[7,-2],[6,2],[0,2],[1,3],[9,0],[9,-1],[13,-2],[16,-4],[1,-2],[1,-2],[-14,-4],[-6,-1],[-5,-4],[-6,-6],[-11,-6],[-7,-1],[-14,-1],[-9,1],[-20,2],[-22,5],[-19,1],[-20,4],[-18,9],[-8,8],[1,5],[-2,3],[0,2],[1,1],[1,0],[50,-2]],[[7170,5206],[-11,0],[-10,10],[-6,3],[-12,12],[-2,7],[5,11],[2,11],[-4,8],[-11,8],[4,3],[9,3],[10,0],[43,-8],[6,-3],[8,-2],[9,-2],[0,-6],[-28,-16],[-5,-12],[6,-9],[7,-7],[-1,-5],[-19,-6]],[[7104,5298],[8,-5],[5,1],[11,-1],[2,-3],[-11,-7],[-12,-2],[-22,8],[-27,16],[-4,7],[16,-3],[18,-4],[16,-7]],[[7223,5139],[-11,-14],[-7,-14],[-10,-11],[-25,-4],[-36,-3],[-62,-7],[-37,2],[-36,5],[-32,2],[-32,-1],[-108,-16],[-34,-10],[-23,-16],[-1,-1]],[[6769,5051],[-9,7],[-20,6],[-19,21],[-9,4],[-23,2],[-18,2],[-17,1],[-24,-5],[-33,-11],[-21,-4],[-9,5],[-5,10],[-9,11],[-3,10],[10,8],[-16,22],[27,47],[-4,23],[-9,5]],[[6558,5215],[8,4],[152,78],[9,-1],[9,-4],[19,-3],[6,1],[4,3],[3,4],[4,1],[43,-7],[13,-2],[12,0],[14,7],[12,13],[5,14],[-3,14],[-8,14],[-10,6],[-14,4],[-12,5],[-5,8],[7,9],[15,4],[19,2],[10,-1]],[[6870,5388],[5,-3],[7,-4],[64,-19],[13,-10],[26,-26],[4,-2],[14,-5],[3,-3],[0,-7],[1,-5],[5,-17],[13,-13],[16,-10],[19,-4],[18,-6],[11,-13],[17,-27],[4,11],[11,-3],[12,-8],[8,-8],[-69,2],[-22,-5],[-9,-16],[-2,-10],[-5,-8],[-3,-8],[4,-10],[17,-17],[-2,-7],[-23,-4],[0,-5],[5,-4],[-1,-3],[-4,-5],[22,-7],[9,-1],[12,0],[11,2],[15,8],[6,2],[39,29],[5,6],[5,5],[6,4],[12,2],[12,-2],[11,-9],[10,-2],[10,0],[8,-2],[3,-2]],[[6306,5566],[-7,3],[-12,10],[-19,21],[-15,11],[-52,26],[-10,7],[-7,5],[-8,4],[-15,3],[-96,14]],[[6065,5670],[-348,96],[-21,2],[-25,-4],[-16,-5],[-16,-8],[-29,-16],[-20,-8],[-28,-6],[-21,2],[0,9],[0,1]],[[5541,5733],[9,2],[17,8],[11,11],[3,14],[-4,4],[-15,12],[-2,4],[3,8],[7,4],[7,0],[4,-7],[7,0],[2,5],[-1,5],[-3,4],[-5,2],[19,0],[11,4],[-1,7],[-11,8],[1,5],[15,19],[8,7],[6,-8],[9,2],[9,9],[4,9],[16,-4],[14,4],[13,8],[14,5],[13,1],[11,-4],[26,-10],[-5,3],[-10,10],[24,2],[49,-12],[27,-3],[-3,-8],[6,-6],[10,-1],[9,7],[3,-9],[9,-6],[10,-1],[6,8],[29,-2],[13,-2],[-17,15],[-3,14],[9,7],[18,-7],[7,4],[8,-10],[10,-8],[14,-2],[19,12],[4,-4],[6,-3],[6,-1],[16,-1],[1,-2],[-1,-3],[3,-3],[16,-11],[8,-1],[15,-1],[30,-3],[20,-8],[32,-22],[1,-3],[-2,-4],[0,-4],[4,-1],[14,0],[5,-2],[6,-2],[24,-21],[12,-5],[38,-25],[10,-8],[10,4],[11,-2],[10,-6],[5,-8],[-3,-10],[-8,-7],[-6,-9],[3,-12],[21,-12],[25,-9],[4,0],[3,-9],[-3,-28],[7,-16],[-1,-5],[-6,-5],[-7,-2],[-8,-1],[-7,-4],[-5,-7],[-7,-24]],[[6930,5660],[7,-5],[5,-2],[6,-1],[6,-7],[-7,-8],[-50,-18],[-4,2],[-3,2],[-3,0],[-3,0],[-4,0],[-3,5],[-1,6],[-3,5],[-2,3],[8,8],[3,1],[1,-4],[2,-2],[4,1],[4,-2],[3,-2],[1,1],[1,4],[4,3],[6,0],[5,1],[6,0],[4,-1],[3,-2],[2,-3],[3,1],[-1,3],[-1,2],[-7,6],[-1,-1],[-4,0],[-2,3],[1,4],[4,0],[10,-3]],[[6558,5215],[-8,6],[-39,15],[-16,12],[-4,5],[-5,9],[-5,6],[-28,17],[6,17],[-9,20],[-20,18],[-23,7],[-30,5],[-54,20],[-30,4],[-17,1],[-24,6],[-16,1],[-10,3],[-25,14],[-64,26],[-13,3],[-14,5],[-32,22],[-14,7],[49,25],[-50,32],[-26,13],[-31,9],[0,-4],[-6,4],[6,4],[13,0],[-5,5],[-14,7],[-15,5],[-40,4],[-10,4],[-12,-7],[-13,-1],[-13,4],[-11,8],[2,3],[7,3],[5,4],[-4,5],[-31,18],[-13,4],[-14,3],[-13,1],[-4,4],[-3,8],[-5,6],[-13,-5],[-2,4]],[[5798,5634],[3,2],[56,16],[145,9],[63,9]],[[6306,5566],[-2,-7],[3,-21],[17,-12],[23,-9],[20,-12],[8,0],[22,7],[25,1],[56,-3],[10,1],[32,7],[11,4],[37,24],[6,7],[2,4],[3,4],[2,4],[-7,8],[-12,22],[-16,13],[-1,9],[35,15],[4,2],[8,4],[6,8],[4,9],[1,8],[-11,-6],[-13,-19],[-9,-4],[-14,0],[-10,1],[-48,17],[-12,7],[-5,11],[10,4],[18,4],[10,4],[-16,6],[20,5],[3,7],[-9,15],[9,3],[21,-4],[34,-9],[0,4],[-4,2],[-10,7],[30,-1],[6,1],[-1,4],[-8,10],[5,3],[14,-4],[8,-9],[9,-21],[-17,-3],[-4,-7],[5,-7],[6,-2],[18,10],[9,3],[12,2],[-5,-4],[-10,-13],[11,3],[4,1],[6,-4],[-4,-11],[21,-17],[-9,-9],[7,-6],[5,-6],[2,-6],[0,-8],[7,0],[6,8],[8,6],[7,7],[1,13],[20,-3],[14,-4],[9,-6],[6,-12],[48,3],[77,-17],[71,-8],[31,30],[23,-22],[32,-20],[40,-16],[75,-19],[3,-2],[1,-2],[3,-2],[13,-2],[25,0],[12,-2],[7,-4],[14,-17],[18,-10],[4,-6],[-7,-9],[-18,8],[-6,4],[-5,5],[-7,0],[-1,-3],[-6,-5],[-15,4],[-18,2],[-34,2],[-10,-5],[-14,-12],[-19,-11],[-21,-5],[-19,2],[-38,11],[-56,5],[-23,0],[-10,-4],[-9,-5],[-22,5],[-24,7],[-16,4],[-18,-4],[-11,-8],[-33,-51],[-2,-12],[9,-1],[4,-2],[-2,-4],[-3,-2],[-1,-4],[0,-6],[3,-7],[7,-2],[9,2],[10,5],[34,-26]],[[6400,5443],[98,-31],[139,31],[-78,27],[-69,-10],[-90,-17]],[[7723,5597],[0,-5],[-15,-5],[-14,-7],[14,-4],[6,-7],[4,-9],[5,-9],[-20,-4],[-9,0],[7,-7],[2,-5],[-3,-17],[-5,-13],[-1,-6],[18,-17],[1,-10],[-23,-4],[-21,0],[-11,-1],[-5,-4],[-1,-12],[-17,-37],[2,-9],[-16,7],[-14,12],[-13,10],[-13,-4],[-13,3],[-17,-2],[-17,-5],[-13,-6],[-8,-8],[-8,-12],[-8,-11],[-12,-5],[-19,5],[-56,29],[-31,13],[-18,4],[-22,0],[4,8],[-3,8],[-8,8],[-10,7],[-5,7],[10,7],[27,9],[26,13],[21,17],[15,21],[8,24],[-9,35],[6,9],[10,10],[-2,11],[-14,23],[-5,10],[0,5],[6,4],[8,4],[7,6],[-3,5],[-9,9],[0,9],[5,9],[8,9],[13,-10],[15,2],[21,12],[10,3],[7,1],[7,0],[8,-3],[21,-12],[18,-13],[13,-14],[9,-16],[3,-25],[10,-2],[9,-4],[13,-11],[-8,-4],[5,-4],[2,-2],[1,-3],[7,0],[15,16],[29,-7],[63,-29]],[[6623,4792],[1,-2],[-18,2],[2,-9],[16,-22],[-6,-5],[-12,-5],[-13,-7],[-5,-11],[5,-7],[12,4],[19,14],[3,1],[10,0],[4,1],[2,3],[0,5],[1,2],[-2,1],[6,7],[7,7],[4,0],[8,4],[18,1],[20,-1],[14,-4],[33,-19],[16,-8],[18,-4],[36,0],[5,-3],[12,-10],[9,-5],[9,-12],[13,-11],[16,-5],[0,-4],[-12,-1],[-8,-3],[-3,-6],[1,-7],[35,10],[16,1],[6,-9],[5,-4],[10,-1],[12,0],[9,-1],[11,-4],[8,-5],[8,-6],[65,-64],[28,-17],[-6,27],[7,10],[24,-10],[32,-18],[14,1],[11,4],[9,2],[8,-7],[0,4],[10,-12],[54,-51],[7,-2],[15,-3],[7,-3],[4,-5],[10,-20],[5,-6],[44,-32],[10,-10],[5,-10],[-17,6],[-21,19],[-19,8],[3,-7],[5,-4],[14,-10],[-12,-5],[4,-7],[21,-17],[26,-31],[3,-8],[0,-15],[-6,-16],[-1,-7],[4,-10],[9,-12],[5,-12],[-4,-10],[-14,-1],[-14,11],[-21,24],[-14,8],[-34,17],[-30,7],[-22,14],[-35,7],[-16,9],[-20,17],[-14,-4],[-18,2],[-39,10],[-24,-7],[-22,7],[-18,11],[-14,6],[4,7],[7,6],[10,3],[14,0],[-13,17],[-6,-6],[-2,-2],[-6,0],[-9,7],[-13,8],[-13,7],[-27,7],[-9,8],[2,8],[18,1],[-22,4],[-21,-1],[-14,2],[-12,24],[-13,10],[-31,19],[-15,13],[-7,3],[-30,8],[-8,3],[-18,4],[-25,-1],[-24,-5],[-15,-4],[-12,-8],[-31,-26],[-10,-16],[-8,-8],[-10,-6],[-10,-3],[-12,-1],[-6,-3],[-7,-8],[-57,-39],[-88,-46],[-22,-8],[-10,7],[2,13],[5,14],[8,12],[9,5],[12,2],[5,4],[1,6],[0,7],[2,8],[6,6],[7,6],[6,7],[-1,22],[6,12],[16,-5],[6,8],[7,7],[11,4],[16,1],[7,3],[-4,7],[-14,11],[15,6],[13,3],[8,6],[0,11],[-36,0],[-23,-1],[-20,-4],[1,4],[-1,19],[1,1],[2,1],[29,23],[4,8],[3,18],[15,31],[3,14],[-2,9],[-6,5],[-10,4],[-14,7],[-11,70],[3,8],[8,1],[10,-2],[11,-3],[15,-4],[30,-3],[16,-3],[10,-4],[7,-4],[10,-4],[9,-1],[-1,-1]],[[6925,4859],[51,-18],[9,-2],[-1,-4],[-3,-2],[-10,-2],[14,0],[12,-2],[10,-4],[7,-6],[-5,-11],[8,-12],[12,-12],[6,-9],[3,-10],[15,-19],[11,-32],[3,-3],[5,-3],[1,-6],[-3,-14],[6,-13],[2,-7],[-5,-3],[-8,2],[-8,5],[-6,6],[-2,6],[-4,5],[-31,17],[-155,133],[-3,5],[1,8],[7,0],[10,-3],[4,8],[3,12],[5,8],[9,0],[12,-6],[18,-12]],[[6464,5010],[26,-5],[20,5],[17,-5],[6,-6],[5,-7],[7,-7],[7,-30],[77,-48],[15,-26],[-36,15],[-70,56],[-22,13],[-14,6],[-39,4],[-16,6],[-78,40],[-8,8],[-4,1],[-18,11],[-3,3],[-8,1],[-4,5],[-3,5],[-3,5],[-26,10],[-64,8],[-24,15],[-6,34],[0,7],[14,6],[18,1],[14,4],[3,15],[12,-2],[14,-4],[24,-9],[10,-6],[9,-7],[16,-14],[21,-25],[25,-11],[4,-3],[3,-7],[15,-15],[3,-7],[3,-2],[15,-19],[18,-9],[25,-10]],[[7223,5139],[1,-1],[2,-5],[6,-1],[37,-5],[13,-4],[17,-8],[13,-8],[6,-7],[46,-23],[11,-4],[10,5],[21,26],[4,8],[11,3],[24,-4],[24,-6],[12,-3],[4,-11],[-3,-11],[-8,-7],[-13,4],[-12,-9],[-7,-7],[-10,-17],[-19,-22],[-3,-6],[4,-9],[15,-14],[9,-39],[0,-10],[-14,-73],[-6,-9],[-30,-12],[-6,-9],[3,-10],[5,-6],[-1,-5],[-14,-6],[5,-4],[9,-12],[-13,-2],[-17,-8],[-12,-2],[-13,-1],[-33,1],[-28,6],[-24,13],[-30,26],[2,6],[-3,1],[-7,-1],[-9,-1],[-16,10],[-21,5],[-9,10],[-8,11],[-21,23],[1,11],[4,13],[2,12],[-7,15],[-13,7],[-17,4],[-20,8],[26,0],[20,4],[15,9],[11,11],[11,-3],[16,-10],[8,-3],[10,-2],[5,0],[6,1],[11,1],[13,2],[3,5],[0,6],[5,5],[11,3],[11,-1],[10,-3],[7,-1],[17,5],[16,8],[12,11],[4,12],[-9,15],[-21,3],[-48,-4],[-18,2],[-32,9],[-17,2],[-12,-5],[-8,-12],[-6,-13],[-5,-8],[-25,-15],[-17,-7],[-24,-3],[-10,-3],[-6,-1],[-6,1],[-10,6],[-6,1],[-5,-2],[-11,-11],[-9,-3],[-4,-1],[-5,-2],[-5,-1],[-5,8],[-9,8],[11,3],[9,4],[2,4],[-11,2],[-27,-1],[-6,-2],[4,-3],[3,-5],[1,-6],[-22,12],[10,12],[17,14],[-5,2],[-8,-2],[-10,0],[-13,-2],[-5,-4],[-2,-6],[-5,-5],[-7,-6],[-1,-2],[-3,-1],[-14,1],[-17,2],[-11,2],[-7,2],[-29,19],[-12,6],[-20,6],[-11,3],[-8,1],[-9,2],[-10,5],[-7,5]],[[4317,7911],[-6,-5],[-17,-5],[-5,-4],[0,-19],[12,-16],[7,-17],[-15,-18],[-23,-9],[-55,-14],[-21,-11],[-11,-17],[-5,-39],[-10,-19],[-58,-51],[-12,-20]],[[4098,7647],[-8,-27],[-11,-10],[-24,-4]],[[4055,7606],[-40,14],[-23,4],[-17,-3],[-23,-17],[-21,-12],[-24,-2],[-33,14],[-13,12],[-4,13],[-1,13],[-7,13],[-9,3],[-28,2],[-12,2],[-8,5],[-3,6],[-5,5],[-11,2],[-29,1],[-24,8],[-15,12],[-2,18],[14,15],[22,18],[18,18],[0,17],[-13,7],[-23,5],[-26,2],[-21,-1],[-30,-4],[-10,3],[17,54],[15,25],[20,24],[23,21]],[[3709,7923],[14,17],[21,21],[24,18],[23,14],[30,9],[27,3],[26,5],[47,28],[29,12],[58,19],[29,2],[33,-1],[31,2],[21,11]],[[4122,8083],[27,-5],[17,-8],[11,-12],[10,-31],[4,-6],[9,-8],[12,-8],[8,-2],[11,1],[43,-1],[7,-3],[11,-9],[9,-9],[4,-11],[13,-51],[-1,-9]],[[5078,9484],[-12,-1],[-12,29],[-1,8],[0,4],[4,4],[18,0],[21,-8],[14,-12],[-1,-10],[-24,-13],[-7,-1]],[[5177,9533],[-20,-4],[-17,4],[-6,13],[6,10],[43,36],[2,5],[15,8],[18,6],[13,3],[10,-1],[8,-3],[5,-5],[0,-6],[-6,-5],[-36,-14],[-24,-12],[-5,-4],[3,-8],[4,-4],[4,-4],[-3,-7],[-14,-8]],[[5045,9742],[-28,-5],[-17,7],[5,17],[14,17],[19,17],[15,21],[8,6],[10,5],[11,-1],[9,-6],[5,-8],[1,-9],[-1,-9],[-2,-9],[-10,-16],[-17,-15],[-22,-12]],[[5155,9965],[-7,-1],[5,5],[2,-4]],[[5173,9997],[-5,-7],[-2,5],[4,4],[3,-2]],[[5412,7824],[-308,1],[-18,-2],[-34,-7],[-17,-2],[-121,0],[-53,-4]],[[4861,7810],[-15,7],[-17,6],[-17,5],[-18,3],[-22,7],[-18,10],[-32,24],[-72,43],[-20,17]],[[4630,7932],[-8,10],[-12,23],[-10,10],[-14,7],[-13,2],[-14,-1],[-20,3],[-23,10],[-1,11],[14,13],[20,11],[9,8],[17,28],[88,96],[15,25],[9,28],[3,28],[-9,23],[-22,19],[-185,67],[-52,14],[-106,19],[-26,11],[-7,10],[-3,10],[-4,8],[-15,4],[-14,-3],[-9,-7],[-8,-8],[-10,-6],[-20,-9],[-15,-9],[-17,-7],[-27,-6]],[[4141,8374],[17,66],[10,21],[13,10]],[[4181,8471],[24,7],[15,3],[10,0],[21,-1],[10,1],[11,3],[12,6],[12,3],[12,-2],[8,-3],[12,-2],[23,-1],[11,-2],[7,-5],[6,-5],[8,-5],[51,-14],[27,-14],[102,-29],[14,-7],[14,-6],[34,-5],[76,-29],[9,-2],[14,-1],[6,-1],[7,-4],[6,-6],[8,-5],[47,-8],[22,-16],[17,-17],[21,-10],[0,3],[-15,9],[0,13],[10,8],[15,-2],[14,-6],[186,-41],[45,-5],[22,-1],[59,5],[13,2],[55,18],[40,36],[13,6],[21,3],[8,6],[3,20],[24,43],[8,7],[48,3],[22,-1],[15,-4],[8,-9],[4,-25],[5,-10],[9,-6],[29,-14],[9,-4],[21,-16],[8,-25],[-5,-26],[-14,-25],[-19,-20],[-27,-20],[-16,-9],[-34,-13],[-35,-18],[-6,-4],[-5,-8],[0,-7],[3,-6],[3,-4],[2,-6],[0,-20],[6,-20],[0,-7],[-44,-113],[-1,-7],[4,-14],[-1,-5],[-7,-7],[0,-5],[4,-4],[14,-9],[3,-5],[1,-53],[6,-16],[23,-32]],[[4660,8640],[9,-2],[11,1],[-25,-10],[-23,-6],[-25,-3],[-91,-5],[-25,2],[-16,9],[-4,9],[5,3],[20,1],[55,10],[37,2],[29,3],[14,-1],[14,-6],[7,-5],[8,-2]],[[5180,8711],[4,-6],[7,-4],[13,-6],[7,-8],[-2,-8],[-27,-6],[-21,-17],[-13,-9],[-36,-17],[-14,-11],[-7,-12],[-9,-5],[-20,2],[-13,6],[7,8],[0,12],[21,10],[14,10],[-22,14],[11,7],[8,9],[3,9],[-3,4],[8,2],[13,13],[11,5],[5,0],[8,-2],[6,-2],[2,2],[4,2],[15,4],[5,1],[10,-2],[5,-5]],[[4454,8738],[-15,-17],[-37,20],[-13,9],[-6,13],[2,15],[16,26],[3,14],[9,-3],[7,-4],[4,-4],[9,-25],[14,-22],[7,-22]],[[4654,8944],[19,-2],[19,3],[16,3],[12,1],[10,-7],[0,-28],[-1,-3],[0,-2],[1,-4],[12,-8],[2,-3],[2,-2],[2,-2],[2,-4],[2,-4],[-4,-2],[-8,0],[-10,0],[-7,0],[-7,-3],[-2,-4],[-4,-4],[-9,-1],[-28,6],[-6,3],[-40,13],[-5,1],[-8,0],[-8,1],[-7,2],[-6,5],[-12,14],[-33,22],[1,4],[17,1],[12,3],[17,12],[59,-11]],[[5218,9050],[-6,-7],[-5,-21],[-9,-9],[-18,-4],[-14,3],[-25,14],[-18,6],[-8,4],[-2,6],[1,6],[3,2],[7,-1],[21,3],[15,-2],[9,0],[8,3],[12,7],[8,1],[6,-1],[9,-3],[6,-4],[0,-3]],[[4630,7932],[-137,-10],[-81,-12],[-95,1]],[[4122,8083],[-4,7],[-1,2],[14,9],[0,16],[-8,32],[2,13],[5,11],[10,10],[24,17],[3,6],[-3,7],[-8,7],[-16,6],[-21,5],[-19,7],[-8,11],[3,8],[9,3],[12,3],[12,5],[10,12],[2,13],[-3,12],[-5,12],[-2,15],[9,28],[2,14]],[[3709,7923],[-30,18],[6,27],[19,30],[6,24],[-16,13],[-25,6],[-29,0],[-29,-1],[-19,-1]],[[3592,8039],[-1,5],[3,8],[24,20],[22,26],[5,8],[1,10],[-2,14],[-4,12],[-6,8],[3,8],[59,69],[-3,-1],[-4,2],[-2,4],[0,3],[3,1],[5,1],[4,2],[2,2],[5,8],[31,31],[13,20],[8,24],[-2,25],[-12,23],[-12,16],[-1,11],[10,9],[21,12],[21,10],[17,2],[44,-6],[22,2],[46,9],[20,2],[17,5],[5,12],[0,14],[3,11],[14,8],[21,5],[22,1],[17,-4],[16,-11],[27,-25],[18,-8],[18,0],[21,3],[17,6],[7,6],[9,4],[17,5]],[[4055,7606],[-37,-7],[-29,-17],[-19,-22],[-11,-21],[0,-23],[6,-22],[2,-23],[-16,-23]],[[3951,7448],[-35,-10],[-42,-1],[-38,-5],[-25,-21],[-20,-101],[-24,-25]],[[3767,7285],[-35,19],[-8,7],[-6,8],[-1,4],[3,11],[0,25],[-5,9],[-14,3],[4,9],[-5,7],[-10,7],[-7,9],[2,9],[10,23],[-2,7],[-8,4],[-8,-1],[-7,-3],[-8,-1],[-16,2],[0,1],[-34,-4],[-16,0],[-18,3],[-15,4]],[[3563,7447],[30,26],[7,12],[3,16],[-21,104],[-2,3],[-11,8],[-2,5],[1,9],[10,26],[-5,36],[4,3],[18,12],[9,7],[4,5],[2,6],[0,7],[-9,21],[-34,45],[0,13],[-46,7],[-17,5],[-8,11],[21,74],[10,5],[22,2],[18,4],[11,10],[4,11],[0,8],[-9,9],[-11,7],[-6,6],[8,9],[24,17],[6,9],[1,14],[-3,20]],[[4648,6408],[-1,0],[-8,-1],[-19,1],[-10,-4],[-7,-8],[-4,-11],[-3,0],[-4,-1],[-5,-1],[-3,-4],[1,-2],[4,0],[5,1],[2,1],[7,-14],[1,-6],[-10,-15],[-22,-15],[-18,-14],[1,-16],[-7,0],[-7,0],[-7,1],[-7,1]],[[4527,6301],[-27,16],[-10,9],[-1,10],[17,26],[0,13],[-7,17]],[[4499,6392],[31,88],[34,66],[3,21],[-7,23],[-98,164]],[[4462,6754],[187,89]],[[4649,6843],[373,178],[67,39],[170,137]],[[5259,7197],[215,2]],[[5474,7199],[-6,-4],[-5,-6],[-2,-5],[0,-12],[-3,-3],[-19,-8],[-7,-8],[1,-7],[13,-18],[7,9],[1,4],[7,0],[-8,-21],[-34,-39],[6,-15],[18,9],[18,7],[-4,-8],[-25,-25],[-1,-4],[2,-9],[-1,-4],[-6,-2],[-17,-1],[-5,-1],[-29,-21],[-35,-16],[-32,-19],[-4,-1],[-4,-2],[-3,-3],[-2,-5],[1,-5],[1,-4],[0,-3],[-15,-13],[-45,-16],[-19,-13],[-6,5],[21,16],[10,12],[4,12],[8,8],[50,19],[6,9],[6,14],[9,13],[32,10],[8,12],[-5,10],[-29,2],[-21,-5],[-10,-9],[-4,-10],[0,-12],[-7,-9],[-17,-6],[-40,-7],[-59,-18],[-15,-3],[-38,-3],[-37,-5],[-12,-6],[-13,-7],[-14,-6],[-31,-4],[-12,-4],[-11,-2],[-9,2],[-9,2],[-9,-2],[-70,-34],[-6,-6],[-38,-25],[-50,-15],[-16,-8],[-11,-10],[-8,-12],[-7,-26],[2,-14],[16,-22],[4,-11],[11,-6],[25,-1],[24,-4],[10,-12],[-5,-9],[-44,-29],[17,-2],[9,-2],[10,-4],[-40,-13],[-17,-8],[-8,-10],[-5,-12],[-13,-9],[-55,-26],[-9,-8],[-8,-39],[-7,-11],[-9,-10],[-39,-29],[-18,3],[-12,3],[-8,-3],[-8,-16],[-3,-27],[13,-25],[23,-21],[31,-14],[3,0]],[[4691,7271],[-23,0],[-40,3],[-29,10]],[[4599,7284],[-3,19],[-7,7]],[[4589,7310],[90,17],[28,-26],[-16,-30]],[[5412,7824],[9,-13],[4,-15],[9,-12],[19,-14],[16,-15],[-1,-15],[5,-7],[3,-10],[5,-9],[11,-3],[4,1],[6,2],[7,1],[9,0],[19,-10],[8,-3],[13,1],[28,6],[13,2],[17,-4],[8,-19],[13,-6],[-5,14],[18,-6],[21,-17],[9,-16],[-19,9],[-12,2],[-5,-5],[3,-9],[9,-17],[2,-7],[-2,-9],[-11,-19],[-1,-8],[8,-10],[25,-10],[10,-9],[4,3],[7,3],[3,2],[17,-2],[10,5],[11,5],[19,-8],[10,-11],[0,-11],[-8,-11],[-13,-10],[-5,-6],[-3,-7],[-5,-7],[-8,-3],[-5,-3],[-11,-14],[-14,-48],[5,-10],[-16,-18],[-27,-43],[-51,-49],[-9,-17],[-20,-26],[-7,-7],[-14,-9],[-26,-31],[-14,-11],[-34,-17],[-9,-5]],[[5259,7197],[-281,-67],[-14,-1],[-14,5],[-174,125]],[[4776,7259],[34,20],[5,43],[-133,71]],[[4682,7393],[24,2],[12,3],[11,4],[9,6],[16,22],[9,6],[8,2],[6,4],[5,61],[-2,12],[-9,22],[-2,11]],[[4769,7548],[6,25],[1,75]],[[4776,7648],[2,12],[23,35],[10,42],[9,14],[47,27],[12,15],[-18,17]],[[4682,7393],[-14,0],[-30,1],[-11,0],[-2,-2],[-3,-5],[-5,-5],[-7,-5],[-8,-2],[-29,-3],[-2,-6],[-7,-2],[-12,0],[-2,0],[-2,1],[-4,0],[-5,-2],[0,-1],[-2,-3],[-4,-6]],[[4533,7353],[2,-4],[1,-4],[-1,-6],[-10,-9],[-5,-8],[-2,-3],[-4,-2],[-13,-6],[-2,0],[-12,-13],[-11,-6],[-45,-7],[-346,-34]],[[4085,7251],[-11,36],[-3,45],[-10,42],[-29,28]],[[4032,7402],[19,4],[33,-5],[18,0],[18,7],[10,10],[9,23],[20,25],[37,19],[45,14],[47,5],[99,-3],[32,1],[23,4],[66,20],[66,14],[62,8],[63,2],[70,-2]],[[4032,7402],[-44,20],[-19,11],[-18,15]],[[4098,7647],[186,-39],[103,-10],[77,14],[75,40],[45,18],[41,7],[15,-2],[42,-11],[72,-11],[22,-5]],[[4599,7284],[-43,-124],[0,-8],[13,-10],[20,-6],[22,-4],[20,1],[-4,-23],[-5,-11],[-11,-8],[-122,-40],[-6,-5],[25,-74],[11,-19],[15,-18],[115,-92]],[[4462,6754],[-17,25],[-45,48],[-13,27],[-3,43],[-7,22],[-18,19],[-30,12],[-45,10],[-84,11],[-33,1],[-39,-3],[-35,-7],[-25,-12]],[[4068,6950],[-12,26],[-11,12],[-17,7],[-94,15]],[[3934,7010],[-2,19],[7,19],[16,17],[22,13],[18,4],[25,-1],[17,5],[19,15],[18,24],[12,26],[3,18],[-5,21],[1,61]],[[4533,7353],[46,-32],[10,-11]],[[4691,7271],[54,0],[31,-12]],[[3715,6176],[1,-24],[-10,-39],[3,-12],[41,-26],[4,-7],[-6,-7],[-2,-9],[20,-43],[4,-28],[-10,-23],[-25,-16],[-39,-4],[-10,2],[-7,2],[-8,1],[-11,0],[-4,-3],[-1,-4],[-6,-4],[-15,-2],[-4,2],[-2,4],[-5,5],[-48,8],[-8,2],[-21,15],[-5,17],[5,36],[-4,21],[-11,11],[-42,16],[-12,-3],[-10,-1],[-9,3],[-5,5],[-7,0],[-33,27],[-11,19],[19,9],[12,2],[-8,4],[-22,8],[4,7],[8,5],[10,5],[7,5],[6,0],[5,2]],[[3443,6164],[15,-3],[25,14],[22,10],[25,6],[33,2],[25,6],[20,13],[14,17]],[[3622,6229],[5,17]],[[3627,6246],[10,-9],[6,-22],[8,-11],[15,-9],[37,-13],[12,-6]],[[3800,6778],[16,-65],[20,-32],[35,-22],[16,-2],[42,-1],[12,-4],[-1,-8],[-10,-9],[-13,-10],[-8,-9],[1,-8],[4,-8],[6,-8],[4,-7],[2,-8],[1,-20],[6,-17],[-1,-7],[-10,-25],[-2,-10],[1,-10],[7,-9],[15,-9],[12,-5],[5,-8],[-6,-18]],[[3954,6439],[-13,0],[-7,3],[-5,4],[-4,2],[-17,-2],[-37,-5],[-100,-4],[-22,1],[-22,-2],[-74,-15],[-20,-5],[-41,-22],[-24,-9],[-23,-1]],[[3545,6384],[-32,34],[-19,16],[-24,14],[-37,11],[-80,17],[-33,14],[-20,38],[26,45],[81,81]],[[3407,6654],[61,18],[26,13],[27,33],[17,13],[22,8],[24,-2],[46,-14],[14,-5],[15,-2],[17,4],[30,12],[27,15],[16,20],[10,22],[14,21],[9,-7],[7,-8],[11,-17]],[[4499,6392],[-52,0],[-92,38],[-47,9],[-43,-2],[-144,-22]],[[4121,6415],[-10,-2],[-12,-1],[-10,-2],[-10,-15],[-16,-9],[-20,-4],[-17,0],[-5,4],[1,11],[-2,3],[-9,3],[-18,2],[-9,2],[-15,5],[-11,6],[-6,9],[2,12]],[[3800,6778],[114,16],[31,0],[16,-5],[12,-9],[18,-18],[13,-1],[15,9],[14,12],[8,9],[16,28],[9,9],[10,5],[9,4],[9,5],[8,8],[7,25],[-9,25],[-32,50]],[[4121,6415],[-13,-16],[-5,-8],[0,-9],[4,-4],[12,-7],[4,-3],[3,-10],[-1,-10],[-29,-49],[-8,-8],[-7,-3],[-17,-2],[-7,-3],[2,-1],[5,-2],[4,-3],[-2,-5],[-8,-4],[-18,-5],[-6,-5],[-24,-15],[-77,-15],[-30,-11],[-9,-8],[-41,-52],[-6,-4],[-6,-3],[-3,-3]],[[3838,6147],[-8,1],[-15,4],[-10,5],[-4,8],[1,20],[-2,11],[-6,8],[-2,-20],[2,-5],[-3,-2],[-11,-6],[-4,4],[-3,0],[-7,-4],[12,40],[-5,10],[-16,1],[-9,-11],[-4,-28],[-21,7],[-8,-8],[0,-6]],[[3627,6246],[-28,23],[-5,9],[-2,11],[1,10],[-1,9],[-11,10],[-16,8],[-16,6],[-14,7],[-9,12],[-3,10],[3,8],[7,7],[12,8]],[[3764,6344],[46,8],[0,38],[-70,-2],[-60,-19],[44,-6],[40,-19]],[[3934,7010],[-60,-7],[-29,-1],[-30,3],[-89,21],[-31,3]],[[3695,7029],[-22,32],[-16,37],[-18,72],[12,32],[32,31],[84,52]],[[3826,7103],[-8,48],[-83,1],[21,-46],[70,-3]],[[3622,6229],[-109,-1],[-73,13],[-72,-33]],[[3368,6208],[-14,-8],[5,-14],[-4,-21],[-10,-20],[-12,-11],[-15,-1],[-18,3],[-17,4],[-7,4],[-5,7],[-27,5],[-10,6],[8,2],[6,3],[3,4],[4,4],[-5,-1],[-16,-3],[-24,46],[-7,23],[7,55],[-4,24],[-36,87],[-10,6],[-6,3],[-1,6],[3,10],[0,14],[-4,5],[-21,18],[-17,20],[-11,10],[-59,33],[-9,11],[3,5],[15,6],[4,3],[-1,6],[-1,4],[-6,9],[20,-7],[21,2],[17,10],[7,14],[-2,4],[-5,4],[-6,4],[-5,2],[-3,3],[-2,7],[-5,7],[-8,4],[-2,-2],[-5,-6],[-19,23],[-3,8],[3,7],[14,15],[5,9],[-3,18],[-18,8],[-22,8],[-14,16],[23,3],[4,9],[-5,23]],[[3036,6768],[4,0],[29,-1],[26,1],[23,6],[42,25],[24,-1],[53,-16],[15,-2],[29,1],[13,-1],[13,-6],[6,-10],[5,-19],[20,-23],[54,-45],[15,-23]],[[3695,7029],[-17,-13],[-30,-4],[-64,2],[-18,2]],[[3566,7016],[-4,12],[-12,14],[-33,24],[0,-13],[-5,5],[-7,4],[-6,4],[-25,100],[-13,22],[7,31],[-9,15],[-14,15],[-8,11],[9,5],[0,-2],[3,-1],[8,-1],[11,0],[0,4],[-5,8],[1,13],[6,14],[18,21],[-2,13],[-8,14],[-4,13],[2,13],[2,6],[4,6],[7,7],[7,4],[8,3],[10,5],[49,42]],[[3157,7029],[-13,-1],[-13,6],[-4,5],[-21,9],[-20,16],[-12,4],[-3,5],[5,6],[16,10],[11,1],[8,2],[1,2],[3,4],[8,3],[12,-1],[7,-3],[4,-3],[2,-5],[9,-11],[-1,-26],[6,-9],[2,-8],[-7,-6]],[[3418,6920],[40,-42],[45,7],[64,29],[-6,18],[-32,23]],[[3529,6955],[9,9],[5,6],[20,12],[4,7],[0,24],[-1,3]],[[3036,6768],[-1,3],[4,10],[5,9],[2,9],[-4,13],[-16,25],[-12,12],[-14,9],[-27,4],[-16,-9],[-13,-9],[-15,1],[-3,-2],[-12,-6],[-16,18],[2,69],[3,10],[15,26],[4,12],[-4,6],[-14,9],[-4,6],[-2,19],[2,8],[19,39],[6,25],[10,12],[11,10],[11,6],[5,0],[11,-1],[5,1],[17,7],[5,1],[17,3],[22,1],[25,-4],[10,-10],[0,-12],[-25,-57],[14,-5],[47,-7],[10,-3],[6,-5],[30,-18],[11,-4],[23,0],[13,-1],[12,-4],[19,-12],[8,2],[3,-2],[10,-39],[5,-12],[14,-9],[21,-5],[48,-8],[24,-1],[22,3],[18,7],[11,2]],[[4201,5915],[3,-6],[-3,-17]],[[4201,5892],[0,-14],[0,-5],[10,-3],[12,1],[13,2],[14,0],[13,-7],[-5,-10],[-13,-12],[-10,-13],[10,-11],[-30,-41],[5,-17]],[[4220,5762],[-9,-11],[-42,-13],[-51,-11],[-37,-5],[-31,-2],[-8,2],[-17,5],[-30,14],[-6,0],[-15,0],[-7,0],[-9,3],[-17,8],[-10,3],[-9,1],[-19,1],[-9,2],[-13,5],[-12,6],[-7,7],[-1,6],[1,8],[-10,7],[-14,5],[-13,2],[-17,-1],[-12,-3],[-12,0],[-15,6],[-1,0]],[[3768,5807],[17,11],[9,10],[6,10],[17,4],[41,4],[15,4],[16,5],[13,7],[5,7],[5,4],[26,6],[8,3],[22,20],[92,51],[8,2],[12,0],[22,0],[7,1],[18,11],[8,4],[10,4]],[[4145,5975],[13,-11],[3,-17],[13,-5],[25,-24],[2,-3]],[[4275,5413],[5,-5],[3,-15],[-5,-4],[-18,3],[-29,16],[0,4],[8,0],[7,-2],[9,1],[11,3],[9,-1]],[[4106,5449],[-13,-1],[-36,4],[-36,13],[-4,3],[-10,14],[-1,3],[2,1],[11,-8],[7,-3],[38,-8],[29,0],[17,-1],[10,-3],[-1,-9],[-13,-5]],[[4220,5762],[42,3],[58,0],[53,-7],[25,-16],[19,-64],[11,-7],[17,-2],[14,-4],[1,-14]],[[4460,5651],[8,-8],[25,-10],[9,-6],[8,-9],[7,-6],[23,-8],[55,-26],[16,-3],[15,0],[14,-3],[12,-5],[4,-3]],[[4656,5564],[-22,-14],[8,-42],[-5,-15],[10,-1],[7,0],[12,-3],[-31,-19],[-4,-4],[-43,6],[-14,0],[-20,-6],[-60,-26],[-20,-12],[-15,3],[-15,5],[-5,3],[-28,6],[-13,2],[-19,0],[-9,2],[-9,3],[-11,3],[-17,1],[-33,-5],[-16,-3],[-15,-5],[-10,2],[-24,3],[-9,3],[-5,6],[4,3],[6,3],[3,7],[2,15],[4,11],[1,9],[-14,23],[-4,2],[-20,8],[-13,3],[-13,2],[-11,-2],[-80,-53],[-9,-3],[-8,3],[-5,7],[-2,7],[5,3],[8,4],[5,7],[4,7],[4,3],[14,1],[7,2],[3,6],[0,8],[-17,10],[-3,2],[-1,7],[6,13],[1,7],[0,10],[-3,10],[-6,9],[-12,6],[-19,4],[-93,7],[-42,6],[-23,0],[-20,-4],[-7,-8],[3,-11],[14,-12],[9,-13],[-20,-2],[-43,5],[-10,-9],[4,-11],[9,-12],[5,-12],[-6,-7],[-15,5],[-22,16],[-8,22],[-2,52],[-18,22],[16,2],[13,6],[6,6],[-3,3],[-13,4],[-2,9],[5,36],[-3,16],[-12,13],[-28,5],[0,4],[15,5],[2,5],[-9,6],[-16,5],[10,0],[7,1],[12,3],[0,4],[-14,8],[9,10],[0,1]],[[4527,6301],[7,-21],[6,-66]],[[4540,6214],[-35,1],[-22,-11],[-19,-15],[-27,-9],[-38,-4],[-20,-16],[-21,-15],[-13,-10]],[[4345,6135],[-25,1],[-7,-4],[-7,-1]],[[4306,6131],[-8,0],[-52,9],[-18,-2],[-10,-9],[-23,-6]],[[4195,6123],[-11,-3],[-9,-11],[-23,-6],[-15,9],[-22,0],[22,-20]],[[4137,6092],[2,-5],[-21,8]],[[4118,6095],[-13,5],[-6,-4]],[[4099,6096],[-9,7],[-5,8],[-9,3],[-48,12],[-4,3],[0,4],[-3,3],[-11,2],[-102,2],[-64,6],[-6,1]],[[4201,5892],[14,3],[11,5],[14,5],[5,-1],[4,0],[6,4],[79,2],[-9,40]],[[4325,5950],[-9,43]],[[4316,5993],[5,1],[9,0],[13,-4],[21,-11],[34,-50],[11,-22],[11,-39],[17,-11],[9,9],[4,12],[8,8],[-10,7],[-16,20],[-4,23],[0,22],[13,21],[15,7],[17,-3],[9,-12],[8,-3],[10,-2],[10,-4],[10,-5],[8,-6],[4,-8],[4,-16],[-4,-16],[-14,-27],[-15,-16],[3,-17],[39,17],[43,16],[-17,14],[3,17],[-16,42],[7,22],[20,18],[44,15],[33,9]],[[4662,6021],[6,-5],[32,-27],[26,-28],[71,-97],[8,-19],[2,-19],[-6,-19],[-14,-12],[-17,-11],[-15,-15],[-19,-27],[-12,-13],[-17,-10],[-23,-5],[-46,-3],[-21,-6],[-75,-30],[-82,-24]],[[4540,6214],[4,-58],[9,-28],[20,-27],[89,-80]],[[4316,5993],[-8,14],[7,5],[-6,6],[5,5],[2,12],[-8,9]],[[4308,6044],[4,7],[9,4],[17,-1],[5,12],[-2,6],[-25,5]],[[4316,6077],[5,15],[16,19],[-10,4],[1,8],[6,2],[11,10]],[[5326,5320],[4,-5],[19,-8],[5,-6],[-9,-18],[-60,-35],[-23,-17],[9,-13],[-9,-11],[-32,-16],[-16,-2],[-17,7],[-15,9],[-9,5],[-11,3],[-35,18],[-9,1],[-18,1],[-9,2],[-10,5],[-18,15],[-31,20],[-4,6],[4,14],[0,4],[-4,9],[0,32],[4,9],[7,6],[27,28],[3,6],[2,17],[3,4],[15,2],[15,-8],[23,-20],[4,4],[12,6],[5,4],[16,-10],[24,-3],[21,4],[9,12],[14,-5],[10,-5],[3,-6],[-5,-9],[16,3],[11,-3],[4,-6],[-9,-6],[4,-2],[11,-5],[6,-1],[15,6],[23,-4],[19,-9],[7,-10],[-4,-3],[-7,-1],[-10,0],[-1,-5],[1,-10]],[[4318,4557],[-9,-1],[-11,2],[-9,5],[-10,2],[-7,6],[-4,9],[-10,8],[-19,6],[-12,18],[21,17],[29,-7],[10,-14],[8,-20],[5,-5],[4,-2],[2,-2],[13,-13],[2,-7],[-3,-2]],[[4076,5373],[1,-3],[5,-30],[-1,-16],[-7,-12],[-117,-90],[431,-108],[38,-13],[16,-15],[0,-493]],[[4442,4593],[-3,-3],[-15,0],[-23,13],[-15,3],[-64,0],[-19,6],[-15,14],[-6,18],[8,16],[7,-9],[9,-6],[12,-1],[15,4],[-8,2],[-7,0],[-6,-2],[-7,11],[0,1],[-21,9],[-8,-1],[0,-12],[-17,6],[-21,10],[-18,11],[-13,13],[-26,15],[-9,1],[-6,4],[-43,44],[-14,4],[-10,7],[2,14],[11,25],[-1,13],[-6,11],[-10,11],[-27,18],[-18,22],[-15,9],[-23,5],[-20,0],[-15,4],[-6,14],[-1,6],[-5,12],[-1,7],[-4,7],[-17,16],[1,5],[5,4],[5,3],[3,4],[1,6],[-3,29],[-10,19],[-9,33],[-18,19],[-46,36],[-33,39],[-23,16],[-50,10],[-19,13],[-17,5],[-36,-2],[-10,3],[12,11],[-28,15],[-20,17],[-13,19],[-8,43],[-8,10],[-13,4],[-7,0],[-18,-2],[-8,-2],[-8,-3],[-4,-3],[-4,-4],[-5,-3],[-20,-9],[-13,-2],[-16,3],[-13,7],[-11,9],[-8,10],[-3,10],[4,13],[12,13],[16,11],[20,8],[24,4],[24,1],[71,-9],[62,-2],[14,1],[11,2],[10,-1],[20,-6],[11,-2],[20,-2],[40,0],[24,-2],[14,-7],[17,6],[13,-4],[19,-10],[18,-1],[16,3],[30,6],[92,13],[6,1]],[[3321,5574],[5,-6],[15,2],[20,-2],[20,-6],[16,-7],[35,-31],[-5,-7],[-10,-5],[-4,-5],[8,-8],[9,-3],[8,0],[6,-3],[2,-6],[-17,-8],[-4,-3],[-7,5],[-7,7],[-8,6],[-10,3],[-15,2],[-6,4],[-3,5],[-7,6],[-11,4],[-11,2],[-11,2],[-14,0],[-6,2],[-12,8],[-34,7],[-16,10],[-10,15],[-3,14],[1,7],[5,5],[7,2],[11,1],[15,-3],[26,-8],[22,-8]],[[4076,5373],[22,8],[14,-8],[8,2],[9,3],[5,11],[15,-3],[5,1],[8,2],[2,-2],[6,-3],[-5,-5],[-6,-4],[-8,-2],[-10,-1],[7,-5],[10,-7],[12,-6],[11,-3],[9,-5],[24,-23],[16,-5],[68,1],[17,-6],[-3,-20],[7,0],[2,4],[2,9],[3,3],[4,4],[2,1],[8,4],[10,2],[13,3],[13,4],[7,8],[7,0],[21,-23],[120,-57],[44,-39],[17,-6],[22,-2],[17,-5],[11,-9],[3,-13],[-3,-6],[-5,-7],[-3,-6],[3,-6],[12,-5],[12,1],[11,2],[12,2],[24,-1],[23,-3],[18,-6],[9,-12],[-4,-12],[-14,-8],[-35,-14],[-13,-11],[-6,-13],[-1,-15],[10,-37],[0,-10],[-9,-25],[1,-8],[-7,0],[6,-17],[2,-38],[10,-14],[28,-20],[4,-5],[2,-7],[3,-10],[6,-9],[10,-10],[1,-5],[-2,-15],[-3,-2],[-4,1],[-6,-3],[-41,-34],[-12,-6],[-26,-10],[-8,-1],[-6,1],[-5,-1],[-2,-5],[1,-10],[2,-4],[5,-5],[-8,-4],[-6,4],[-4,-4],[-2,-3],[1,-4],[5,-5],[-19,-7],[1,-17],[13,-19],[19,-12],[0,-4],[-42,7],[-20,-1],[-2,-10],[6,-4],[1,-5],[-2,-6],[-5,-6],[9,-2],[4,-4],[1,-4],[0,-7],[-31,12],[-11,9],[-15,-4],[-25,-12],[-13,-2],[-13,-5],[-19,-10],[-26,-30]],[[5404,5678],[-19,0],[-24,8],[-38,19],[-68,25],[-41,22],[-13,3],[-16,6],[-20,14],[-17,15],[-7,11],[4,7],[8,5],[11,2],[13,-1],[6,-3],[5,-2],[8,-7],[133,-66],[47,-18],[23,-11],[11,-14],[-6,-15]],[[5609,6088],[-22,-1],[-36,2],[-3,10],[26,8],[24,5],[17,5],[16,2],[16,-4],[7,-4],[1,-9],[-23,-11],[-23,-3]],[[5364,6184],[8,-4],[11,1],[13,2],[36,0],[-8,-3],[-4,-5],[0,-6],[5,-7],[9,-4],[11,-1],[19,2],[13,-6],[10,-13],[-1,-13],[-15,-6],[0,3],[-82,35],[-28,2],[-15,3],[-6,5],[-4,7],[-7,7],[1,4],[17,-4],[3,3],[11,6],[3,-8]],[[5189,6310],[16,-6],[9,3],[12,-2],[6,-7],[-6,-10],[25,-1],[19,-6],[11,-10],[-5,-13],[-23,16],[-11,4],[-16,-3],[-10,-6],[-3,-6],[4,-4],[9,4],[8,-15],[0,-7],[-10,-5],[-33,-12],[-3,-2],[1,-3],[2,-21],[2,-6],[5,-9],[19,2],[13,-10],[7,-15],[10,-39],[-2,-8],[-20,-30],[-20,-10],[-25,-7],[-21,-3],[-25,5],[-8,14],[2,16],[6,15],[19,2],[-1,24],[-15,27],[-21,13],[-16,3],[-4,7],[2,22],[-4,6],[-23,20],[-8,5],[-17,3],[-10,0],[-3,4],[8,40],[7,14],[11,6],[32,-11],[20,-2],[9,11],[7,5],[19,1],[43,-3]],[[4648,6408],[23,-8],[13,-8],[6,-11],[22,-62],[7,-6],[13,-7],[33,-31],[7,-10],[4,-16],[12,-16],[16,-16],[18,-13],[-5,-2],[-11,-4],[-5,-2],[43,-29],[6,-7],[8,-5],[65,-29],[13,-8],[1,-7],[-19,-2],[-38,-1],[-22,-2],[-21,-5],[-16,-8],[-6,-9],[0,-27],[3,-11],[38,-73],[4,-22],[11,-23],[8,-10],[13,-10],[44,-24],[10,-10],[2,-9],[-5,-21],[4,-4],[20,-11],[4,-5],[-2,-10],[-5,-9],[-9,-7],[-12,-5],[0,-5],[14,-6],[36,-31],[70,-29],[72,-42],[20,-9],[157,-35],[149,-19],[1,16],[-12,12],[-40,22],[20,4],[94,-15],[6,1],[1,8],[-4,11],[4,3],[14,1],[0,4],[-23,4],[-41,27],[-17,7],[-27,5],[-24,14],[-16,18],[-8,17],[11,-5],[2,-2],[2,-6],[6,0],[1,14],[12,9],[38,11],[13,-4],[3,10],[0,15],[4,8],[12,-2],[4,-12],[-3,-14],[-5,-10],[8,-5],[2,-7],[1,-8],[3,-9],[-1,-2],[1,-2],[7,-4],[5,0],[4,2],[4,4],[1,2],[6,-6],[1,-7],[0,-16],[10,3]],[[5798,5634],[-2,2],[-13,9],[-3,4],[-4,2],[-22,-17],[-58,2],[-25,5],[-20,10],[-3,-8],[8,-10],[14,-8],[13,-3],[4,-5],[51,-41],[10,-11],[-1,-8],[-6,-8],[1,-13],[9,-22],[-23,3],[-5,-12],[6,-27],[7,-15],[15,-13],[39,-22],[74,-25],[15,-10],[-4,-10],[-24,7],[-43,19],[5,-9],[27,-24],[46,-31],[12,-11],[9,-12],[10,-25],[4,-22],[0,-25],[2,-7],[4,-5],[5,-3],[3,-4],[2,-13],[0,-7],[-2,-5],[-5,-2],[-10,-2],[-9,-3],[-4,-4],[-10,-6],[-24,-8],[-26,-6],[-18,-2],[-18,6],[-68,33],[3,12],[11,22],[1,9],[-19,35],[-102,78],[-2,4],[-2,8],[-3,4],[-20,11],[-7,6],[-29,7],[-7,8],[-16,10],[-63,0],[1,9],[-18,3],[-36,2],[-14,5],[-4,5],[-4,10],[-6,6],[-8,6],[-56,52],[-26,17],[-34,14],[-7,-11],[-15,2],[-18,9],[-13,4],[-20,0],[-4,1],[-37,20],[-14,4],[-12,2],[-12,1],[-11,2],[-21,11],[-12,5],[-12,3],[-33,5],[-15,9],[-11,11],[-16,10],[-9,0],[-39,8],[-16,4],[-7,-8],[-18,-6],[-3,-9],[-8,-3],[-50,-7],[-5,-3]],[[4845,5619],[-57,53],[-86,-24],[52,-48]],[[4754,5600],[-19,-8],[-8,-2],[-7,-1],[-18,0],[-5,-1],[-10,-4],[-31,-20]],[[7147,1851],[-45,1],[-25,3],[-17,8],[-56,44],[-20,8],[-24,3],[-24,2],[-44,10]],[[6968,2012],[13,4],[4,3],[37,12],[138,64],[13,2],[21,3],[16,6],[23,16],[25,11],[32,8],[38,5],[123,0],[45,4],[35,10]],[[7531,2160],[32,-9],[37,11]],[[7600,2162],[-9,-20],[7,-44],[-9,-17],[-23,-16],[-9,-5],[-4,-4],[2,-3],[-1,-1],[-1,-1],[-11,0],[-45,-1],[-14,-2],[-25,-7],[-9,-8],[-4,-10],[-22,-33],[-9,-8],[-12,-6],[-11,-2],[-40,-2],[-4,-5],[4,-30],[-10,-17],[-45,-31],[-4,-20],[-9,-19],[-39,1],[-89,22],[-8,-22]],[[7942,2035],[26,-13],[12,-8],[5,-8],[-4,-13],[-1,0],[-13,-3],[-17,1],[-15,0],[-9,-4],[-10,-4],[0,-7],[19,-16],[2,-5],[1,-6],[1,-6],[5,-6],[7,-3],[17,-4],[6,-2],[46,-33],[33,-33],[6,-17],[3,-4],[13,-11],[5,-7],[2,-4],[5,-4],[22,-8],[7,-3],[6,-4],[5,-5]],[[8127,1795],[-21,1],[-64,9],[-29,1],[-52,-4],[-29,-1],[-17,0],[-12,2],[-11,3],[-14,6],[-10,7],[-11,12],[-6,4],[-19,8],[-17,0],[-44,-13]],[[7771,1830],[-84,-30],[-1,0],[-222,-114],[-1,0]],[[7463,1686],[-4,4],[-10,4],[-11,10],[-49,60],[-31,26],[-46,18],[-8,1],[-56,24],[-50,15],[-8,-5],[-18,5],[-24,3],[-1,0]],[[7600,2162],[1,0],[10,5],[16,1],[34,-1],[7,-2],[4,-7],[3,-8],[4,-6],[22,-10],[83,-25],[39,-19],[75,-42],[44,-13]],[[8218,1259],[-18,-16],[-3,-12],[11,-11],[22,-15],[-42,-2],[-33,3],[-29,9],[-30,16],[-20,16],[-19,21],[-22,17],[-27,4],[18,41],[-75,-1],[4,10],[-44,-7],[-22,-5],[-12,-7],[9,-17],[1,-5],[-19,-24],[-40,-12],[-49,-5],[-213,1],[-19,2],[0,5],[4,6],[-7,5],[-24,3],[-189,-2],[-2,0]],[[7329,1277],[2,12],[-3,13],[-20,5],[-3,-1],[-11,-10],[-7,-2],[-2,1],[-2,2],[-4,1],[-7,2],[-8,4],[-6,6],[-3,5],[-1,7],[6,11],[2,5],[2,64],[14,31],[43,60],[22,13],[18,3],[24,7],[39,15],[39,19],[17,11]],[[7480,1561],[48,-27],[53,-10],[25,35],[-25,26],[-31,30],[-33,3]],[[7517,1618],[2,16],[5,12],[22,23],[-15,6],[-14,1],[-32,-3],[-13,3],[-9,10]],[[7771,1830],[-16,-79],[7,-20],[28,-22],[11,-12],[-1,-10],[-165,-142],[-8,-15],[15,-3],[0,-1],[9,-2],[17,2],[13,2],[3,1],[8,4],[14,8],[21,18],[14,7],[18,3],[25,-3],[13,-4],[2,-9],[-8,-15],[-37,-50],[-1,-5],[12,-10],[14,-7],[13,-6],[15,-2],[19,-1],[17,-3],[21,-10],[5,0],[0,-13],[1,-4],[1,-4],[5,-4],[17,-6],[13,-4],[33,-4],[14,-3],[13,-5],[14,-4],[15,1],[1,0],[10,5],[17,16],[13,6],[-6,3],[-5,2],[3,10],[-6,9],[-11,8],[-15,5],[-16,13],[18,11],[29,9],[11,5],[-1,3],[-12,6],[-12,8],[-6,10],[6,8],[25,15],[15,-11],[4,-3],[1,-2],[40,-37],[18,-24],[-4,-12],[-7,-4],[-5,-10],[-2,-11],[0,-8],[6,-12],[8,-4],[40,1],[5,-127],[8,-5],[53,-18]],[[8127,1795],[4,-7],[3,-12],[3,-5],[9,-8],[10,-5],[9,-3],[11,-7],[6,-6],[5,-8],[6,-15],[3,-23],[2,-7],[5,-6],[8,-7],[10,-4],[10,5],[8,5],[8,1],[8,-1],[21,-4],[14,-10],[17,-7],[11,-1],[8,3],[5,4],[6,4],[23,3],[3,3],[12,2],[12,2],[7,7],[5,16],[4,6],[13,5],[34,7],[18,5],[20,9],[46,31],[0,1],[1,-2],[8,2],[9,2],[2,2],[2,3],[3,2],[4,2],[7,-1],[22,-3],[8,0]],[[8600,1775],[0,-5],[9,-8],[3,-6],[-1,-8],[-32,-64],[-9,-32],[-1,-9],[6,-15],[3,-21],[7,-27],[-1,-12],[-4,-4],[-11,-10],[-12,-15],[-2,-4],[13,-9],[13,-8],[38,-12],[14,-8],[6,-10],[3,-35],[4,-8],[4,-2],[1,-2],[-6,-5],[-7,-2]],[[8638,1434],[-24,-5],[-7,-2],[-3,-2],[-1,-29],[-106,-67],[-17,-38]],[[8480,1291],[-262,-32]],[[8480,1291],[5,-28],[7,-8],[23,-17],[9,-10],[1,-9],[-17,-61]],[[8508,1158],[-172,4],[-88,-5],[-72,-18],[-27,3],[-55,47],[-26,14],[-14,-3],[-52,-25],[-15,0],[-15,8],[-26,22],[0,-1],[-1,-17],[-6,-18],[-20,-35],[-1,-8],[4,-6],[6,-4],[4,-5],[0,-4],[-2,-4],[0,-4],[5,-3],[1,-1],[10,-8],[3,-2],[-1,-8],[-7,-18],[2,-9],[10,-11],[6,-10],[3,-12],[-8,-23],[-5,-2],[-401,2],[31,-24],[32,-20],[75,-35]],[[7686,915],[-6,-7],[-4,-6],[-3,-5]],[[7673,897],[-128,33],[-18,6],[-28,15],[-13,11],[-13,23],[-12,10],[-69,43],[-27,22],[-18,22],[-13,31],[-1,13],[-7,12],[-2,8],[5,3],[15,1],[4,2],[-1,4],[0,53],[-3,14],[-19,38],[4,16]],[[7911,4195],[22,-6],[4,-13],[-9,-21],[-7,-7],[-18,-3],[-62,0],[-26,4],[-22,0],[-2,-5],[-4,-3],[-8,-1],[-5,3],[-4,3],[-2,4],[-3,3],[-35,21],[-12,10],[-28,42],[-6,13],[-4,6],[-22,15],[-6,5],[20,0],[51,9],[13,0],[40,-1],[27,1],[10,-1],[19,-4],[19,-7],[15,-9],[11,-21],[25,-31],[9,-6]],[[9112,3695],[16,-1],[34,1],[14,-4],[10,-9],[-5,-6],[-14,-5],[-16,-1],[-19,0],[-11,0],[-8,4],[-12,7],[-10,4],[-39,10],[-19,7],[-5,16],[8,16],[23,8],[23,-6],[13,-30],[17,-11]],[[8652,4643],[-1,-3],[32,10],[11,2],[-2,-5],[0,-4],[0,-4],[-5,-4],[11,-2],[10,2],[21,9],[-6,-11],[10,-3],[39,1],[19,-5],[37,-16],[15,1],[6,-7],[22,-16],[11,-17],[-1,-7],[-17,5],[-8,-3],[-25,-3],[-10,-2],[9,-2],[8,-3],[6,-3],[6,-5],[-29,-3],[-13,-3],[-8,-6],[-2,-11],[11,-3],[34,1],[-2,-2],[-3,-4],[-2,-2],[9,-5],[14,-7],[9,-9],[0,-6],[-35,-17],[-9,-6],[-13,-13],[-18,-14],[-7,-10],[-2,-12],[2,-13],[2,-4],[12,-18],[-2,-18],[2,-6],[6,-5],[27,-14],[3,-6],[-3,-5],[-7,-3],[-28,6],[-10,-11],[3,-11],[20,5],[12,-1],[10,-11],[10,-23],[-2,-15],[-10,-3],[-13,-1],[-10,-10],[13,-3],[-3,-6],[-8,-8],[-2,-8],[4,-6],[6,-1],[7,-1],[8,-2],[3,-5],[0,-14],[4,-10],[4,-5],[23,-20],[7,-9],[1,-10],[-11,-9],[9,-1],[5,0],[6,-1],[9,2],[6,-15],[4,-7],[8,-3],[10,-2],[19,-8],[13,-2],[2,-4],[11,-7],[13,-7],[6,-1],[0,-16],[-3,-9],[-8,-8],[-63,-28],[-12,-12],[0,-22],[18,-12],[28,-2],[33,7],[-15,11],[-1,9],[14,2],[47,-20],[20,-7],[14,-9],[6,-17],[16,-19],[33,-20],[20,-20],[-20,-18],[-9,5],[-24,7],[-9,4],[-10,21],[-2,2],[-1,1],[-1,4],[1,10],[-1,3],[-7,1],[-15,4],[-4,3],[-15,7],[-16,5],[-7,-4],[-35,-12],[-11,-3],[-12,3],[-5,5],[-2,7],[-6,6],[-13,3],[-6,-2],[-8,-3],[-12,-2],[-2,-5],[-5,-21],[-4,-8],[-28,15],[-19,8],[-13,0],[-19,-13],[-11,-5],[-17,-5],[0,10],[-8,6],[-11,1],[-9,-8],[-24,13],[-11,4],[-37,3],[-6,3],[-5,4],[-11,-1],[-32,-7],[-5,-5],[-5,-5],[-12,-11],[-2,-4],[-6,-2],[-5,2]],[[8575,3910],[26,64],[20,35],[50,52],[13,21],[2,22],[-11,21],[-52,51],[-8,16],[-28,224],[-10,24],[-19,20],[-12,7],[-10,2],[-84,-11],[-17,54],[0,26],[36,38],[10,26],[11,49]],[[8492,4651],[11,17],[17,14],[21,6],[24,-7],[25,-35],[18,-14],[25,4],[19,7]],[[7682,3627],[-81,-23],[-17,8],[5,8],[13,8],[7,11],[2,8],[4,10],[6,9],[8,7],[14,4],[15,0],[14,-5],[11,-7],[6,-7],[3,-8],[2,-15],[-12,-8]],[[7817,3635],[-48,-7],[-55,11],[-1,21],[28,19],[31,0],[40,-13],[17,-17],[-12,-14]],[[8300,4055],[-58,-6],[13,-53],[55,-27],[55,4]],[[8365,3973],[-9,-10],[-2,-4],[2,-7],[10,-12],[2,-5],[-2,-20],[15,-56],[-1,-26],[-42,-75],[-7,-29],[8,-26],[14,-7],[62,-17],[26,-4],[9,-3],[3,-5],[7,-17],[39,-27]],[[8499,3623],[-11,-5],[-22,-4],[-16,-5],[-13,-8],[-12,-12],[-17,-14],[-20,-7],[-24,-3],[-76,-4],[-22,-3],[-20,-6],[-14,-8],[-14,-12],[-11,-12],[-2,-11],[23,-81],[-3,-15],[-9,-4],[-24,-2],[-10,-3],[-8,-5],[-9,-11],[-9,-5],[-44,-13],[-29,-12]],[[8083,3358],[6,24],[14,24],[9,23],[-2,14],[-8,16],[-14,14],[-22,6],[-11,6],[-4,15],[2,17],[7,28],[3,5],[5,5],[14,10],[2,3],[2,28],[3,12],[27,37],[3,12],[0,28],[-23,59],[-5,6],[-37,18],[-6,4],[-4,11],[-11,12],[-27,21],[-43,19],[-7,4],[-6,10],[-16,5]],[[7934,3854],[50,38],[-69,56],[-47,-28],[-62,-1],[-11,-27],[64,-50]],[[7859,3842],[-3,-9],[12,-11],[5,-11],[-10,-14],[-15,-12],[-12,-7],[-13,-2],[-8,0],[-38,17],[-1,2],[-17,-3],[-6,2],[-5,17],[-6,2],[-12,-1],[-13,-1],[-11,-1],[-6,2],[1,12],[5,8],[14,11],[3,10],[-3,12],[-7,5],[-10,4],[-9,8],[-2,10],[6,9],[7,8],[6,9],[9,8],[3,4],[-2,5],[-5,7],[-7,38],[0,56],[-18,-1],[-19,6],[-15,11],[-5,11],[3,6],[15,6],[3,5],[-16,3],[-13,3],[-7,4],[14,5],[-4,5],[-10,6],[-6,7],[-3,9],[-16,14],[-14,36],[3,10],[5,1],[22,6],[3,2],[11,-4],[27,-21],[61,-30],[19,-12],[38,-38],[4,26],[6,12],[14,-2],[32,-14],[11,-7],[26,-38],[25,-17],[37,-9],[50,-1],[36,6],[33,10],[51,26],[40,32],[13,5],[10,-1],[21,-5],[12,-2],[4,2],[-1,5],[4,1],[7,-1],[3,-3],[1,-2],[0,-2],[26,1],[9,-1],[10,-3],[23,-11],[7,-3],[8,-6],[-2,-14],[-7,-15]],[[8176,4220],[-4,-7],[-2,-6],[-1,-14],[-3,-7],[-8,-6],[-7,-2],[-25,17],[2,2],[-1,6],[-7,3],[-15,-7],[-14,21],[7,-2],[7,-2],[-2,9],[-10,10],[-13,7],[-14,3],[-9,3],[-5,6],[-3,8],[-4,5],[-7,6],[0,5],[10,13],[7,0],[2,-2],[11,-6],[34,-12],[5,-3],[4,-2],[2,-4],[1,-4],[3,-4],[15,-4],[3,-5],[-1,-9],[7,-6],[7,-5],[10,-3],[18,-2]],[[7475,4484],[-15,-1],[-14,3],[-4,6],[7,7],[12,6],[18,3],[25,1],[22,-5],[1,-6],[-20,-1],[-11,-5],[-21,-8]],[[8575,3910],[-9,2],[-8,5],[-6,7],[-5,8],[-6,33],[-10,26],[-28,22],[-41,11],[-47,2],[-47,-2],[-42,4],[-10,18],[9,49],[0,5],[1,4],[2,3],[4,4],[-8,3],[-20,10],[-8,2],[-14,1],[-7,1],[-14,5],[-12,7],[-10,8],[-6,9],[-15,-19],[-9,-3],[-19,1],[-14,4],[-11,5],[-9,7],[-9,9],[16,5],[9,5],[8,6],[10,5],[17,3],[15,1],[3,3],[-13,10],[60,0],[13,4],[17,9],[15,11],[8,9],[0,9],[-6,10],[-3,8],[6,8],[22,14],[17,13],[5,-3],[16,-5],[-1,15],[-11,12],[-18,8],[-23,2],[-18,-3],[-43,-14],[-17,-3],[-37,12],[-61,51],[-41,8],[0,4],[7,-1],[7,1],[-10,3],[-4,0],[14,17],[5,-1],[5,-2],[6,-2],[5,-3],[-4,12],[-15,6],[-15,1],[-17,-11],[-18,2],[-10,5],[16,6],[-5,6],[-7,2],[-8,0],[-9,-4],[-2,16],[-3,9],[-5,6],[-51,32],[-41,9],[-41,6],[-33,-2],[-30,9],[-48,19],[-49,34],[-22,12],[3,1],[3,3],[-24,8],[-17,17],[-21,42]],[[7674,4636],[59,1],[17,5],[13,10],[14,9],[17,-1],[169,-48],[30,-12],[13,-1],[19,5],[22,8],[12,3],[12,1],[24,-4],[22,-8],[24,-7],[24,0],[24,8],[16,6],[17,5],[25,1],[80,-4],[29,2],[11,2],[8,3],[13,10],[9,4],[10,2],[22,0],[34,5],[16,4],[13,6]],[[8627,3198],[-7,-3],[-12,1],[-6,3],[-3,4],[-1,5],[-4,5],[-24,17],[-39,37],[-35,12],[-20,9],[-9,10],[-12,26],[-1,13],[13,9],[12,0],[10,-3],[18,-9],[42,-10],[13,-5],[11,-11],[14,-41],[10,-8],[15,-8],[13,-11],[5,-13],[12,-20],[-1,-3],[-9,-2],[-5,-4]],[[8499,3623],[2,-2],[5,-5],[20,-5],[2,-12],[-11,-31],[2,-7],[9,-14],[3,-8],[-3,-22],[3,-9],[7,-9],[14,-12],[13,-7],[8,7],[7,0],[13,-9],[8,-9],[4,-11],[3,-17],[3,-13],[-3,-14],[-14,-10],[-32,-4],[-72,16],[-19,-2],[-7,-12],[3,-18],[7,-17],[7,-9],[-35,7],[-29,19],[-21,23],[-7,20],[-16,12],[-1,2],[-4,4],[0,21],[-12,7],[-20,5],[-20,-1],[-12,-11],[14,-17],[7,-83],[25,-38],[7,-26],[12,-27],[-1,-12],[-10,-6],[-17,4],[-55,25],[-3,3],[-5,8],[-13,4],[-14,1],[-11,2],[-16,10],[-9,8],[-11,5],[-24,2],[-46,1],[-21,2],[-15,5],[-15,21]],[[7479,4707],[-14,-6],[-20,10],[-13,14],[-3,14],[-1,7],[10,-2],[18,-7],[17,-15],[6,-15]],[[7674,4636],[-30,58],[-68,89],[-2,9],[2,7],[8,7],[10,6],[12,2],[8,-2],[47,-21],[5,-1],[11,0],[26,7],[9,1],[6,-1],[26,-7],[16,-3],[66,-1],[4,-1],[11,-4],[3,-2],[2,-2],[5,1],[5,2],[5,1],[24,-1],[22,-3],[86,-4],[195,9],[10,2],[10,4],[9,8],[-6,6],[-10,5],[-4,7],[0,5],[19,-4],[14,-7],[11,-7],[10,-3],[13,4],[18,6],[16,2],[6,-10],[10,1],[22,-5],[19,-7],[2,-3],[6,-1],[6,-2],[7,-2],[13,0],[8,2],[12,4],[11,5],[5,4],[3,13],[10,2],[29,-5],[10,1],[10,2],[10,2],[9,-3],[25,-14],[51,-19],[25,-12],[1,-11],[12,-7],[22,-7],[9,-7],[12,-16],[7,-5],[17,-8],[-20,-6],[-18,-14],[-5,-15],[22,-11],[-7,-2],[-4,-4],[-3,-7]],[[9022,2517],[19,-18],[15,-27],[-3,-8],[0,-1],[-36,-13],[-7,-2],[-132,8],[-47,-15],[-36,-34],[-23,-14],[-28,-5],[-87,1]],[[8657,2389],[-4,52],[-25,38],[-2,27],[34,62],[-50,36],[-43,27],[-5,13],[-6,5],[-9,4],[-7,5],[-3,6],[1,14],[-1,7],[-1,3]],[[8536,2688],[5,2],[10,1],[9,-5],[13,-15],[31,-24],[20,-9],[24,-3],[67,-2],[45,-6],[22,-1]],[[8782,2626],[21,-63],[53,-48],[166,2]],[[9059,2647],[-199,1]],[[8860,2648],[10,6],[8,14],[7,21],[1,64],[-3,10],[-6,7],[-8,6],[-5,7],[-1,6],[2,11],[-1,5],[-3,6],[-9,11],[-7,16],[-19,19],[-7,18],[-5,5],[-4,3],[-2,3],[0,19],[-2,3]],[[8806,2908],[54,10],[34,2],[35,-1],[40,-4],[43,-8],[14,-4],[15,-5],[9,-4],[26,-18],[5,-4],[7,-9],[8,-7],[-5,-9],[-11,-19]],[[9080,2828],[-3,-10],[3,-16],[7,-12],[13,-11],[19,-12]],[[9119,2767],[-60,-120]],[[9661,2028],[-112,0]],[[9549,2028],[-525,1]],[[9024,2029],[-312,0]],[[8712,2029],[-9,18],[-5,59],[-9,14],[-24,26],[-5,14],[2,12],[5,10],[1,11],[-5,12],[-13,22],[-2,21],[2,22],[-10,29],[17,90]],[[9022,2517],[-2,20],[-10,26],[32,49],[17,35]],[[9119,2767],[23,-30],[13,-32],[7,-33],[0,-33],[-7,-17],[0,-4],[12,-7],[14,0],[13,1],[10,-4],[7,-11],[9,-22],[9,-10],[11,-7],[11,-6],[11,-6],[15,-15],[11,-4],[12,-4],[10,-6],[1,-7],[-4,-7],[-3,-8],[7,-6],[38,-19],[36,-21],[9,-13],[-2,-14],[-9,-14],[-17,-12],[-15,-20],[7,-22],[19,-23],[40,-36],[5,-5],[9,-22],[9,-6],[24,-5],[107,-8],[19,-6],[2,-19],[-20,-63],[13,-37],[63,-61],[13,-35]],[[8712,2029],[39,-50],[7,-18],[5,-20],[4,-9],[14,-20],[3,-8],[1,-8],[-3,-24],[-7,-19],[-14,-16],[-22,-9],[-11,1],[-30,5],[-13,1],[-11,-1],[-10,-1],[-11,0],[-14,2],[2,-14],[-5,-11],[-7,-11],[-5,-14]],[[8624,1785],[-3,-4],[-5,-3],[0,-1],[-7,-2],[-9,0]],[[7942,2035],[-14,18],[-46,31],[-13,19],[1,11],[11,19],[3,10],[-1,7],[-4,7],[-1,9],[5,9]],[[7883,2175],[18,26],[31,81],[171,-7],[37,6],[8,12],[-3,51]],[[8145,2344],[7,11],[14,11],[16,10],[16,7],[26,8],[28,2],[312,-3],[93,-1]],[[8102,2759],[9,-4],[10,-10],[6,-12],[-8,-17],[2,-10],[-2,-10],[-14,-8],[-8,-2],[-10,-1],[-7,1],[-6,8],[-8,1],[-9,0],[-9,1],[-62,18],[-27,14],[-10,21],[10,22],[28,14],[36,5],[40,-7],[17,-15],[10,-6],[12,-3]],[[9136,1373],[-7,-14],[-10,3],[-14,11],[-9,12],[-7,26],[-13,15],[-4,7],[-4,22],[-6,3],[-9,0],[-20,5],[-6,1],[-4,2],[-3,7],[1,7],[5,7],[6,5],[6,2],[8,7],[6,30],[4,9],[10,3],[8,-2],[6,-4],[4,-6],[17,-9],[18,-8],[15,-8],[6,-14],[-7,-78],[4,-13],[7,-9],[2,-5],[-4,-7],[-6,-7]],[[9185,1639],[-6,1],[-19,-3],[-62,-26],[-61,-21],[-12,-6]],[[9025,1584],[-13,6],[-16,-6],[-14,-10],[-13,-5],[-104,-2],[-22,3],[-4,10],[5,203],[-220,2]],[[9024,2029],[28,-124],[7,-6],[9,-7],[21,-15],[22,-10],[20,-20],[-1,-25],[41,16],[29,31],[36,29],[41,27],[25,-42],[-9,-13],[-13,-13],[-11,-8],[-8,-8],[10,-8],[12,-8],[9,-21],[-11,-39],[-7,-12],[-67,-9],[18,-16],[15,-10],[-18,-4],[-18,-6],[-16,-8],[-8,-14],[15,-6],[-1,-10],[-9,-11],[2,-8],[-1,-8],[-1,-4]],[[9549,2028],[-14,-43],[8,-46],[66,-154],[4,-23],[-27,-62],[5,-17],[43,-38],[22,-23],[8,-17],[-17,-18],[-37,-18],[-171,-61],[-1,0],[-75,-38],[-25,-10],[-25,-8]],[[9313,1452],[-41,23],[-13,10],[-5,9],[-7,25],[-42,59],[-1,24],[4,14],[0,12],[-8,8],[-15,3]],[[9319,3097],[-1,-5],[10,3],[4,1],[2,-10],[-2,-14],[2,-12],[16,-6],[11,-5],[-4,-13],[-18,-23],[5,-7],[-1,-10],[-5,-9],[-10,-3],[-16,-3],[-7,1],[6,9],[-7,4],[-11,1],[-11,0],[0,4],[11,0],[3,0],[0,5],[-21,8],[0,-5],[-3,6],[1,6],[9,13],[5,4],[4,2],[3,2],[2,5],[1,6],[-2,6],[1,5],[-10,9],[-1,15],[7,12],[19,6],[5,-5],[3,-3]],[[9292,2937],[-1,0],[-211,-109]],[[8806,2908],[-2,9],[-23,34],[-3,6],[-2,13],[-38,82],[-2,11],[3,11],[7,10],[51,48],[3,6],[13,-9],[17,-10],[20,-7],[34,-6],[30,-9],[21,-1],[-5,-14],[8,-18],[13,-17],[6,-16],[10,-11],[24,-11],[28,-7],[23,3],[-2,-3],[-1,-2],[-1,-2],[-4,-2],[14,0],[7,-3],[8,-5],[10,-1],[22,2],[10,-1],[19,-13],[9,-4],[10,-2],[61,-5],[19,-6],[35,-18],[9,-2],[13,0],[12,-1]],[[9508,3154],[11,-5],[12,-8],[9,-7],[6,-9],[-2,-9],[-23,-5],[-17,-8],[-9,-3],[-11,-1],[-28,1],[-40,9],[-13,0],[7,-13],[-15,7],[-15,10],[-26,21],[-1,2],[2,3],[1,3],[-2,4],[-7,2],[-8,0],[-7,1],[-7,5],[14,0],[14,0],[12,3],[10,6],[-12,3],[-14,5],[-10,6],[4,9],[63,58],[4,6],[0,6],[-3,5],[0,6],[7,6],[20,8],[9,-2],[48,-60],[12,-33],[-1,-7],[-4,-6],[-16,-9],[-8,-6],[20,-1],[14,-3]],[[9034,3488],[-1,-22],[-20,-41],[-4,-15],[-3,-6],[-4,2],[-8,0],[-8,-2],[-1,-8],[8,-5],[15,-7],[8,-8],[-10,-10],[7,-4],[-11,-3],[2,-7],[13,-4],[17,2],[-8,-17],[-1,-10],[6,-9],[17,-12],[6,-7],[2,-8],[-3,-7],[-7,-10],[-8,-8],[-7,-4],[3,-4],[8,-24],[-12,-10],[10,-10],[17,-10],[13,-8],[2,-11],[-8,-8],[-15,-4],[-22,2],[-15,7],[-3,9],[1,10],[-4,11],[-10,5],[-29,5],[-10,7],[10,0],[3,0],[-9,3],[-3,3],[1,3],[5,4],[0,3],[-25,0],[-10,10],[2,15],[11,13],[5,-5],[8,-2],[6,2],[3,7],[-3,3],[-14,10],[-5,6],[-7,0],[-5,-8],[-7,0],[-9,2],[-11,2],[-6,-3],[-8,-6],[-10,-5],[-15,1],[-8,7],[0,8],[-2,7],[-15,3],[-1,3],[0,16],[-2,6],[16,4],[9,11],[1,13],[-5,10],[8,2],[7,0],[7,-3],[7,-4],[-3,10],[-7,8],[-2,8],[12,8],[-5,1],[-3,2],[-2,2],[-5,3],[5,10],[-9,11],[-2,9],[24,3],[13,2],[5,3],[0,14],[-2,5],[-4,2],[0,3],[6,5],[6,2],[7,0],[6,-2],[6,-7],[8,-1],[9,1],[8,2],[4,7],[3,23],[7,15],[6,6],[8,4],[12,1],[8,-4],[15,-14],[14,-20]],[[9757,1970],[-22,4],[-28,8],[-22,12],[-15,16],[-9,18]],[[9292,2937],[4,-5],[2,-6],[9,-7],[4,-6],[11,12],[3,5],[7,0],[0,-10],[-2,-6],[-4,-4],[-8,-5],[-11,-3],[-30,-5],[-8,-5],[-1,-8],[6,-6],[10,-4],[12,-2],[18,-2],[11,1],[29,9],[-3,-25],[5,-20],[16,-19],[48,-29],[8,-2],[10,-2],[14,1],[22,7],[34,6],[37,21],[22,7],[20,-1],[5,-9],[-5,-12],[-20,-19],[-7,-15],[-8,-27],[0,-20],[-7,-28],[5,-7],[11,-2],[13,-1],[10,-2],[7,-5],[11,-15],[6,-7],[75,-44],[10,-12],[2,-8],[12,-23],[-4,-9],[1,-5],[13,-5],[-2,-5],[-5,-5],[-3,-1],[-7,-14],[-12,-15],[-18,-12],[-22,-5],[-40,-15],[-6,-1],[0,-9],[8,-5],[20,-7],[0,-4],[-4,-1],[0,-1],[-3,-2],[-13,3],[-10,1],[-23,0],[-13,-2],[-24,-12],[-37,-9],[-20,-14],[-9,-15],[21,-12],[18,-28],[11,-8],[9,0],[34,0],[20,-3],[10,-1],[11,4],[-20,8],[-7,5],[7,4],[12,0],[13,-4],[13,-1],[11,5],[24,-7],[68,-6],[-1,1],[3,2],[6,2],[6,0],[-1,-2],[4,-5],[8,-8],[21,-9],[4,-6],[-7,-8],[4,-2],[5,-4],[5,-2],[-28,1],[-11,-2],[-4,-6],[-4,-14],[4,-3],[14,3],[4,-10],[-8,-12],[-24,-19],[-5,-1],[-12,-5],[-8,-5],[7,-2],[4,-3],[14,-16],[9,-4],[15,-2],[9,-5],[-11,-16],[-33,-22],[-8,-10],[8,-12],[16,-5],[17,3],[16,6],[31,6],[37,18],[4,-7],[-6,-51],[-3,-10],[1,-8],[11,-12],[-24,-9],[-12,-22],[3,-24],[20,-15],[-19,-11],[-41,-18],[-12,-13],[0,-7]],[[7742,2243],[-30,12],[-14,4],[-18,0],[-25,-3],[-28,-8],[-4,-2],[-22,-9],[-27,-9],[-13,0]],[[7561,2228],[4,6],[9,9],[0,3],[-1,6],[1,3],[3,3],[7,3],[3,3],[10,13],[3,6],[3,22],[4,13],[16,25],[22,21],[29,20],[36,16],[40,10],[27,0],[6,-6],[-1,-10],[5,-9],[5,-1],[24,-3],[3,0],[7,-1],[8,-2],[16,-6],[32,-21]],[[7882,2351],[-64,-30],[32,-5],[-3,-19],[-38,-13],[-67,-41]],[[8145,2344],[-75,28]],[[8070,2372],[4,4],[13,11],[4,6],[-2,12],[-21,21],[-5,12],[5,13],[12,8],[14,7],[11,10],[-8,12],[1,13],[7,27],[0,52],[-7,27],[1,13],[10,12],[8,6],[11,6],[12,3],[11,-3],[12,-4],[11,0],[10,2],[13,0],[20,-2],[20,-6],[17,-7],[7,-7],[9,-5],[82,-26],[9,-5],[23,-18],[16,-5],[21,-20],[14,-6],[10,0],[22,8],[23,5],[18,5],[11,10],[8,51],[-4,12],[-4,3],[-4,4],[-5,4],[-1,5],[2,8],[10,12],[2,8],[1,7],[2,5],[5,4],[5,2]],[[8763,439],[-5,-6],[-7,0],[-13,2],[-19,-1],[-18,-2],[-12,3],[-9,5],[-9,4],[-1,3],[9,5],[17,13],[19,6],[29,-1],[14,-3],[4,-3],[2,-8],[-1,-17]],[[8642,563],[5,2],[37,12],[16,6],[1,1],[14,10],[88,119],[5,2],[7,0],[6,1],[0,5],[-1,5],[-2,32],[2,7],[31,58],[0,11],[6,3],[5,3],[4,3],[2,5],[5,16],[0,9],[-4,5],[-6,4],[-8,6],[-6,7],[-2,4],[2,7],[-3,12],[-1,7],[4,8],[4,8],[1,7],[-23,21],[-25,28],[-19,10],[-10,1],[-11,1],[-11,-1],[-19,-6],[-8,3],[-8,3],[-24,-1],[-48,5],[-27,-2],[-9,0],[-15,3],[-15,5],[-35,21],[-13,5],[-26,8],[-9,4],[0,12],[-1,3],[-6,3],[-9,2],[-8,1],[-4,1],[0,2]],[[8471,1080],[-1,5],[4,4],[8,4],[7,5],[7,15],[3,32],[9,13]],[[8638,1434],[215,-1]],[[8853,1433],[-24,-22],[-2,-27],[-5,-13],[-11,-6],[-47,-33],[-21,-23],[-16,-26],[-8,-29],[-3,-28],[3,-11],[14,-23],[3,-12],[9,-6],[17,-4],[13,3],[-3,17],[34,-13],[45,-33],[27,-16],[20,7],[21,-5],[16,-11],[7,-10],[1,-24],[4,-9],[30,-37],[11,-9],[4,-5],[1,-7],[-1,-13],[1,-7],[4,-4],[9,-8],[50,-79],[4,-11],[0,-12],[-4,-13],[-11,-11],[-3,-7],[7,-12],[-4,-7],[-4,-4],[-7,-18],[-18,-26],[-76,-53],[-99,-83],[-64,-66],[-16,-12],[-19,-10],[-16,-5],[-17,0],[-50,2],[-15,2],[-2,2]],[[9757,1970],[-1,-9],[9,-16],[15,-16],[20,-11],[31,-10],[4,-4],[4,-6],[25,-21],[25,-9],[53,-3],[21,-5],[-7,-13],[-4,-14],[-3,-29],[4,-14],[20,-30],[9,-29],[6,-13],[2,-12],[-12,-12],[-12,-5],[-11,-3],[-9,-4],[-4,-9],[4,-3],[24,-10],[-8,-13],[-1,-29],[-12,-12],[8,-3],[34,-11],[8,0],[-6,-12],[-24,-19],[-6,-11],[-3,-4],[-8,-2],[-10,-1],[-7,-3],[-6,-5],[-21,-33],[-7,-6],[-33,-19],[-15,-13],[-8,-17],[-3,-22],[-15,-11],[-35,-3],[-40,5],[-31,8],[-26,-14],[-15,-17],[-6,-19],[-2,-15],[6,-7],[28,-14],[9,-6],[4,-9],[2,-13],[-2,-11],[-8,-5],[-32,7],[-18,17],[-24,39],[-26,17],[-31,9],[-22,-5],[1,-25],[-7,0],[-3,3],[-11,9],[-4,-13],[11,-13],[14,-12],[16,-21],[18,-10],[20,-8],[10,-6],[3,-13],[-14,-25],[-15,-54],[-2,-89],[-18,-48],[-4,-55],[-6,-10],[-15,2],[-4,9],[-4,31],[-3,6],[-35,15],[-4,5],[0,8],[1,7],[-1,7],[-25,28],[-14,10],[-5,12],[-13,77],[2,14],[13,38],[-1,13],[-11,22],[-3,13],[0,16],[-3,7],[-13,3],[-26,5],[-20,7],[-40,32],[-7,12],[9,28],[1,12],[-12,13],[-21,12]],[[8375,819],[5,-28],[23,-2],[27,0],[11,-1]],[[8441,788],[-24,-42],[-20,-14],[-20,0],[-50,7],[-40,-9],[-25,4],[-105,29],[-28,4],[-44,12],[-12,0],[-13,-1],[-12,0],[-25,6],[-67,23],[-7,-4],[-32,9],[-10,4],[-4,4],[-3,5],[-3,5],[-8,2],[-18,3],[-144,48],[-54,14]],[[7686,915],[10,19],[-1,6],[5,6],[94,-22],[150,-56],[77,-18],[86,-27],[41,-3],[177,-3],[50,2]],[[8642,563],[-4,6],[-2,48],[-6,12],[-7,9],[-10,6],[-14,4],[-22,1],[-6,2],[-6,5],[-5,6],[-2,6],[-4,6],[-11,4],[-12,2],[-8,2],[-11,12],[5,10],[9,9],[5,9],[3,10],[7,10],[17,16],[40,28],[15,18],[3,24],[-5,10],[-14,22],[-3,8],[-10,5],[-10,1]],[[8574,874],[-1,1],[-5,12],[2,11],[-3,14],[6,18],[16,15],[14,14],[2,9],[1,10],[-25,10],[-114,23]],[[8467,1011],[-64,13],[21,29],[31,19],[16,8]],[[8467,1011],[-36,-42],[17,-37],[-86,4],[0,-81],[13,-36]],[[5593,1711],[-12,-13],[6,-13],[15,-12],[11,-12],[-7,-11],[-9,-7],[-19,-18],[-12,-5],[-11,0],[-11,0],[-13,-2],[-20,-16],[-15,-27],[-15,-52],[-2,-28],[-6,-11],[-43,-35],[-36,-54],[-14,-15],[-20,-9],[-11,-8],[-6,-2],[-23,0],[-10,2],[-50,10],[-80,25],[-25,13],[-39,47],[-1,51],[7,8]],[[5138,1227],[21,1],[8,2],[11,8],[40,11],[16,11],[11,4],[17,1],[10,1]],[[5201,1260],[-19,-11],[-6,0],[-10,0],[-6,1],[-2,8],[14,13],[8,1],[12,4],[15,-1],[-1,-7],[-4,-1],[-4,-1],[3,-6]],[[7223,3489],[-21,-34],[20,-22]],[[7222,3433],[-29,-9],[-17,-7],[-22,-21]],[[7269,3474],[-7,-4],[-2,-5],[2,-21],[-12,-2],[-28,-9]],[[7353,3404],[-3,-4],[-3,-6],[0,-2],[-6,-3],[-5,6],[2,3],[-9,2],[-10,-2],[-7,-5],[-1,4],[6,4],[11,1],[3,1],[-2,0],[4,3],[3,2],[6,3],[-4,3],[3,2],[3,0],[4,2],[11,3],[6,-4],[-4,-5],[-2,-4],[-6,-4]],[[7336,3442],[-19,-11],[-20,-11],[-19,-13],[-13,-7],[-19,-1],[-11,-4],[-14,5],[1,11],[0,10],[14,10],[34,9],[12,2],[18,-7],[12,3],[18,7],[6,-3]],[[6173,3621],[14,18],[1,6],[38,38],[4,13]],[[5857,3708],[-5,-4],[-9,-9],[2,-1],[3,-3],[-1,-4],[-11,-4],[-5,-14],[-47,-5],[-75,-2]],[[7480,1561],[12,17],[18,10],[7,6],[2,5],[-2,19]],[[9025,1584],[-8,-4],[-12,-13],[-3,-13],[5,-39],[-1,-13],[-4,-6],[-8,-7],[-2,-5],[-6,-7],[-36,-20],[-29,-10],[-35,-5],[-33,-9]],[[8574,874],[-1,0],[-11,0],[-39,0],[-12,7],[-11,3],[-12,-2],[-2,-5],[2,-16],[-3,-6],[-10,-8],[-34,-59]],[[7742,2243],[88,-36],[8,-5],[11,-16],[8,-7],[11,-4],[14,0],[1,0]],[[7531,2160],[10,8],[16,18],[13,9],[4,6],[-4,7],[-7,6],[-3,6],[1,8]],[[7882,2351],[11,-4],[18,-3],[60,-1],[-10,-11],[-8,-12],[-4,-13],[0,-14],[7,0],[8,16],[12,11],[21,3],[30,-5],[5,4],[16,8],[4,1],[14,3],[4,1],[0,3],[-3,4],[-3,3],[-1,2],[4,19],[3,6]],[[8782,2626],[21,3],[57,19]],[[2319,3279],[-38,-9],[-47,-7],[-12,-3],[-20,-7],[-11,-3],[-12,-1],[-25,2],[-12,-1],[-10,-3],[-21,-7],[-11,-2],[-12,-2],[-22,-2],[-50,-2],[-29,-4],[-27,-8],[-31,-12],[-23,4],[-23,-7],[-18,-13],[-7,-15],[4,-19],[22,-26],[9,-15],[-7,-33],[-13,-4],[-16,3],[-14,6],[-6,9],[4,11],[-4,3],[-18,1],[-12,-4],[1,-9],[4,-11],[-4,-9],[11,-4],[7,-5],[1,-6],[-4,-6],[27,2],[16,-8],[-2,-10],[-27,-1],[2,-9],[-7,-12],[-10,-11],[-10,-8],[-6,-5],[-1,-5],[-4,-3],[-21,-2],[-6,-3],[-32,-30]],[[1477,3037],[20,9],[7,3],[7,1],[5,1],[5,11],[5,1],[7,1],[6,3],[9,6],[82,35],[8,7],[11,16],[49,28],[11,10],[2,7],[5,9],[8,10],[38,29],[11,6],[-12,13],[17,9],[51,15],[7,6],[36,46],[8,6],[5,-20],[0,-9],[-9,-5],[-5,-4],[17,-8],[22,-4],[12,6],[3,5],[6,4],[8,3],[4,3],[5,7],[1,3],[-2,2],[-19,20],[-6,10],[0,12],[4,10],[6,3],[22,-1],[12,2],[21,9],[17,2],[28,-3],[16,1],[16,6],[9,9],[2,11],[-4,10],[-7,8],[7,1],[3,1],[4,0],[7,-2],[10,6],[14,5]],[[7934,3854],[-20,1],[-21,-2],[-21,-4],[-13,-7]],[[8300,4055],[-10,-9],[-1,-8],[1,-7],[3,-3],[3,-1],[2,-6],[3,-3],[5,-3],[3,-1],[3,-1],[6,-2],[12,-2],[9,-1],[6,-2],[4,-15],[5,0],[5,5],[2,7],[7,0],[1,-19],[-1,-6],[-3,-5]],[[3443,6164],[1,0],[5,5],[4,6],[-17,1],[-8,2],[-3,3],[-1,7],[-4,3],[-8,1],[-12,0],[-11,4],[-10,8],[-11,4]],[[3418,6920],[35,2],[15,-6],[-7,-17],[12,6],[12,13],[11,6],[8,-2],[12,-1],[11,1],[4,7],[-6,4],[-14,-2],[-14,-3],[-8,1],[3,8],[37,18]],[[4260,6035],[0,-7]],[[4260,6028],[1,-1],[-4,-6],[-4,-4]],[[4253,6017],[-21,-1],[-8,4],[-11,3]],[[4213,6023],[11,9]],[[4224,6032],[8,-3],[13,2],[6,4],[9,0]],[[4187,6055],[-2,-6],[32,-12]],[[4217,6037],[7,-5]],[[4213,6023],[-21,-10]],[[4192,6013],[-27,0]],[[4165,6013],[-22,20],[-9,13],[-2,9]],[[4132,6055],[30,1]],[[4162,6056],[10,0],[5,1],[10,-2]],[[4118,6095],[-6,-3],[8,-5],[9,-4],[11,-12],[4,-6],[6,0],[3,-4]],[[4153,6061],[9,-5]],[[4132,6055],[-5,16],[-7,8],[-10,9],[-11,8]],[[4153,6061],[3,3],[1,5],[8,1],[21,1],[8,4],[-4,3]],[[4190,6078],[7,5],[8,0],[6,3],[12,1]],[[4223,6087],[-13,-8],[-15,-10],[-8,-9],[0,-5]],[[4306,6131],[-3,-5],[-11,-2],[-5,-5],[-9,-3],[-24,-1],[-16,-1],[-14,-5],[-11,-5],[-1,-8]],[[4212,6096],[-4,2],[-5,0],[-6,3],[1,7],[6,0],[1,6],[-1,4],[-9,5]],[[4137,6092],[11,-2],[6,-7],[4,-4],[8,0],[14,-4],[10,3]],[[4212,6096],[0,-4],[12,-2],[-1,-3]],[[4316,6077],[-8,-2],[-5,-1],[-11,-9],[-8,0],[3,-5],[-4,-3],[-5,-8],[3,-5]],[[4281,6044],[12,-7],[-5,-1],[-3,-7],[-11,2],[-14,-3]],[[4260,6035],[-2,3],[-6,0],[-2,2],[-11,0],[-3,-1],[-4,2],[-10,2],[-5,-6]],[[4308,6044],[-5,2],[-8,1],[-9,1],[-5,-4]],[[4316,5993],[-17,10],[-4,0],[-11,0],[-3,1]],[[4281,6004],[-1,2],[-5,2],[-6,-1]],[[4269,6007],[-2,2],[1,3],[-15,5]],[[4269,6007],[-4,-3],[1,-5]],[[4266,5999],[-3,-3],[-5,1],[-1,4],[-1,3],[5,5],[-8,3],[-4,-2],[-9,1],[-1,-3],[6,-3],[-1,-4],[-15,-4],[-10,-3]],[[4219,5994],[-10,2],[-4,4],[-1,6],[-9,2],[-3,5]],[[4219,5994],[13,-12]],[[4232,5982],[-13,-1],[-11,4],[-14,-1],[-3,5],[1,8],[-22,1]],[[4170,5998],[-5,15]],[[4232,5982],[13,-3],[-1,-23]],[[4244,5956],[0,-9],[-24,-7]],[[4220,5940],[-8,3],[-4,5],[-11,4],[-3,8],[-10,5],[-1,4],[-10,2],[-15,10]],[[4158,5981],[7,6],[5,11]],[[4220,5940],[-2,-3],[1,-4],[-11,-7],[-2,-8],[-5,-3]],[[4145,5975],[10,4],[3,2]],[[4244,5956],[8,4],[9,-1],[64,-9]],[[4266,5999],[8,0],[2,4],[5,1]],[[4845,5619],[-16,-10],[-9,0],[-17,3],[-6,-1],[-13,-5],[-30,-6]]],"transform":{"scale":[0.0009663726789678955,0.0016468321637163642],"translate":[116.95492597700016,4.655707098000107]}};
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
