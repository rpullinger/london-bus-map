var bus = (function(){

    var svg,
        tooltipTimeout,
        mapWrapper,
        x,
        y,
        stops,
        zoom = 1;

    function init(){

        // Add the map
        svg = d3.select(".map")
            .append("svg");

        mapWrapper = d3.select('.js-map');


        $('#stops').on('change', function(){
            $('body').toggleClass('hide-stops', !this.checked);
        });

        $('#buses').on('change', function(){
            $('body').toggleClass('hide-buses', !this.checked);
        });

        // Add elements
        mapBusStops();
        addTooltip();

        $('.js-map').panzoom({
            cursor: 'pointer',
            contain: 'invert',
            increment: 1,
            minScale: 1,
            maxScale: 15,
            $zoomIn: $('.js-zoom-in'),
            $zoomOut: $('.js-zoom-out'),
        }).on('panzoomzoom', function(e, panzoom, scale, opts){
            zoom = scale;
            console.log(zoom);
        });


        var startZoom = 1.5;
        if(window.innerWidth < 700){
            startZoom = 2;
        }
        $('.js-map').panzoom("zoom", 1.5);

    }

    function addTooltip(){
        svg.append('text')
            .attr('class', 'tooltip')
            .attr('text-anchor', "middle");
    }

    function showTooltip(text, x, y, fill){

        if (!fill) { fill = '#fff'; }

        var tooltip = d3.select('.tooltip')
            .attr('font-size', 100)
            .attr('style', 'fill:' + fill)
            .text(text)


        var bb = tooltip.node().getBBox(),
            widthTransform = 3000 / bb.width,
            heightTransform = window.innerHeight / bb.height;


        var value = 50 * widthTransform / zoom;
        tooltip
            .attr("font-size", value);

        tooltip.transition()
            .duration(200)
            .attr("x", x)
            .attr("y", y - 10)
    }

    function hideTooltip(){
        d3.select('.tooltip')
            .transition()
            .text('');
    }

    function mapBusStops(){

        d3.csv('bus-stops.csv', function(error, data) {
            if (error) {
                console.log(error);
                return;
            }

            // Filter data to remove stops without locations
            data = data.filter(function(d){
                return d.Location_Northing >= 10 && d.Location_Easting >= 10;
            });

            // Grab ratio of Northings to Easting
            var width = 3000,
                minNorthing = d3.min(data, function(d){ return d.Location_Northing; }),
                maxNorthing = d3.max(data, function(d){ return d.Location_Northing; }),
                minEasting = d3.min(data, function(d){ return d.Location_Easting; }),
                maxEasting = d3.max(data, function(d){ return d.Location_Easting; }),
                ratio = (maxNorthing - minNorthing) / (maxEasting - minEasting),
                height = Math.round(width * ratio);

            // Setup scales
            y = d3.scale.linear()
                .range([height, 0])
                .domain([minNorthing, maxNorthing ])
                .nice();

            x = d3.scale.linear()
                .range([0, width])
                .domain([minEasting, maxEasting ])
            .nice();

            // Set viewBox of the svg
            svg.attr("viewBox", "0 0 " + width + " " + height)

            // Add all the bus stops
            svg.append('g')
                .classed('stops', true)
                .selectAll("circle")
                .data(data)
                .enter()
                .append("circle")
                .attr("cx", function(d) {
                    return d3.round(x(d.Location_Easting), 0);
                })
                .attr("cy", function(d) {
                    return d3.round(y(d.Location_Northing), 0);
                })
                .attr("r", 1)
                .style("opacity", 0)
                .on("mouseover", function(d){
                    d3.select(this)
                        .classed('is-active', true);

                    // Show the tooltip
                    clearTimeout(tooltipTimeout);
                    var stop = d;
                    showTooltip(
                        stop.Stop_Name,
                        d3.round(x(stop.Location_Easting), 0),
                        d3.round(y(stop.Location_Northing), 0)
                    );
                })
                .on("mouseout", function(){

                    d3.select(this)
                        .classed('is-active', false);

                    clearTimeout(tooltipTimeout);
                    tooltipTimeout = setTimeout(hideTooltip, 500);
                });

            // Fade them all in
            svg.selectAll('circle')
                .style("opacity", 1);

            // Stops
            stops = [];

            _.each(data, function(stop, key) {
                stops[stop.Bus_Stop_Code] = stop;
            });


            // Enable stops toggle
            $('#stops').prop('checked', true);


            d3.json('routes.json', function(error, routes){

                //var routes = routes.split(',');
                console.log(routes);
                _.each(routes, function(object, key){
                    showBuses(object);
                });
                $('#buses').prop('checked', true);
            });

        });
    }


    function showBuses(line){
        d3.text('http://countdown.api.tfl.gov.uk/interfaces/ura/instant_V1?LineName='+ line + '&DirectionID=1&ReturnList=StopCode1,EstimatedTime,RegistrationNumber', function(error, busData) {

            console.log('Load –', line);

            // TFL data doesn't come as proper json - fix that
            busData = '[' + busData.replace(/]/gi, '],');
            busData = busData.slice(0, - 1) + ']';
            // console.log(busData);
            var json = JSON.parse(busData);
            json.shift();


            // Map to real names
            var obj = json.map(function mapItem(item){
                //var stop = stops.filter(function(stop) { return stop.Bus_Stop_Code === item[1] });
                return {
                    'stopID' : item[1],
                    'registrationNumber' : item[2],
                    'estimatedTime' : Math.floor((+[item[3]] - (+new Date())) /60000),
                    'stop': stops[item[1]]
                }
            });

            // Only want each bus once
            obj = _.sortBy(obj, 'estimatedTime');
            obj = _.uniq(obj, 'registrationNumber');


            // Use registration as key - helpful if we want to refresh in the future
            var bus = svg.append('g')
                .classed('buses', true)
                .selectAll('.bus' + line)
                .data(obj, function(d) { return d.registrationNumber; });

            // Add Buses
            bus.transition()
                .duration(1000)
                .attr("cx", function(d) {
                    return d3.round(x(d.stop.Location_Easting), 0);
                })
                .attr("cy", function(d) {
                    return d3.round(y(d.stop.Location_Northing), 0);
                });

            bus.enter()
                .append("circle")
                .attr('class', 'bus' + line)
                .attr("cx", function(d) {
                    // console.log('Enter - ', d.registrationNumber, d.estimatedTime);
                    return d3.round(x(d.stop.Location_Easting), 0);
                })
                .attr("cy", function(d) {
                    return d3.round(y(d.stop.Location_Northing), 0);
                })
                .attr("r", 2)
                .on("mouseover", function(d){
                    // Show the tooltip
                    clearTimeout(tooltipTimeout);
                    var stop = d;
                    showTooltip(
                        line + "(" + d.registrationNumber + ') arriving at \n ' + d.stop.Stop_Name + ' in ' + d.estimatedTime,
                        d3.round(x(d.stop.Location_Easting), 0),
                        d3.round(y(d.stop.Location_Northing), 0)
                    );
                })
                .on("mouseout", function(){
                    clearTimeout(tooltipTimeout);
                    tooltipTimeout = setTimeout(hideTooltip, 500);
                })
                .attr("style", "fill: #FF1800");

                bus.exit().remove();


                // d3.timer(function(line){
                //     showBuses(line)
                // }, 30100);
        });
    }

    return{
        start: init
    }

})();

bus.start();