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
  Datamap.prototype.wsmTopo = {"type":"Topology","objects":{"wsm":{"type":"GeometryCollection","geometries":[{"type":"Polygon","properties":{"name":"Tuamasaga"},"id":"WS.TU","arcs":[[0,1,2,3,4,5,6]]},{"type":"MultiPolygon","properties":{"name":"A'ana"},"id":"WS.AA","arcs":[[[7,8]],[[9,10,11,12,-6]]]},{"type":"Polygon","properties":{"name":"Aiga-i-le-Tai"},"id":"WS.AL","arcs":[[13,-9,14,-12]]},{"type":"Polygon","properties":{"name":"Atua"},"id":"WS.AT","arcs":[[15,16,17,18,-3,19]]},{"type":"MultiPolygon","properties":{"name":"Va'a-o-Fonoti"},"id":"WS.VF","arcs":[[[-18,20]],[[-16,21]]]},{"type":"Polygon","properties":{"name":"Fa'asaleleaga"},"id":"WS.FA","arcs":[[22,23,24]]},{"type":"MultiPolygon","properties":{"name":"Gaga'emauga"},"id":"WS.GE","arcs":[[[25,-10,-5]],[[-1,26]],[[27,28,29,30,31,-24]]]},{"type":"Polygon","properties":{"name":"Gaga'ifomauga"},"id":"WS.GI","arcs":[[32,33,34,35,-31]]},{"type":"Polygon","properties":{"name":"Vaisigano"},"id":"WS.VS","arcs":[[-35,36,37]]},{"type":"MultiPolygon","properties":{"name":"Satupa'itea"},"id":"WS.SA","arcs":[[[38,39,-29,40]],[[41,42,-37,-34]]]},{"type":"MultiPolygon","properties":{"name":"Palauli"},"id":"WS.PA","arcs":[[[43,-41,-28,-23]],[[-42,-33,-30,-40,44]]]}]}},"arcs":[[[7194,4088],[22,-923],[153,-78],[-6,918]],[[7363,4005],[1056,-928]],[[8419,3077],[-114,-998],[98,-1949]],[[8403,130],[-235,129],[-120,-25],[-319,-217],[-76,5],[-65,47],[-45,94],[-17,142],[-31,145],[-73,69],[-150,75],[-132,158],[-117,89],[-120,22]],[[6903,863],[46,986]],[[6949,1849],[29,617],[-68,582],[-35,1129]],[[6875,4177],[173,-17],[146,-72]],[[5405,3236],[86,263],[119,96]],[[5610,3595],[74,-392],[-102,-116],[-177,149]],[[6949,1849],[-176,36],[-30,-1069]],[[6743,816],[-133,-40],[-131,10],[-115,90],[-107,182],[-155,547],[-78,202],[-72,-54],[-51,0],[-129,414],[-88,120],[-168,45]],[[5516,2332],[509,716],[-152,759]],[[5873,3807],[204,164],[632,223],[166,-17]],[[5516,2332],[-151,153],[-20,359],[60,392]],[[5610,3595],[263,212]],[[8903,2863],[-105,-397],[85,-38],[150,217]],[[9033,2645],[76,-313],[-12,-172]],[[9097,2160],[-197,-43],[-51,-698],[256,-233],[289,117],[255,-272],[115,383]],[[9764,1414],[235,-622],[-78,-533],[21,-66],[34,-176],[-189,-17],[-526,121],[-314,-64],[-146,29],[-154,173],[-121,-146],[-123,17]],[[8419,3077],[322,-83],[162,-131]],[[9097,2160],[-50,-102],[-32,-115],[43,-190],[333,79],[373,-418]],[[8903,2863],[130,-218]],[[4235,4269],[-167,486],[-136,271],[-426,1979]],[[3506,7005],[102,1318],[554,57]],[[4162,8380],[7,-72],[-13,-192],[6,-74],[39,-76],[91,-83],[32,-82],[25,-180],[15,-182],[5,-390],[35,-324],[66,-197],[42,-214],[-36,-375],[-75,-264],[-86,-207],[-69,-244],[-29,-391],[23,-389],[-5,-175]],[[6903,863],[-160,-47]],[[7194,4088],[169,-83]],[[3506,7005],[-271,15]],[[3235,7020],[-324,19]],[[2911,7039],[-172,10]],[[2739,7049],[357,2950]],[[3096,9999],[162,-3],[164,-66],[160,-163],[151,-289],[429,-1098]],[[2739,7049],[-1224,72]],[[1515,7121],[-394,555]],[[1121,7676],[-53,1319]],[[1068,8995],[175,215],[85,50],[164,33],[94,52],[201,229],[86,66],[586,0],[151,53],[314,236],[172,70]],[[1121,7676],[-184,259],[-349,-543]],[[588,7392],[-113,235],[-24,84],[-8,178],[-19,91],[-43,52],[-98,-19],[-39,29],[-85,225],[-114,389],[-45,369],[119,166],[254,0],[277,-232],[252,-16],[166,52]],[[3451,4772],[-268,-216]],[[3183,4556],[-272,2483]],[[3235,7020],[216,-2248]],[[1515,7121],[-224,-1024]],[[1291,6097],[-101,90],[-78,99],[-160,555],[-96,259],[-193,165],[-75,127]],[[4235,4269],[-45,-75],[-177,4],[-77,37],[-79,83],[-117,224],[-61,166],[-73,89],[-155,-25]],[[3183,4556],[-105,-85],[-1149,-277],[-73,115],[-76,226],[-59,131],[-121,147],[-58,102],[-25,149],[-15,156],[-70,339],[-16,206],[-37,204],[-88,128]]],"transform":{"scale":[0.00013450238253824996,0.00005900655165769337],"translate":[-172.78258216099988,-14.05282968499995]}};
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
