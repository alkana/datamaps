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
  Datamap.prototype.rouTopo = {"type":"Topology","objects":{"rou":{"type":"GeometryCollection","geometries":[{"type":"Polygon","properties":{"name":"Dolj"},"id":"RO.DJ","arcs":[[0,1,2,3,4]]},{"type":"Polygon","properties":{"name":"Gorj"},"id":"RO.GJ","arcs":[[-5,5,6,7,8]]},{"type":"Polygon","properties":{"name":"Mehedinti"},"id":"RO.MH","arcs":[[-4,9,10,-6]]},{"type":"Polygon","properties":{"name":"Olt"},"id":"RO.OT","arcs":[[11,12,13,-2,14]]},{"type":"Polygon","properties":{"name":"Teleorman"},"id":"RO.TR","arcs":[[15,16,-13,17,18]]},{"type":"Polygon","properties":{"name":"Bucharest"},"id":"RO.BI","arcs":[[19]]},{"type":"Polygon","properties":{"name":"Calarasi"},"id":"RO.CL","arcs":[[20,21,22,23,24]]},{"type":"Polygon","properties":{"name":"Dâmbovita"},"id":"RO.DB","arcs":[[25,26,-19,27,28,29]]},{"type":"Polygon","properties":{"name":"Giurgiu"},"id":"RO.GR","arcs":[[-23,30,-16,-27,31]]},{"type":"Polygon","properties":{"name":"Ialomita"},"id":"RO.IL","arcs":[[32,33,-25,34,35,36]]},{"type":"Polygon","properties":{"name":"Constanta"},"id":"RO.CT","arcs":[[37,-21,-34,38,39]]},{"type":"Polygon","properties":{"name":"Arad"},"id":"RO.AR","arcs":[[40,41,42,43,44]]},{"type":"Polygon","properties":{"name":"Bihor"},"id":"RO.BH","arcs":[[45,46,47,-45,48,49]]},{"type":"Polygon","properties":{"name":"Caras-Severin"},"id":"RO.CS","arcs":[[-7,-11,50,51,52]]},{"type":"Polygon","properties":{"name":"Timis"},"id":"RO.TM","arcs":[[-43,53,-52,54]]},{"type":"Polygon","properties":{"name":"Botosani"},"id":"RO.BT","arcs":[[55,56,57]]},{"type":"Polygon","properties":{"name":"Alba"},"id":"RO.AB","arcs":[[58,59,60,61,62,-41,-48]]},{"type":"Polygon","properties":{"name":"Bistrita-Nasaud"},"id":"RO.BN","arcs":[[63,64,65,66]]},{"type":"Polygon","properties":{"name":"Cluj"},"id":"RO.CJ","arcs":[[-66,67,-59,-47,68,69]]},{"type":"Polygon","properties":{"name":"Hunedoara"},"id":"RO.HD","arcs":[[70,-8,-53,-54,-42,-63]]},{"type":"Polygon","properties":{"name":"Maramures"},"id":"RO.MM","arcs":[[71,-67,-70,72,73,74]]},{"type":"Polygon","properties":{"name":"Mures"},"id":"RO.MS","arcs":[[75,76,77,-60,-68,-65,78]]},{"type":"Polygon","properties":{"name":"Salaj"},"id":"RO.SJ","arcs":[[-69,-46,79,-73]]},{"type":"Polygon","properties":{"name":"Satu Mare"},"id":"RO.SM","arcs":[[-74,-80,-50,80]]},{"type":"Polygon","properties":{"name":"Arges"},"id":"RO.AG","arcs":[[-28,-18,-12,81,82,83]]},{"type":"Polygon","properties":{"name":"Sibiu"},"id":"RO.SB","arcs":[[84,-83,85,-61,-78]]},{"type":"Polygon","properties":{"name":"Vâlcea"},"id":"RO.VL","arcs":[[-82,-15,-1,-9,-71,-62,-86]]},{"type":"Polygon","properties":{"name":"Brasov"},"id":"RO.BV","arcs":[[86,87,88,-29,-84,-85,-77,89]]},{"type":"Polygon","properties":{"name":"Covasna"},"id":"RO.CV","arcs":[[90,91,92,-87,93]]},{"type":"Polygon","properties":{"name":"Harghita"},"id":"RO.HR","arcs":[[94,95,-94,-90,-76,96]]},{"type":"Polygon","properties":{"name":"Iasi"},"id":"RO.IS","arcs":[[97,98,99,-56,100]]},{"type":"Polygon","properties":{"name":"Neamt"},"id":"RO.NT","arcs":[[-99,101,102,-95,103]]},{"type":"Polygon","properties":{"name":"Prahova"},"id":"RO.PH","arcs":[[104,-36,105,-30,-89]]},{"type":"Polygon","properties":{"name":"Suceava"},"id":"RO.SV","arcs":[[-100,-104,-97,-79,-64,-72,106,-57]]},{"type":"Polygon","properties":{"name":"Bacau"},"id":"RO.BC","arcs":[[107,108,-91,-96,-103]]},{"type":"Polygon","properties":{"name":"Braila"},"id":"RO.BR","arcs":[[109,-39,-33,110,111,112]]},{"type":"Polygon","properties":{"name":"Buzau"},"id":"RO.BZ","arcs":[[-111,-37,-105,-88,-93,113]]},{"type":"Polygon","properties":{"name":"Galati"},"id":"RO.GL","arcs":[[114,115,-113,116,117]]},{"type":"Polygon","properties":{"name":"Vaslui"},"id":"RO.VS","arcs":[[118,-118,119,-108,-102,-98]]},{"type":"Polygon","properties":{"name":"Vrancea"},"id":"RO.VN","arcs":[[-120,-117,-112,-114,-92,-109]]},{"type":"Polygon","properties":{"name":"Ilfov"},"id":"RO.IF","arcs":[[-35,-24,-32,-26,-106],[-20]]},{"type":"Polygon","properties":{"name":"Tulcea"},"id":"RO.TL","arcs":[[-40,-110,-116,120]]}]}},"arcs":[[[3735,2319],[8,-51],[1,-17],[5,-20],[8,-15],[19,-16],[16,-11],[35,-32],[11,-13],[9,-19],[22,-107],[12,-33],[17,-38],[30,-45]],[[3928,1902],[-40,-69],[-14,-38],[-2,-16],[1,-16],[5,-16],[9,-15],[42,-36],[11,-17],[28,-60],[9,-13],[10,-7],[13,-3],[13,-10],[15,-23],[14,-43],[12,-27],[13,-21],[23,-28],[11,-18],[9,-24],[9,-32],[11,-24],[11,-19],[38,-36],[27,-16],[12,-13],[20,-31],[6,-20],[0,-17],[-4,-15],[-5,-17],[-2,-28],[2,-32],[8,-53],[22,-58],[0,-13],[-7,-6],[-12,3],[-13,5],[-11,3],[-10,-2],[-6,-6],[-5,-9],[-1,-11],[0,-27],[-4,-32],[-4,-17],[-3,-23],[2,-14],[6,-13],[9,-8],[9,-3],[33,-2],[14,-6],[14,-17],[5,-20],[2,-22],[-2,-19],[-3,-14],[-21,-17],[-9,-11],[-6,-19],[2,-17],[15,-37],[3,-18],[-2,-16],[-13,-59],[-6,-14],[-15,-16],[-3,-10],[-3,-25],[-5,-12],[-19,-23],[-7,-15],[-58,-182],[0,-1]],[[4131,226],[-370,138],[-60,53],[-24,6],[-89,-29],[-16,4],[-30,7],[-114,93],[-169,13],[-96,-20],[-39,-31],[-38,-12],[-31,-20],[-84,-11],[-141,-19],[-32,12],[-27,34],[-13,41],[-1,49],[26,162],[12,49],[21,20],[22,5],[42,20],[23,5],[37,30],[18,66],[-10,67],[-24,16]],[[2924,974],[87,133],[33,14],[11,-2],[8,7],[4,26],[0,25],[-4,27],[-7,35],[-2,28],[3,24],[23,70],[3,18],[5,55],[5,38],[6,27],[9,19],[56,48],[14,2],[21,-6],[6,4],[2,14],[-3,12],[-6,9],[-8,7],[-11,3],[-22,4],[-12,3],[-8,10],[-4,13],[0,16],[8,46],[1,18],[5,12],[8,11],[21,10],[16,12],[14,23],[7,17],[7,15],[23,29],[0,9],[-6,4],[-10,3],[-8,5],[4,7],[14,10],[66,7],[13,12],[17,10],[27,9],[58,-4],[15,24]],[[3433,1946],[97,101],[100,46],[50,4],[9,8],[5,12],[1,17],[-1,15],[-2,14],[-2,13],[0,13],[4,33],[1,24],[-1,20],[-3,19],[-1,16],[0,14],[3,18],[5,9],[6,3],[7,-2],[14,-8],[10,-16]],[[3433,1946],[-18,53],[-10,23],[-60,85],[-68,69],[-25,17],[-183,76],[-20,15],[-24,24],[-81,112],[-95,156],[-6,24],[-4,24],[-4,47],[-2,20],[-7,37],[-3,20],[0,19],[5,37],[5,18],[0,19],[-5,19],[-12,19],[-27,24],[-18,24],[-12,21],[-7,18],[-11,14],[-12,9],[-21,4],[-50,-8],[-16,5],[-19,15],[-46,85],[-41,28]],[[2536,3118],[6,46],[-6,18],[-7,12],[-10,5],[-40,3],[-14,7],[-9,10],[-3,17],[2,22],[8,30],[30,58],[72,93]],[[2565,3439],[225,117],[12,4],[13,-11],[8,-14],[9,-11],[13,-7],[45,-4],[10,-6],[9,-11],[8,-11],[11,-6],[16,1],[67,43],[27,2],[15,-3],[33,-21],[13,-1],[17,6],[57,51],[17,9],[47,13],[36,26],[20,9],[27,-1],[17,-6],[14,-12],[19,-20],[10,-1],[10,5],[19,22],[60,48],[66,32]],[[3535,3681],[32,-15],[51,-1],[12,-4],[20,-17],[16,-4],[19,-1],[65,10],[9,0],[9,-6],[19,-21],[8,-17],[4,-23],[-14,-84],[-2,-42],[9,-59],[11,-40],[4,-29],[-1,-27],[-17,-73],[-5,-31],[4,-73],[-1,-29],[-29,-170],[-12,-48],[-5,-29],[-2,-41],[15,-249],[-4,-115],[-15,-124]],[[2924,974],[-21,14],[-48,10],[-39,24],[-227,229],[-1,0],[-5,32],[4,104],[-8,30],[-21,13],[-43,10],[-41,27],[-35,44],[-28,57],[-19,62],[-1,17],[2,34],[-1,16],[-4,15],[-23,30],[-3,18],[1,28],[2,29],[5,20],[7,10],[10,4],[37,3],[14,9],[9,21],[3,37],[6,36],[16,22],[21,10],[22,-2],[22,-13],[38,-38],[23,-8],[21,6],[23,16],[19,27],[6,40],[-53,87],[-16,16],[-83,15],[-36,26],[-36,42],[-74,119],[-15,13],[-20,6],[-26,2],[-11,-13],[-37,-59],[-20,-18],[-44,-15],[-16,-17],[-6,-34],[-120,-317],[-14,-21],[-25,-9],[-23,3],[-24,15],[-18,27],[-11,62],[-10,14],[-12,11],[-11,15],[-6,17],[-4,27],[-2,15]],[[1894,2046],[26,6],[32,9],[14,-3],[26,-11],[13,-1],[11,3],[12,9],[9,15],[5,27],[-1,27],[-5,29],[-8,37],[-1,28],[2,29],[4,25],[7,32],[11,36],[24,60],[9,35],[5,28],[0,18],[4,16],[6,11],[16,4],[11,-3],[10,-8],[36,-53],[7,-8],[8,-5],[11,-1],[34,1],[10,-3],[7,-7],[7,-9],[7,-23],[5,-10],[8,-6],[12,-1],[15,4],[11,13],[11,24],[10,48],[17,103],[26,98],[44,107],[12,51],[6,34],[3,29],[2,23],[4,26],[8,31],[34,79],[45,69]],[[4436,2594],[12,-51],[7,-9],[9,-5],[9,6],[43,53],[8,13],[4,13],[10,39],[12,24],[9,9],[10,-2],[5,-12],[2,-17],[0,-19],[-2,-21],[1,-25],[8,-29],[47,-143],[12,-24],[21,-30],[17,-8],[17,1],[16,5],[19,-2],[8,-9],[5,-11],[-1,-9],[-5,-5],[-19,-12],[-9,-9],[-6,-11],[-3,-13],[3,-20],[26,-64],[8,-33],[5,-48],[2,-26],[3,-21],[8,-35],[10,-97],[-1,-15],[-5,-28],[-2,-18],[0,-19],[13,-72],[4,-96],[6,-32],[7,-19],[10,-10],[51,-5],[23,-23]],[[4873,1600],[-14,-50],[-1,-22],[0,-35],[8,-95],[4,-102],[-3,-48],[-12,-73],[-2,-59],[2,-35],[5,-34],[2,-40],[-6,-20],[-14,-13],[-36,-10],[-13,-7],[-13,-13],[-31,-50],[-11,-9],[-15,-6],[-18,-2],[-18,-9],[-19,-15],[-22,-43],[-7,-32],[1,-41],[33,-124],[37,-112],[46,-111],[6,-34],[-1,-16],[-10,-12],[-30,-21],[-14,-16],[-12,-17],[-21,-42],[-1,-3],[-1,-1]],[[4672,228],[-171,95],[-35,6],[-37,-17],[-59,-66],[-19,-8],[-22,-2],[-188,-14],[-10,4]],[[3928,1902],[41,37],[11,5],[14,4],[11,-3],[12,-8],[9,-11],[9,-15],[10,-26],[8,-10],[8,-1],[13,8],[33,71],[11,17],[13,11],[11,3],[14,-1],[25,-10],[10,0],[11,4],[31,26],[8,16],[7,45],[5,18],[14,15],[10,0],[6,-4],[2,-9],[-2,-22],[0,-14],[3,-14],[5,-15],[8,-14],[10,-8],[7,10],[9,10],[-3,40],[-8,50],[-12,40],[-12,27],[5,37],[-15,93],[-5,47],[0,18],[20,31],[17,38],[10,27],[6,24],[7,48],[2,29],[4,26],[5,25],[30,76],[8,16],[8,14],[12,9],[9,1],[11,-4],[8,-18],[6,-16],[-2,-101]],[[5573,1850],[22,-26],[3,-14],[-1,-18],[-18,-47],[-22,-81],[-5,-28],[3,-18],[8,-23],[11,-27],[14,-57],[10,-27],[14,-15],[92,-17],[16,-8],[30,-41],[21,-22],[9,-14],[6,-25],[4,-33],[1,-56],[-3,-32],[5,-62],[0,-33],[-2,-24],[-9,-10],[-10,-5],[-12,-3],[-9,-5],[-10,-11],[-4,-17],[-5,-46],[-5,-22],[-12,-40],[-6,-27],[-2,-29],[0,-33],[9,-124],[27,-225],[12,-54],[26,-53],[6,-28],[18,-221]],[[5805,149],[-65,-3],[-19,-20],[-17,-24],[-22,-20],[-24,-16],[-20,-7],[-20,-15],[-24,-4],[-47,4],[-7,-1],[-16,-5],[-44,-29],[-24,-9],[-46,9],[-38,34],[-37,41],[-3,3],[-35,31],[-44,16],[-137,15],[-124,66],[-224,-23],[-49,11],[-47,25]],[[4873,1600],[45,16],[58,-21],[18,1],[16,6],[11,9],[8,9],[14,25],[10,12],[11,2],[33,-7],[26,10],[14,9],[24,34],[22,19],[48,13],[24,0],[18,-4],[17,-7],[34,-24]],[[5324,1702],[23,-14],[12,2],[18,9],[21,29],[12,24],[16,41],[6,13],[14,24],[5,12],[0,13],[-8,22],[0,13],[6,8],[14,3],[24,-6],[59,-41],[27,-4]],[[6294,1627],[-50,23],[-8,-32],[33,-120],[-29,-36],[-50,97],[-59,20],[-69,110],[0,68],[69,9],[0,68],[-55,36],[51,129],[71,39],[9,-146],[82,-29],[-25,-110],[46,-58],[-16,-68]],[[8226,1524],[-31,-109],[-27,-52],[-36,-31],[-153,-57],[-38,-45],[-21,-20],[-44,-11],[-89,2],[-41,-22],[-56,-49],[-9,-16],[-8,-20],[-19,-22],[-22,-18],[-17,-7],[-161,37],[-16,-19],[-13,-17],[-13,-28],[0,-1]],[[7412,1019],[-2,2],[-26,-3],[-22,18],[-111,33],[-77,70],[-28,-25],[-124,-19],[-100,-88],[-38,-17],[-47,0],[-12,-4],[-22,-20],[-10,-4],[-21,-3],[-35,-19],[-210,-45]],[[6527,895],[-2,30],[4,22],[7,27],[31,65],[7,29],[2,36],[-3,53],[-8,47],[-15,42],[-24,39],[-94,82],[-49,85]],[[6383,1452],[12,57],[27,63],[27,53],[19,26],[19,20],[64,43],[12,19],[7,19],[4,17],[-1,12],[-6,8],[-19,10],[-15,13],[-10,17],[1,27],[4,13],[18,19]],[[6546,1888],[84,65],[17,4],[15,-5],[15,-12],[34,-37],[13,-7],[15,-2],[18,3],[25,13],[11,9],[9,12],[16,30],[7,10],[10,3],[9,-5],[34,-50],[18,-16],[20,-9],[27,1],[16,4],[16,1],[12,-5],[32,-27],[19,-6],[61,16],[21,-2],[25,-8],[77,-47],[26,-9],[32,1],[61,16],[188,-5],[19,7],[30,17],[27,6],[32,-2],[148,-41],[30,-22],[59,-19],[13,-9],[17,-21],[22,-37],[44,-43],[96,-60],[160,-76]],[[6118,2353],[-27,-46],[-13,-15],[-7,-21],[-3,-23],[-7,-14],[-22,-24],[-5,-14],[0,-13],[5,-12],[36,-19],[4,-17],[-5,-19],[-10,-21],[-51,-86],[-24,-29]],[[5989,1980],[-326,-28],[-29,-13],[-21,-16],[-12,-18],[-28,-55]],[[5324,1702],[23,60],[4,41],[-3,16],[-4,18],[-3,20],[-2,29],[6,21],[19,53],[1,20],[-4,16],[-8,9],[-10,6],[-24,6],[-11,6],[-9,9],[-29,42],[-11,21],[-27,77],[-4,27],[5,18],[24,22],[4,10],[-9,15],[-12,14],[-15,26],[-2,25],[3,25],[16,42],[5,19],[2,23],[9,177],[-3,34],[-17,117],[-2,43],[2,35],[6,20],[30,50],[5,19],[0,20],[-5,27],[-12,42],[-34,55],[-14,37],[-12,85],[1,42],[6,29],[5,13],[11,39],[5,10],[6,6],[7,-2],[7,-10],[12,-29],[8,-10],[9,-4],[10,3],[9,10],[10,16],[8,22],[10,35],[8,45],[2,50],[5,35],[6,28],[8,24],[16,39],[7,23],[5,36],[0,25],[-4,22],[-5,20],[-17,43]],[[5357,3759],[64,23],[20,36],[6,23],[9,27],[7,14],[21,15]],[[5484,3897],[20,-136],[7,-96],[5,-26],[7,-19],[10,-12],[11,-10],[10,-12],[11,-18],[13,-29],[6,-26],[3,-21],[0,-18],[-2,-42],[1,-30],[16,-40],[9,-17],[12,-17],[12,-25],[58,-163],[44,-71],[9,-23],[4,-24],[6,-92],[9,-53],[8,-29],[9,-23],[11,-14],[10,-8],[13,-6],[12,-1],[12,4],[9,6],[8,2],[9,-5],[10,-18],[14,-35],[5,-30],[1,-31],[-4,-30],[-2,-32],[4,-39],[9,-21],[11,-12],[50,-11],[17,-8],[17,-16],[73,-130],[13,-16],[21,-17],[13,-4]],[[6527,895],[-88,-20],[-23,-5],[-84,-54],[-85,-33],[-37,-29],[-39,-64],[-19,-42],[-7,-33],[-127,-139],[-11,-25],[-8,-31],[-50,-94],[-32,-27],[-35,-53],[-2,-8],[-24,-61],[-44,-28],[-7,0]],[[5989,1980],[26,-83],[-1,-27],[-2,-35],[-6,-23],[-16,-49],[-11,-42],[-9,-98],[6,-41],[11,-27],[28,-20],[20,-10],[15,-15],[8,-26],[8,-12],[10,-4],[12,1],[11,-1],[13,-9],[80,-106],[18,-16],[16,-11],[17,-7],[16,-4],[14,1],[14,5],[13,11],[26,32],[57,88]],[[7357,2528],[87,-52],[17,-3],[21,1],[24,18],[18,9],[15,-4],[13,-10],[29,-16],[289,-13],[41,13],[24,12],[19,14],[23,12],[49,8],[23,-6],[18,-17],[8,-17],[33,-44]],[[8108,2433],[-17,-14],[-12,-24],[-7,-29],[8,-40],[15,-38],[19,-30],[20,-12],[26,-5],[19,-16],[56,-91],[4,-13],[-1,-20],[-6,-51],[-7,-22],[0,-77],[-7,-20],[-12,-7],[4,-17],[13,-21],[24,-19],[26,-14],[20,-5],[8,-17],[9,-40],[7,-45],[2,-32],[-13,-27],[-43,-53],[-10,-16],[-27,-94]],[[6546,1888],[-25,28],[-33,25],[-9,19],[-3,17],[2,19],[3,18],[6,18],[6,16],[9,14],[42,42],[7,12],[4,18],[-3,15],[-9,15],[-65,52],[-10,21],[-3,18],[0,18],[-3,16],[-8,23],[-2,17],[-1,36],[-6,10],[-10,6],[-43,9],[-20,9]],[[6372,2399],[38,52],[36,24],[15,2],[12,-5],[25,-20],[24,-2],[11,7],[10,14],[9,16],[14,17],[14,5],[57,-7],[16,6],[14,11],[11,13],[7,11],[14,35],[27,49]],[[6726,2627],[24,-17],[35,-46],[19,-8],[25,-2],[70,8],[63,-17],[12,-6],[12,-5],[16,0],[37,10],[20,-1],[25,-13],[31,-29],[15,-9],[15,0],[15,13],[10,17],[13,12],[17,3],[25,-11],[16,-12],[15,-14],[10,-14],[6,-15],[1,-15],[-1,-15],[-1,-13],[-1,-12],[2,-10],[4,-6],[8,-1],[7,2],[30,18],[24,9],[10,8],[5,9],[-5,12],[-7,10],[-12,11],[-7,11],[1,13],[4,9],[23,17]],[[9032,2226],[-4,-31],[3,-35],[9,-9],[56,14],[25,22],[23,34],[22,41],[-15,44],[74,-34],[17,-18],[4,-37],[-9,-44],[-18,-34],[-24,-11],[18,36],[17,42],[3,36],[-24,20],[0,-16],[8,-15],[-2,-7],[-20,-7],[-16,14],[-6,2],[-5,-6],[-4,-11],[-6,-14],[-20,-23],[-33,-51],[-19,-15],[-51,-38],[-14,-19],[18,49],[3,23],[-15,3],[-14,-4],[-10,-15],[-4,-28],[14,0],[-7,-22],[4,-17],[11,-12],[14,-8],[-42,-19],[-16,-22],[0,-33],[4,10],[8,11],[3,8],[15,-12],[14,-17],[-9,-29],[-13,-55],[-9,-59],[5,-42],[9,-3],[8,15],[6,24],[7,52],[10,17],[22,21],[31,62],[19,30],[19,12],[20,8],[14,23],[9,30],[11,41],[-7,-42],[-9,-36],[-70,-196],[-50,-56],[-95,-188],[-11,-49],[-3,-26],[-14,16],[-17,-11],[-13,-18],[-11,-25],[-6,-26],[-3,-31],[-2,-82],[5,-27],[17,-45],[14,-69],[3,-32],[-3,-19],[7,-15],[-14,13],[-13,-5],[-10,-17],[-6,-21],[7,-41],[18,-175],[18,-111],[0,-13],[-3,-18],[-9,-20],[-5,-40],[-15,-63],[-4,-29],[-25,-75],[-5,-21],[-16,-119],[-7,-20],[-3,-20],[5,-21],[-5,-19],[-2,-22],[-1,-23],[1,-23],[-4,-21],[-153,-13],[-225,58],[-218,147],[-36,42],[-48,249],[-25,62],[-59,-10],[-73,-61],[-69,-25],[-42,83],[-6,14],[-21,65],[-25,13],[-62,-29],[-202,-3],[-11,12],[-21,53],[-12,17],[-60,42],[-22,38],[5,49],[-17,19]],[[8108,2433],[16,5],[21,2],[20,-7],[32,-31],[20,-7],[22,12],[21,30]],[[8260,2437],[96,12],[53,-32],[46,-62],[45,-62],[46,15],[23,94],[61,0],[53,-94],[76,-46],[84,0],[68,31],[61,-47],[60,-20]],[[2605,5878],[52,-76]],[[2657,5802],[-70,-72],[-19,-58],[-9,-34],[-24,-57],[-22,-28],[-20,-16],[-25,-5],[-20,2],[-59,20],[-19,-3],[-15,-12],[-24,-32],[-10,-22],[-5,-23],[4,-72],[-3,-30],[-5,-32],[-15,-45],[-6,-27],[-2,-21],[11,-51],[2,-22],[0,-27],[-8,-35],[-12,-37],[-49,-91]],[[2233,4972],[-19,-14],[-4,-6],[-5,-8],[-6,-32],[-5,-8],[-6,-5],[-19,-2],[-39,-13],[-9,-6],[-7,-11],[-7,-10],[-7,-8],[-9,1],[-26,20],[-15,4],[-21,-4],[-17,0],[-15,6],[-11,14],[-8,14],[-8,9],[-18,12],[-8,8],[-4,11],[-3,15],[-6,12],[-11,7],[-42,6],[-19,7],[-13,17],[-9,16],[-11,11],[-15,7],[-26,0],[-12,-3],[-8,-7],[-5,-11],[-3,-13],[-7,-48],[-4,-12],[-6,-7],[-8,-2],[-24,0],[-10,5],[-10,13],[-7,7],[-6,1],[-5,-13],[-1,-15],[-1,-18],[2,-30],[-2,-11],[-5,-3],[-6,4],[-9,16],[-13,30],[-9,13],[-12,11],[-34,23],[-15,-1],[-9,-7],[-8,-14],[-14,-36],[-11,-34],[-6,-10],[-8,-2],[-8,14],[-5,13],[-7,11],[-13,14],[-5,7],[-1,10],[2,10],[3,12],[2,12],[-4,14],[-10,18],[-21,25],[-24,35],[-11,10],[-11,3],[-29,-6],[-11,5],[-7,16],[-2,17],[0,17],[-1,14],[-9,13],[-17,8],[-35,5],[-17,-2],[-12,-9],[-2,-12],[0,-15],[-1,-14],[-4,-14],[-7,-11],[-28,-32],[-24,-34],[-7,-5],[-7,3],[-15,25],[-11,9],[-18,0],[-15,-3],[-12,-8],[-24,-30],[-15,1],[-18,13],[-28,40],[-8,26],[-2,20],[-2,8],[-8,4],[-16,-3],[-11,-8],[-9,-12],[-4,-12],[-2,-13],[-1,-25],[-2,-12],[-4,-9],[-8,-7],[-11,-2],[-15,5],[-14,11],[-14,26],[-2,14],[2,25],[-4,11],[-11,10],[-23,8],[-13,-1],[-20,-7],[-9,0],[-65,17],[-16,8],[-12,12],[-15,30],[-10,43],[-38,54],[-150,149],[-15,8]],[[488,5445],[1,26],[5,16],[8,4],[10,-4],[10,-3],[9,12],[0,18],[-10,48],[-1,20],[5,12],[41,49],[10,7],[12,9],[22,9],[21,-1],[10,-7],[19,-23],[9,-6],[10,1],[16,12],[7,4],[19,-6],[39,-24],[21,1],[10,6],[9,0],[8,-6],[7,-13],[21,-25],[19,10],[50,87],[7,5],[31,0],[10,11],[12,33],[10,42],[4,96],[11,47],[17,29],[21,11],[45,3],[24,26],[-6,47],[-31,84],[2,44],[15,35],[19,32],[13,40],[4,83],[6,40],[16,28],[23,8],[39,-4],[22,17],[22,41],[7,28]],[[1248,6504],[23,-11],[50,-17],[353,28],[27,-8],[7,-13],[8,-12],[15,-10],[14,-3],[20,1],[13,-5],[17,-14],[14,-20],[26,-14],[94,-5],[28,-8],[20,-13],[11,-15],[24,-24],[8,-15],[8,-25],[23,-87],[12,-36],[16,-27],[21,-21],[27,-12],[17,-11],[50,-61],[79,-42],[9,-14],[4,-19],[5,-22],[11,-25],[16,-12],[16,-6],[96,-2],[81,-25],[50,-6],[44,5]],[[2472,7938],[-11,-60],[-6,-18],[-12,-28],[-5,-17],[-2,-19],[-1,-18],[-3,-16],[-6,-17],[-27,-55],[-10,-15],[-8,-12],[0,-30],[13,-45],[46,-100],[31,-84],[4,-18],[7,-17],[12,-18],[66,-53],[41,-58],[18,-42]],[[2619,7198],[-8,-30],[-24,-63],[-3,-20],[2,-15],[9,-10],[54,-29],[13,-16],[6,-22],[-5,-40],[-5,-25],[-6,-24],[-5,-18],[-8,-14],[-9,-11],[-39,-24],[-12,-12],[-9,-15],[-6,-16],[-2,-17],[3,-20],[13,-25],[42,-54],[14,-31],[14,-45],[18,-101],[10,-27],[10,-12],[11,-11],[10,-14],[5,-17],[-4,-54],[-1,-81]],[[2707,6285],[-16,14],[-10,5],[-14,3],[-13,0],[-14,-4],[-12,-10],[-13,-22],[-14,-40],[-11,-55],[-6,-51],[2,-132],[19,-115]],[[1248,6504],[2,8],[12,25],[29,8],[21,16],[19,41],[4,42],[-29,28],[-3,4],[-3,5],[-2,6],[1,13],[2,13],[4,11],[5,11],[22,87],[14,35],[22,29],[39,15],[10,13],[9,28],[0,23],[-4,23],[-1,26],[2,26],[1,6],[5,2],[48,56],[9,15],[20,107],[4,2],[0,3],[-10,25],[-7,8],[-10,3],[-9,6],[-3,12],[-1,7],[41,69],[24,31],[52,49],[21,29],[7,19],[6,38],[4,20],[10,21],[24,31],[8,17],[7,27],[0,20],[-3,19],[0,25],[5,24],[12,32],[6,20],[12,78],[6,25],[41,83],[19,30],[19,16],[47,19],[22,60],[-2,72],[-9,75],[-3,68],[20,52],[32,48],[65,68],[52,18],[6,7],[8,8],[6,17],[0,2]],[[2035,8529],[5,-11],[22,-47],[13,-43],[9,-20],[12,-17],[43,-45],[16,-30],[17,-44],[30,-65],[9,-25],[12,-45],[7,-17],[9,-10],[18,-5],[11,2],[8,4],[10,2],[10,-1],[15,-5],[10,3],[26,20],[10,4],[11,-4],[15,-14],[17,-20],[32,-25],[13,-16],[9,-26],[8,-53],[10,-38]],[[1894,2046],[-2,15],[-30,104],[-10,15],[-34,9],[-95,72],[-18,6],[-18,-7],[-39,-25],[-47,-14],[-55,-1],[-51,23],[-39,57],[-10,39],[-6,39],[-10,35],[-18,25],[-21,9],[-65,-8],[-90,14],[-17,12],[-18,57],[-19,21],[-1,1],[-18,11],[4,30],[10,24],[13,17],[29,15],[61,-4],[30,6],[43,18],[15,18],[3,42],[-9,35],[-15,20],[-37,21],[-27,19],[-51,13],[-24,24],[-1,11],[3,15],[-3,11],[-18,1],[-15,6],[-2,18],[5,22],[8,17],[10,8],[27,3],[11,5],[14,17],[3,10],[1,15],[4,31],[3,9],[9,15],[3,9],[0,11],[0,16],[0,13],[-2,4],[8,17],[9,14],[11,8],[14,1],[13,17],[4,27],[-5,28],[-9,17]],[[1313,3249],[20,16],[19,37],[6,17],[5,22],[0,21],[-5,60],[0,22],[3,17],[21,38],[4,13],[0,12],[-3,22],[-1,12],[1,13],[-1,15],[-3,17],[-6,15],[-8,14],[-21,23],[-36,55],[-6,17],[-3,19],[-1,18],[3,18],[10,30],[5,19],[0,19],[-2,23],[0,18],[10,19],[19,24],[44,36],[15,22],[8,22],[0,20],[2,25],[4,24],[10,22],[19,18],[30,15],[33,0],[17,-6],[20,-18],[24,-10],[12,-8],[11,-10],[13,-25],[8,-10],[19,0],[26,9],[49,32],[37,35],[11,3],[15,-7],[10,-12],[8,-17],[10,-36],[6,-16],[7,-15],[9,-11],[12,-8],[14,-3],[20,4],[21,12],[27,27],[7,13],[-1,8],[-15,2],[-5,2],[-4,5],[-3,11],[-1,25],[-3,14],[1,12],[7,8],[37,-1],[24,6],[22,11],[27,25],[27,35],[11,6],[14,-4],[8,-9],[13,-21],[7,-6],[9,-2],[15,2],[10,-2],[9,-3],[7,1],[7,7],[29,87],[39,40],[117,32]],[[2329,4352],[9,-50],[31,-61],[14,-14],[15,-8],[13,-2],[15,-7],[5,-10],[1,-15],[-2,-17],[1,-17],[6,-6],[9,0],[10,3],[11,-3],[7,-11],[6,-17],[13,-16],[21,-18],[35,-40],[16,-29],[10,-30],[13,-64],[3,-25],[1,-24],[0,-23],[4,-36],[-2,-21],[-5,-21],[-13,-29],[-4,-14],[2,-19],[8,-21],[14,-29],[6,-22],[3,-20],[0,-18],[-2,-16],[-6,-18],[-23,-50],[-5,-18],[-3,-16],[-1,-41]],[[2233,4972],[36,-54],[11,-36],[3,-40],[4,-26],[7,-32],[10,-22],[29,-33],[9,-14],[10,-27],[20,-70],[8,-19],[9,-7],[13,11],[8,3],[8,-1],[12,-10],[3,-14],[-3,-16],[-9,-17],[-42,-55],[-12,-20],[-9,-22],[-5,-20],[-5,-41],[-2,-14],[-4,-12],[-4,-6],[-9,-6]],[[1313,3249],[-27,46],[-27,32],[-30,23],[-112,51],[-45,2],[-18,12],[-36,35],[-17,30],[-36,77],[-17,18],[-11,-4],[-17,-27],[-10,-7],[-13,5],[-9,12],[-9,14],[-11,13],[-50,33],[-37,24],[-16,19],[-41,78],[-68,89],[-35,73],[-15,22],[-17,13],[-19,8],[-16,15],[-6,30],[23,28],[16,22],[2,31],[-13,50],[-31,77],[-4,35],[8,54],[12,40],[4,18],[3,31],[-1,112],[3,23],[4,20],[0,20],[-9,21],[-13,9],[-11,-6],[-10,-19],[-6,-25],[-13,-16],[-14,-6],[-15,5],[-12,16],[-10,30],[-25,44],[-10,25],[-2,14],[-2,7],[-2,44],[-4,18],[-7,13],[-18,18],[-8,10],[-35,90],[-16,23],[-20,12],[-40,6],[-19,13],[-56,73],[-20,20],[-41,26],[-19,19],[-16,35],[-22,99],[-13,33],[-66,117],[43,78],[170,6],[26,59],[43,-14],[42,-25],[31,-40],[10,-10],[13,-7],[8,0],[59,18],[21,15],[16,25],[6,21],[0,5]],[[7601,8481],[-59,-38],[-42,1],[-18,5],[-13,-1],[-11,-10],[-18,-29],[-11,-13],[-8,-14],[-6,-16],[-4,-37],[-9,-15],[-12,-9],[-29,-1],[-15,5],[-17,15],[-19,10],[-30,10],[-17,18],[-8,4],[-13,-3],[-11,-12],[-7,-14],[-4,-17],[2,-18],[19,-59],[1,-18],[-5,-15],[-11,-13],[-22,-11],[-16,-4],[-21,9],[-12,13],[-12,17],[-15,28],[-9,11],[-9,8],[-11,5],[-177,1],[-16,6],[-12,9],[-20,19],[-11,2],[-9,-7],[-7,-13],[-6,-23],[-15,-44],[-42,-58]],[[6784,8165],[-44,9],[-11,11],[-16,19],[-26,51],[-5,21],[-3,25],[1,25],[2,32],[0,27],[-17,113],[-10,47],[-11,25],[-34,49],[-13,31],[-70,120],[-20,48],[-120,211],[-25,35],[-54,42],[-43,50],[-28,25],[-16,21],[-7,24],[-18,132]],[[6196,9358],[24,0],[50,32],[10,22],[24,74],[13,23],[27,32],[13,20],[17,46],[17,67],[11,69],[-2,49],[8,71],[9,-5],[20,-2],[18,7],[35,24],[18,7],[49,3],[18,6],[133,41],[33,21],[50,33],[24,1],[25,-29],[11,-4],[11,24],[12,-33],[21,-6],[43,12],[18,-12],[24,-42],[12,10],[44,-62],[7,-17],[4,-36],[11,7],[12,24],[9,13],[13,-16],[6,-25],[8,-23],[36,-19],[0,-19],[-12,-16],[-21,-2],[0,-13],[29,-24],[20,-9],[13,15],[9,-6],[10,-11],[5,-11],[0,-2],[0,-10],[-11,-20],[-3,-12],[8,-53],[18,-42],[26,-31],[27,-22],[0,-16],[-21,-13],[1,-9],[1,-9],[2,-7],[3,-6],[27,16],[14,-27],[10,-30],[14,11],[12,-19],[1,-20],[-7,-19],[-13,-15],[22,-25],[7,-5],[0,-4],[0,-9],[-18,-35],[11,-20],[24,-19],[19,-31],[-1,-10],[2,-67],[-1,-13],[11,-11],[13,-6],[12,-7],[8,-19],[-37,-31],[13,-14],[15,-32],[12,-32],[4,-18],[4,-10],[19,-19],[6,-8],[0,-3],[3,-18],[-1,-23],[6,-16],[0,-14],[-25,-6],[10,-48],[24,-57],[69,-126],[29,-42],[34,-17],[1,-6],[2,-12]],[[2707,6285],[32,-41],[149,-5],[24,-10],[15,-13],[9,-30],[6,-14],[9,-13],[13,-13],[9,-12],[5,-12],[2,-25],[2,-15],[8,-15],[7,-2],[8,7],[11,23],[8,12],[44,37],[10,6],[20,0],[48,-22],[18,-3],[13,2],[10,9],[11,14],[38,42],[106,28],[18,-6],[15,-11],[59,-62],[52,-30],[23,-6],[20,-1],[34,4],[12,-6],[6,-12],[1,-17],[-8,-21],[-9,-18],[-6,-17],[2,-19],[8,-22],[22,-21],[17,-8],[15,-1],[7,7],[2,12],[-2,15],[-3,14],[1,14],[6,10],[12,4],[50,1],[12,4],[21,13],[10,4],[47,-2],[17,3],[38,13],[22,-3],[65,-30],[14,0],[18,12],[8,16]],[[3968,6053],[33,-3],[16,-16],[12,-18],[4,-12],[2,-15],[-4,-19],[-8,-17],[-14,-18],[-8,-15],[-6,-25],[6,-16],[32,-51],[11,-11],[58,-34],[22,-26],[11,-33],[8,-68],[8,-19],[8,-12],[16,-16]],[[4175,5609],[6,-143],[-1,-22],[-5,-18],[-11,-17],[-21,-18],[-16,-26],[-23,-29],[-89,-135],[-12,-27],[-7,-31],[-5,-40],[-4,-12],[-8,-6],[-9,3],[-10,10],[-19,27],[-9,11],[-10,6],[-12,1],[-73,-23],[-12,-14],[-8,-19],[-1,-35],[5,-22],[8,-20],[3,-20],[-3,-26],[-15,-27],[-15,-18],[-16,-14],[-12,-4],[-11,1],[-8,2],[-7,-1],[-17,-7],[-10,3],[-9,6],[-9,11],[-11,7],[-9,3],[-11,-1],[-8,-5],[-5,-12],[5,-71],[7,-14],[10,-7],[27,-10],[12,-9],[7,-12],[-2,-18],[-36,-80],[-14,-38],[-7,-14],[-7,-7],[-10,-2],[-16,5],[-8,0],[-7,-5],[-8,-8],[-9,-15],[-6,-14],[-7,-23],[-24,-110],[-3,-38],[7,-56],[8,-31],[7,-36],[1,-40],[-8,-65],[-8,-37],[-3,-35],[11,-47],[25,-64],[5,-29],[1,-20],[-29,-62]],[[3577,3896],[-44,-10]],[[3533,3886],[1,72],[-1,16],[-4,21],[-7,14],[-53,72],[-22,38],[-19,19],[-41,27],[-24,29],[-13,27],[-11,38],[-5,22],[-1,18],[4,17],[4,16],[2,15],[-4,20],[-22,38],[-6,16],[-1,18],[2,41],[-4,32],[-8,46],[-24,90],[-27,166],[-9,25],[-27,49],[-18,40],[-41,152],[-12,14],[-21,5],[-25,16],[-102,192],[-7,19],[-3,14],[1,10],[5,6],[7,2],[7,-2],[8,-5],[4,8],[0,22],[-18,64],[-12,34],[-14,27],[-12,12],[-12,7],[-48,11],[-13,7],[-7,12],[-18,96],[-16,61],[-11,32],[-10,18],[-11,5],[-96,-15],[-10,4],[-51,46]],[[4984,8502],[11,-19],[84,-95],[27,-46],[13,-32],[5,-23],[2,-25],[-7,-30],[-12,-17],[-15,-13],[-12,-9],[-8,-9],[-3,-11],[4,-10],[6,-10],[4,-13],[2,-14],[-3,-19],[-5,-7],[-7,-2],[-8,3],[-8,0],[-9,-2],[-8,-8],[-4,-12],[1,-16],[10,-23],[21,-38],[8,-18],[12,-39],[5,-21],[1,-24],[-9,-39],[-13,-33],[-8,-28],[-2,-23],[12,-21],[13,-6],[11,1],[9,3],[5,-5],[2,-13],[-4,-32],[-5,-23],[-5,-65],[5,-151]],[[5102,7465],[-81,-45],[-70,-19],[-28,-14],[-34,-32],[-54,-65],[-8,-16],[-14,-53],[-6,-16],[-26,-56],[-9,-27],[-6,-30],[-8,-61],[-7,-17],[-13,-9],[-19,4],[-17,11],[-31,28],[-13,7],[-12,4],[-13,-3],[-19,-12],[-26,-29],[-22,-41],[-10,-26],[-10,-40],[-7,-16],[-20,-35],[-6,-18],[-3,-24],[-2,-22],[-3,-23],[-6,-17],[-15,-13],[-20,-10],[-38,-7],[-48,-28],[-17,-5],[-23,2],[-70,25],[-87,60]],[[4181,6777],[23,67],[6,27],[7,89],[6,31],[2,34],[-5,29],[-20,31],[-37,28],[-13,14],[-7,18],[-2,25],[2,17],[2,16],[-2,13],[-19,19],[-8,14],[1,32],[3,28],[5,27],[1,27],[-4,27],[-15,31],[-16,16],[-24,15],[-11,11],[-22,29],[-16,14],[-60,23],[-14,11],[-11,18],[-8,21],[-4,26],[-12,120],[-4,23],[0,26],[6,22],[35,39],[14,23],[11,25],[10,62]],[[3981,7945],[40,55],[65,131],[7,21],[4,20],[2,34],[1,13],[6,11],[15,10],[89,26],[22,18],[10,18],[21,67],[8,19],[15,17],[73,47],[19,6],[198,-65],[199,10],[22,9],[17,17],[44,56],[35,18],[91,-1]],[[4181,6777],[-32,-5],[-10,-14],[-12,-21],[-39,-107],[-5,-24],[0,-19],[7,-15],[9,-17],[7,-22],[1,-37],[-7,-23],[-10,-14],[-38,-10],[-14,-8],[-17,-25],[-10,-30],[-12,-46],[-2,-24],[3,-20],[5,-18],[4,-18],[-2,-24],[-7,-12],[-22,-21],[-14,-20],[-21,-46],[-5,-26],[6,-24],[24,-34]],[[2619,7198],[12,-7],[126,-3],[19,-5],[12,-8],[10,-13],[8,-20],[18,-65],[11,-28],[11,-18],[13,-8],[40,-5],[10,-5],[7,-9],[5,-12],[6,-11],[8,-7],[10,-1],[23,7],[13,0],[12,-3],[11,-6],[16,-5],[18,4],[21,10],[15,4],[12,-1],[24,-13],[13,1],[10,8],[3,18],[-2,18],[0,17],[3,16],[15,40],[7,15],[13,3],[8,-9],[7,-16],[7,-33],[6,-10],[9,-4],[22,10],[11,1],[9,-4],[7,-11],[7,-12],[7,-10],[10,1],[10,9],[9,31],[0,19],[-4,20],[-11,16],[-10,17],[-4,19],[5,14],[15,10],[11,0],[18,-9],[6,3],[4,28],[5,13],[12,10],[13,3],[24,-2],[14,2],[15,6],[11,14],[4,20],[-2,17],[-9,48],[-5,14],[-15,26],[-3,14],[1,14],[6,11],[21,9],[7,6],[2,11],[7,25],[8,20],[1,19],[2,17],[4,14],[48,27],[24,23],[14,5],[12,-1],[11,-6],[10,0],[9,9],[7,27],[10,26],[16,26],[37,28],[35,15],[62,10],[16,9],[9,19],[-1,42],[5,41],[5,26],[7,19],[2,17],[-1,14],[-16,34]],[[3775,7927],[30,36],[176,-18]],[[3533,3886],[-4,-33],[3,-20],[15,-65],[3,-24],[-15,-63]],[[4969,8790],[13,-59],[26,-56],[45,-65],[9,-20],[2,-23],[-8,-21],[-9,-14],[-63,-30]],[[3775,7927],[-27,-19],[-12,-5],[-15,-1],[-13,4],[-14,13],[-9,13],[-9,12],[-13,11],[-21,13],[-10,18],[-6,17],[-2,16],[-14,12],[-25,6],[-162,-10],[-24,5],[-132,63],[-43,31],[-21,10],[-28,7],[-111,1],[-53,-27]],[[3011,8117],[-97,26],[-18,14],[-15,16],[-2,17],[3,14],[9,12],[38,36],[11,13],[8,15],[5,15],[5,18],[4,23],[6,23],[8,21],[63,109],[10,9],[9,0],[9,-8],[18,-30],[12,-16],[48,-44],[16,-10],[18,0],[20,16],[16,26],[19,38],[24,38],[17,55],[7,27],[13,42],[4,26],[-2,29],[-8,17],[-11,16],[-17,13],[-72,27],[-12,11],[-7,15],[-1,18],[4,30],[12,18],[18,11],[75,-1],[41,-17],[17,-12],[18,-6],[18,-2],[24,7],[26,17],[150,158],[9,24],[0,24],[-10,27],[-14,19],[-35,31],[-15,16],[-11,17],[-50,98],[-17,86]],[[3429,9349],[3,4],[6,10],[5,12],[5,14],[11,14],[12,4],[40,10],[19,-9],[68,-11],[44,-20],[25,-4],[73,5],[17,-12],[55,-70],[8,-33],[22,0],[107,60],[33,-2],[17,-17],[53,-20],[21,-13],[38,-51],[19,-5],[1,2],[63,-34],[23,-1],[71,49],[52,3],[41,49],[24,18],[21,1],[60,-20],[60,1],[20,-7],[9,-7],[41,-33],[27,-29],[16,-29],[7,-34],[1,-28],[5,-27],[19,-30],[35,-31],[86,-46],[15,-19],[13,-25],[36,-89],[25,-52],[20,-19],[34,8],[14,4]],[[5246,7408],[7,-82],[6,-18],[9,-24],[24,-34],[10,-19],[7,-26],[4,-34],[3,-131],[-17,-147],[6,-48],[23,-89],[5,-15],[3,-20],[-1,-31],[-6,-47],[-3,-40],[3,-59],[-2,-20],[-9,-22],[-46,-53],[-15,-24],[-38,-82],[-13,-21],[-18,-17],[-45,-26],[-14,-13],[-62,-91],[-9,-21],[-4,-24],[-5,-81],[-5,-18],[-12,-14],[-66,-38],[-7,-15],[0,-15],[29,-29],[8,-14],[-1,-23],[-6,-15],[-12,-9],[-25,-8],[-9,-9],[-8,-9],[-10,-10],[-23,-14],[-8,-12],[-1,-13],[7,-19],[83,-145],[19,-25],[21,-9],[49,2],[18,-9],[56,-62],[83,-126]],[[5229,5391],[-53,-17],[-97,-6],[-16,-7],[-14,-12],[-24,-27],[-10,-18],[-7,-23],[-4,-18],[7,-45]],[[5011,5218],[-51,41],[-11,15],[-17,15],[-14,10],[-23,4],[-14,-2],[-14,-5],[-9,-5],[-12,-4],[-33,-3],[-8,-4],[-11,-14],[-9,-5],[-24,-1],[-12,-5],[-14,0],[-14,9],[-19,33],[-11,49],[-6,55],[-5,124],[-7,58],[1,21],[5,17],[7,15],[3,13],[-4,6],[-10,2],[-20,-15],[-15,-5],[-20,2],[-28,13],[-14,-1],[-13,-12],[-8,-12],[-7,-14],[-13,-9],[-21,-2],[-74,7],[-33,-10],[-18,-10],[-21,-6],[-19,3],[-58,35],[-39,-11],[-79,-1]],[[5102,7465],[96,-25],[48,-32]],[[2472,7938],[45,50],[139,93],[29,11],[21,0],[116,-45],[15,-13],[25,-34],[16,-13],[43,-16],[11,-8],[19,-29],[12,-12],[6,4],[5,10],[5,14],[6,13],[41,48],[6,14],[2,16],[-2,17],[-9,28],[-12,31]],[[2035,8529],[2,14],[1,16],[3,14],[26,52],[3,19],[4,39],[4,16],[7,14],[18,18],[9,11],[23,48],[12,18],[19,15],[19,9],[13,2],[49,-10],[16,1],[14,8],[12,16],[17,86],[32,10],[79,-57],[36,-8],[41,8],[38,23],[31,37],[26,48],[13,14],[22,13],[23,3],[6,6],[9,25],[-2,15],[-6,14],[0,19],[11,29],[17,16],[43,22],[17,22],[26,68],[18,28],[21,9],[19,18],[9,29],[-9,44],[9,25],[16,2],[19,-12],[16,-16],[17,-14],[17,-7],[17,4],[45,49],[14,37],[24,101],[21,44],[21,14],[24,-5],[74,-35],[18,-18],[44,-72],[50,-59],[24,-38],[8,-4],[7,-2],[8,2],[9,4],[1,1],[2,0],[1,0],[2,-1],[69,-47],[21,2],[5,4]],[[4436,2594],[26,30],[42,72],[6,19],[4,18],[-1,19],[-7,26],[-9,18],[-7,19],[-1,18],[8,45],[11,131],[33,204],[-2,50],[-7,33],[-8,25],[-7,16],[-16,26],[-5,22],[-2,28],[5,44],[3,53],[-10,52],[-1,24],[2,20],[6,16],[9,15],[8,17],[3,20],[-3,26],[-21,136],[0,24],[2,23],[31,86],[15,95],[-13,69]],[[4530,4133],[192,80]],[[4722,4213],[67,9],[16,-6],[14,-11],[17,-27],[8,-20],[7,-15],[8,-7],[13,5],[19,18],[12,7],[13,1],[32,-3],[65,9],[118,-23],[25,-21],[40,-51],[18,-17],[17,-9],[17,-17],[15,-28],[59,-188],[35,-60]],[[5011,5218],[-23,-43],[-63,-74],[-58,-46],[-7,-10],[-2,-13],[6,-29],[1,-16],[-3,-21],[-9,-7],[-7,1],[-8,7],[-9,4],[-12,-4],[-18,-14],[-16,-24],[-47,-35],[-7,-14],[-1,-17],[4,-12],[15,-25],[4,-17],[-1,-23],[-1,-19],[3,-14],[6,-10],[8,-5],[7,-9],[3,-14],[-6,-23],[-14,-16],[-18,-11],[-20,-7],[-38,-24],[-16,-17],[-5,-19],[1,-22],[33,-100],[6,-26],[5,-26],[9,-71],[4,-63],[3,-32],[2,-45]],[[4530,4133],[-217,3],[-147,-49],[-15,-7],[-106,-88],[-20,-1],[-16,5],[-38,23],[-40,7],[-176,-9],[-16,-8],[-9,-13],[-9,-15],[-10,-11],[-13,-5],[-18,-1],[-14,-8],[-33,-37],[-21,-19],[-13,-7],[-22,3]],[[5511,5310],[-7,-30],[3,-19],[9,-23],[35,-38],[14,-27],[9,14],[21,1],[22,-9],[13,-14],[4,-38],[-14,-72],[3,-21],[0,-17],[-7,-29],[-2,-48],[2,-141],[4,-33],[10,-29],[74,-71],[33,-50],[2,-72],[20,0],[8,5],[8,11],[15,-16],[15,2],[15,9],[17,5],[6,13],[16,-35],[19,-14],[98,-53],[26,-27],[32,-46],[16,-38],[17,-47],[10,-13],[21,-12],[20,-17],[20,-25],[33,-73],[23,-34]],[[6194,4139],[-58,-178]],[[6136,3961],[-50,14],[-56,47],[-23,5],[-14,-8],[-8,-18],[-5,-25],[-2,-23],[-6,-28],[-9,-26],[-21,-26],[-18,-7],[-15,4],[-9,12],[-14,34],[-7,14],[-13,12],[-13,-1],[-30,-15],[-15,4],[-45,25],[-45,13],[-24,-1],[-179,-46],[-13,-8],[-18,-16]],[[5229,5391],[56,13],[58,38],[18,1],[18,-6],[22,-17],[18,-23],[16,-17],[47,-24],[29,-46]],[[6353,5406],[44,21],[34,41],[9,3],[9,-6],[14,-26],[8,-11],[39,-35],[11,-18],[5,-18],[-2,-14],[-15,-24],[-3,-15],[7,-19],[20,-15],[11,-13],[9,-15],[6,-19],[10,-46],[6,-20],[7,-17],[18,-13]],[[6600,5127],[-68,-153],[-17,-72],[-1,-32],[-15,-109],[-9,-106]],[[6490,4655],[9,-46],[6,-20],[2,-24],[-2,-25],[-19,-61],[-5,-26],[-1,-24],[-5,-29],[-9,-27],[-16,-38],[-7,-30],[-8,-50],[-10,-20],[-19,-15],[-18,2],[-11,9],[-20,26],[-11,10],[-11,4],[-10,-6],[-10,-23],[-4,-22],[-4,-40],[-7,-13],[-13,-6],[-52,-4],[-41,-18]],[[5511,5310],[26,74],[5,9],[10,13],[-1,19],[5,13],[38,59],[22,23],[16,25],[38,79],[17,22],[35,32],[13,19],[12,13],[14,4],[16,-13],[28,-35],[12,-17],[7,-19],[3,-20],[2,-20],[3,-21],[26,-74],[6,-19],[7,-16],[43,-48],[9,-17],[9,-21],[19,-22],[29,-21],[99,-11],[274,86]],[[5740,7368],[24,-8],[29,-19],[16,-14],[15,-24],[12,-33],[18,-64],[13,-37],[19,-35],[35,-38],[15,-20],[9,-22],[6,-35],[-1,-18],[-4,-10],[-6,-1],[-20,6],[-10,-1],[-8,-6],[-6,-10],[-2,-18],[-1,-23],[13,-358],[5,-27],[8,-23],[16,-27],[35,-50],[13,-10],[10,-2],[4,14],[-1,19],[-7,46],[0,20],[11,10],[10,5],[87,-30]],[[6097,6525],[3,-161],[18,-97],[13,-36],[16,-32],[13,-40],[1,-25],[-10,-15],[-15,-8],[-14,-18],[-9,-29],[-6,-60],[7,-31],[14,-20],[44,-18],[56,-10],[15,-13],[16,-25],[5,-24],[1,-25],[-8,-52],[-1,-30],[9,-13],[15,-1],[27,12],[42,33],[15,3],[15,-3],[18,-15],[6,-19],[2,-19],[-14,-56],[-3,-20],[-5,-88],[-4,-21],[-13,-39],[-5,-23],[-8,-81]],[[5246,7408],[40,-22],[13,-1],[16,1],[14,9],[10,14],[5,17],[2,18],[0,20],[3,20],[11,25],[17,16],[21,13],[26,8],[18,-1],[18,-11],[119,-113],[11,-17],[11,-20],[13,-20],[16,-16],[17,-3],[22,4],[15,7],[56,12]],[[8332,6902],[-1,-1],[-8,-5],[-53,-10],[-18,-16],[-7,-10],[-10,-8],[-12,-1],[-13,9],[-10,12],[-10,9],[-9,2],[-13,-12],[-3,-13],[-10,-11],[-15,1],[-39,18],[-33,30],[-12,5],[-17,-3],[-14,2],[-10,12],[-2,15],[3,16],[5,19],[10,44],[0,24],[-3,21],[-10,12],[-13,3],[-14,-14],[-5,-20],[0,-21],[0,-20],[-3,-11],[-7,-1],[-12,12],[-40,73],[-29,43],[-63,69],[-14,10],[-12,0],[-9,-14],[-1,-16],[3,-16],[5,-15],[1,-17],[0,-19],[-6,-31],[2,-11],[8,-6],[11,-2],[20,4],[7,-2],[3,-7],[0,-13],[-2,-13],[-5,-14],[-13,-10],[-21,-4],[-40,10],[-19,11],[-14,0],[-7,-13],[-5,-17],[-7,-16],[-12,-14],[-39,-19],[-18,-2],[-26,9],[-19,10],[-20,8],[-20,0],[-80,-20],[-122,12]],[[7361,6939],[-5,29],[-6,19],[-19,45],[-22,43],[-12,25],[-1,23],[7,22],[14,19],[18,14],[19,11],[31,11],[9,10],[4,15],[-6,19],[-14,23],[-24,29],[-13,21],[-10,22],[-4,20],[-5,19],[-8,17],[-13,10],[-24,4],[-17,-7],[-14,-11],[-36,-59],[-12,-14],[-12,-7],[-19,2],[-50,16],[-15,-5],[-10,-12],[-8,-36],[-6,-14],[-10,-7],[-15,-1],[-43,13],[-28,21],[-62,67],[-41,32],[-30,12],[-24,1],[-20,-4],[-19,1],[-13,11],[-9,29],[-8,35],[-31,109],[-54,110],[-74,100]],[[6597,7791],[81,26],[11,12],[9,16],[-5,16],[-65,83],[-11,36],[4,20],[17,7],[111,-19],[23,6],[9,12],[4,20],[2,27],[11,39],[4,24],[-3,19],[-15,30]],[[7601,8481],[4,-28],[4,-13],[1,-8],[0,-20],[2,-9],[4,-4],[12,-2],[2,-1],[8,-58],[7,-32],[11,-14],[9,-2],[6,-4],[4,-6],[6,-4],[27,-1],[2,1],[14,-8],[16,-13],[14,-17],[7,-21],[-9,-9],[-5,-17],[-4,-22],[-4,-26],[19,-22],[-8,-67],[15,-14],[2,-3],[12,-14],[25,-85],[14,-32],[8,-6],[29,-9],[11,-10],[8,-9],[8,-8],[27,-9],[11,-16],[22,-53],[-2,-27],[11,-27],[27,-48],[13,-59],[2,-1],[3,-17],[3,-13],[-2,-9],[-12,-5],[12,-25],[46,-34],[0,-15],[-6,-16],[4,-6],[11,-5],[9,-10],[33,-50],[30,-28],[13,-16],[0,-31],[26,-7],[25,-22],[23,-15],[21,14],[9,-36],[1,-2],[33,-58],[14,-37],[21,-79],[3,-32],[0,-5],[-9,-33],[18,-17],[1,-24],[-1,-26],[11,-21],[0,-16],[-1,-26]],[[7361,6939],[6,-68],[24,-91],[4,-34],[0,-25],[-12,-34]],[[7383,6687],[-42,-30],[-30,12],[-11,9],[-86,27],[-25,0],[-75,-16],[-21,21],[-14,23],[-7,21],[-1,15],[2,14],[-1,16],[-6,17],[-21,23],[-12,1],[-5,-7],[1,-16],[1,-17],[-3,-18],[-6,-15],[-29,-33],[-5,-14],[-1,-17],[3,-18],[-1,-17],[-6,-17],[-12,-14],[-17,-11],[-17,0],[-13,10],[-32,33],[-28,14],[-20,-2],[-13,-11],[-9,-30],[-9,-16],[-65,-39],[-15,-14],[-20,-36],[-10,-12],[-13,-2],[-43,12],[-38,-13],[-40,1],[-12,-6],[-9,-13],[-8,-19],[-10,-17],[-11,-12],[-18,-4],[-84,-1],[-12,5],[-2,8],[1,12],[2,14],[1,16],[-3,15],[-6,16],[-7,15],[-12,34],[-7,11],[-15,9],[-13,-4],[-12,-8],[-65,-68],[-27,-16],[-21,-5],[-14,5],[-30,24],[-24,9],[-15,-1],[-38,-15]],[[5740,7368],[1,48],[12,56],[13,37],[47,79],[16,21],[42,37],[18,23],[8,21],[2,20],[-3,18],[-7,16],[-22,28],[-18,36],[-3,15],[4,13],[8,7],[12,1],[13,-8],[14,-13],[48,-62],[14,-14],[13,-3],[19,5],[77,50],[16,2],[15,-7],[13,-12],[17,-9],[20,-1],[55,20],[119,-1],[39,14],[99,72],[24,8],[21,-1],[21,-6],[18,-11],[15,-17],[37,-59]],[[6136,3961],[63,-109],[44,-46],[14,-21],[14,-31],[37,-113],[5,-34],[-1,-20],[-7,-15],[-2,-18],[5,-23],[30,-45],[11,-22],[3,-24],[1,-18],[4,-16],[7,-16],[15,-12],[15,-4],[46,5],[12,-6],[11,-12],[5,-27],[11,-15],[9,-3],[8,8],[17,23],[9,5],[5,-4],[1,-16],[-2,-18],[-2,-21],[3,-25],[15,-24],[25,-29],[10,-20],[6,-22],[5,-34],[3,-30],[2,-82],[5,-32],[7,-23],[17,-15],[30,-12],[9,-6],[24,-34],[8,-16],[5,-19],[-2,-29],[-8,-18],[-19,-28],[-7,-17],[-1,-19],[5,-21],[40,-59],[20,-52]],[[6372,2399],[-44,4],[-15,-3],[-28,17],[-24,0],[-64,-31],[-65,-1],[-8,-24],[-6,-8]],[[4969,8790],[79,19],[66,40],[1,0],[44,59],[102,234],[46,44],[519,77],[69,39],[56,10],[32,19],[18,5],[50,-7],[67,28],[78,1]],[[7383,6687],[15,-27],[7,-15],[14,-22],[48,-57],[20,-31],[13,-39],[0,-53],[-3,-49],[5,-49],[110,-272],[39,-133],[24,-134],[12,-100],[7,-274]],[[7694,5432],[-32,6],[-37,16],[-10,-3],[-8,-12],[-5,-14],[-8,-11],[-12,-5],[-20,4],[-45,39],[-21,6],[-27,-1],[-78,-24],[-26,-20],[-12,-19],[-18,-36],[-11,-15],[-29,-27],[-10,-18],[-13,-32],[-9,-10],[-13,-4],[-55,28],[-14,4],[-17,-2],[-17,-13],[-10,-15],[-5,-17],[-2,-14],[-5,-8],[-9,-3],[-41,24],[-16,3],[-19,-1],[-20,-6],[-18,2],[-26,11],[-46,2],[-32,9],[-102,-9],[-17,-7],[-12,-17],[-7,-18],[-3,-20],[-1,-41],[-2,-21],[-32,-22],[-122,26]],[[8234,3774],[-4,-20],[-3,-19],[-2,-64],[-1,-8],[-2,-7],[-9,-23],[-1,-5],[-5,-33],[-5,-13],[-14,-31],[58,-74],[36,-22],[37,22],[7,-9],[5,-9],[5,-12],[4,-14],[-13,-29],[-16,-45],[-6,-42],[17,-19],[20,-8],[21,-23],[18,-29],[9,-28],[-4,-28],[-12,-29],[-16,-23],[-14,-9],[-3,-10],[6,-70],[2,-6],[2,-4],[3,-7],[1,-13],[-2,-14],[-10,-23],[-3,-15],[11,-78],[0,-49],[-14,-22],[-4,-11],[1,-95],[2,-11],[-2,-9],[-8,-22],[-29,-55],[-10,-33],[-4,-51],[-7,-46],[-16,-40]],[[7357,2528],[-4,15],[7,101],[-7,26],[-11,19],[-10,14],[-3,19],[4,20],[13,20],[12,9],[38,14],[9,20],[8,37],[11,80],[5,46],[1,35],[-2,20],[-5,14],[-9,5],[-26,-1],[-13,3],[-9,8],[-4,15],[0,19],[1,43],[-1,21],[-7,16],[-8,11],[-13,5],[-10,8],[-6,15],[-1,23],[1,44],[-1,17],[-4,16],[-7,12],[-10,8],[-9,0],[-10,-5],[-6,-9],[0,-15],[-1,-14],[-4,-13],[-9,-15],[-12,-3],[-11,3],[-6,10],[-16,59],[-1,16],[1,15],[9,18],[16,18],[84,43],[50,-11],[13,0],[42,19],[14,1],[11,-6],[8,-8],[8,-2],[6,8],[4,32],[-5,49],[0,22],[7,18],[20,12],[16,1],[16,-4],[13,4],[10,18],[8,48],[7,30],[20,49],[3,41]],[[7592,3754],[10,44],[27,59],[27,50],[18,25],[21,19],[63,34]],[[7758,3985],[61,-38],[37,3],[19,5],[13,-5],[9,-12],[21,-37],[36,-46],[58,-45],[37,-10],[70,4],[25,-6],[26,-12],[64,-12]],[[6490,4655],[46,-65],[44,-91],[70,-174],[20,-35],[19,-21],[30,-5],[15,0],[12,5],[11,7],[14,0],[24,-14],[67,-83],[23,-42],[37,-39],[44,-37],[13,-7],[21,-5],[16,-8],[10,-2],[7,1],[5,7],[2,9],[0,7],[0,6],[-2,5],[-1,8],[2,8],[7,7],[17,2],[25,-7],[31,-20],[18,-20],[7,-20],[-1,-18],[1,-26],[7,-28],[28,-41],[19,-18],[14,-8],[14,2],[12,8],[25,20],[13,6],[14,1],[7,-8],[2,-15],[-3,-39],[4,-19],[9,-4],[10,6],[9,13],[8,14],[11,12],[10,5],[17,-5],[12,-10],[10,-14],[9,-4],[19,1],[13,-4],[7,-11],[4,-14],[2,-17],[2,-17],[8,-17],[10,-7],[51,-21],[23,-4],[48,3]],[[8316,5288],[-7,-30],[-9,-8],[-3,-11],[1,-11],[6,-7],[0,-11],[-13,-76],[-2,-21],[4,-31],[26,-108],[2,-25],[2,-13],[7,-15],[4,-17],[-2,-16],[-4,-17],[-2,-17],[3,-16],[10,-27],[2,-8],[-3,-11],[-14,-15],[-5,-11],[3,-63],[16,-65],[19,-52],[9,-20],[9,-217],[-2,-35],[7,-28],[-15,-11],[-35,1],[-14,-7],[-18,-19],[-17,-24],[-13,-24],[59,-45],[24,-27],[18,-46],[4,-14],[2,-4],[2,-5],[0,-73],[8,-22],[28,-49],[14,-25],[2,0]],[[8429,3892],[-1,-3],[-15,-26],[-4,-17],[-1,-12],[-4,-14],[-4,-5],[-6,-3],[-11,3],[-31,21],[-18,8],[-10,0],[-11,-3],[-46,-23],[-11,-2],[-8,-8],[-14,-34]],[[7758,3985],[-28,44],[-11,25],[-19,76],[-3,16],[1,21],[-1,24],[-9,48],[-8,30],[-11,25],[-23,33],[-7,16],[-5,14],[-6,13],[-11,11],[-28,21],[-10,14],[-27,56],[-7,21],[-7,26],[-6,32],[-113,406],[-10,57],[1,47],[3,25],[8,21],[9,17],[15,22],[26,47],[23,29],[20,16],[30,9],[36,3],[18,8],[17,23],[10,20],[13,16],[10,10],[60,6]],[[7708,5333],[37,-71],[13,-38],[10,-62],[13,-54],[9,-24],[11,-11],[7,2],[6,7],[4,9],[2,13],[0,33],[6,58],[0,20],[-3,20],[-6,20],[-22,58],[-1,17],[4,14],[14,12],[182,-31],[16,-9],[9,-13],[0,-17],[2,-16],[7,-12],[11,0],[9,8],[7,14],[10,30],[8,18],[11,12],[16,11],[15,0],[80,-37],[39,-30],[27,-9],[16,-1],[35,11],[3,3],[1,0]],[[8332,6902],[-2,-17],[18,-61],[42,-103],[0,-41],[60,-167],[10,-59],[1,-8],[3,-23],[-1,-30],[-7,-23],[-10,-27],[-6,-31],[10,-35],[-10,-10],[-4,-16],[-2,-81],[2,-17],[14,-39],[4,-5],[4,2],[4,-2],[1,-18],[0,-67],[-1,-18],[-6,-17],[-15,-10],[8,-30],[-5,-12],[-2,-1],[-8,-5],[-7,-10],[-6,-66],[-5,-9],[-13,-6],[-2,-16],[4,-44],[1,-26],[-2,-8],[-14,-45],[-13,-17],[-10,-8],[-12,-5],[-10,-8],[-4,-15],[3,-37],[-2,-12],[-12,-4],[-13,-8],[2,-19],[20,-45],[6,-12],[7,-15],[3,-19],[-12,-50],[-6,-54],[-18,-73],[-3,-12]],[[7708,5333],[-14,99]],[[8429,3892],[24,4],[31,-25],[21,-41],[-6,-43],[32,-116],[20,-54],[25,-23],[17,-7],[37,-30],[94,-35],[88,-67],[141,-46],[39,8],[33,1],[14,9],[12,20],[-30,19],[-8,10],[-5,16],[-3,19],[2,17],[30,22],[-1,33],[1,31],[28,10],[17,-9],[27,-28],[24,-6],[14,-14],[17,-27],[21,-18],[24,13],[5,15],[4,42],[6,18],[7,9],[10,3],[23,2],[15,10],[54,65],[43,18],[18,11],[15,23],[9,6],[26,3],[5,6],[4,15],[9,16],[16,20],[23,18],[17,1],[17,-5],[22,1],[9,5],[10,9],[8,11],[6,12],[10,9],[11,-3],[12,-9],[10,-5],[82,-12],[147,-76],[49,-64],[12,-10],[24,-32],[18,-74],[5,-84],[-14,-62],[6,-14],[2,-16],[-2,-16],[-6,-16],[-9,3],[-28,-1],[0,-14],[16,-31],[11,-39],[19,-29],[34,-5],[-24,-38],[-13,-60],[-9,-190],[-6,-36],[-14,-62],[-2,-30],[-2,-35],[-3,-32],[-7,-21],[7,-46],[-27,-60],[14,-40],[-7,-26],[-9,-9],[-10,-2],[-11,-9],[-15,-33],[-8,-10],[-21,16],[-11,-3],[-11,-8],[-10,-4],[-207,-47],[-131,-13],[-38,-18],[-106,-107],[-31,-44],[-27,-56],[-7,16],[1,32],[-14,40],[-7,33],[24,15],[25,6],[39,30],[42,15],[24,24],[19,38],[6,49],[-6,27],[-13,29],[-32,49],[6,-35],[2,-17],[0,-24],[-17,6],[-15,-16],[-14,-7],[-12,32],[-5,40],[-3,130],[11,41],[50,27],[12,28],[-9,22],[-46,45],[-14,8],[-32,0],[-33,16],[-11,-3],[-4,-11],[-4,-20],[-6,-19],[-11,-9],[-24,-2],[-11,-6],[-38,-54],[-12,-25],[-6,-45],[2,-13],[9,-11],[3,-14],[-2,-12],[-5,-6],[-5,-4],[-2,-7],[3,-19],[8,-17],[8,-11],[24,-15],[51,-78],[-13,-21],[-6,-6],[-10,-3],[10,-11],[5,-3],[0,-16],[-14,-13],[0,-20],[7,-22],[14,-18],[-10,-11],[-13,-5],[-47,-3],[-11,-6],[-64,-58],[-11,-14],[-10,-30],[-2,-28],[7,-12],[16,18],[-5,-26],[-20,-10]]],"transform":{"scale":[0.0009457674682468289,0.0004625244832483213],"translate":[20.24282596900008,43.65004994800012]}};
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
