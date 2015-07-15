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
        });


        var startZoom = 1.5;
        if(window.innerWidth < 700){
            startZoom = 2;
        }
        $('.js-map').panzoom("zoom", 1.5);

    }

    function addTooltip(){
        var tooltipBox = svg.append('g')
            .attr('class', 'tooltip');

    }

    function showTooltip(text, x, y){

        text.reverse();

        var tooltip = d3.select('.tooltip');


        var tooltips = tooltip
            .html('')
            .selectAll('.lines')
            .data(text)
            .enter()
            .append('text')
            .text(function(d){ return d; })
            .attr('font-size', 100)
            .attr('style', 'fill: #fff')
            .attr('y', function(d, i){ return 0;  })
            .attr('text-anchor', 'middle');

        tooltips.each(resizeText);

        var offset = 0;
        tooltips.attr('y', function(d, i){
            var y = offset,
                height = +this.getAttribute('font-size');
                offset = offset - height;
            return y;
        });



        tooltip.transition()
            .duration(200)
            .attr("transform", "translate(" + x + "," + (y - 5) + ")")
    }

    function resizeText(selection){
        var bb = this.getBBox(),
            maxWidth = window.innerWidth,
            widthTransform = maxWidth / bb.width,
            modifier = zoom > 2 ? zoom / 1 : zoom,
            value = 75 * widthTransform / modifier;

        if (value > 500){
            value = 500;
        }

        this.setAttribute("font-size", value);
    }

    function alignText(selection){
        this.selectAll()
    }

    function hideTooltip(){
        d3.selectAll('.tooltip text')
            .remove();
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
                .on("mouseover", setActive)
                // .on("touchstart", setActive)
                .on("mouseout", setUnActive)
                // .on("touchend", setUnActive);

            // Stops
            stops = [];
            _.each(data, function(stop, key) {
                stops[stop.Bus_Stop_Code] = stop;
            });



            // Enable stops toggle
            $('#stops').prop('checked', true);


            d3.json('routes.json', function(error, routes){

                var routesCopy = routes.slice();
                var i = 0;
                var perRequest = 10;
                var then = Date.now();
                function draw(){
                    var route = routesCopy.slice(i, i + perRequest - 1);
                    i = i + perRequest;
                    route = route.join(',');

                    if (route){
                        showBuses(route);
                    } else{
                        if (Date.now() - then > 30000){
                            then = Date.now();
                            i = 0;
                            routesCopy = routes.slice();
                        }
                    }

                    requestAnimationFrame(draw);
                };

                draw();

                $('#buses').prop('checked', true);
            });

        });

        function setActive(d){

            d3.select(this)
                .classed('is-active', true);

            // Show the tooltip
            clearTimeout(tooltipTimeout);
            var stop = d;
            showTooltip(
                [stop.Stop_Name],
                d3.round(x(stop.Location_Easting), 0),
                d3.round(y(stop.Location_Northing), 0)
            );
        }

        function setUnActive(d){
             d3.select(this)
                .classed('is-active', false);

            clearTimeout(tooltipTimeout);
            tooltipTimeout = setTimeout(hideTooltip, 500);
        }
    }

    function showBuses(line){
        d3.text('http://countdown.api.tfl.gov.uk/interfaces/ura/instant_V1?LineName='+ line + '&ReturnList=StopCode1,EstimatedTime,RegistrationNumber,LineName,DestinationName', function(error, busData) {

            // console.log('Load –', line);

            // TFL data doesn't come as proper json - fix that
            busData = '[' + busData.replace(/]/gi, '],');
            busData = busData.slice(0, - 1) + ']';
            var json = JSON.parse(busData);
            json.shift();


            // Map to real names
            var obj = json.map(function mapItem(item){
                //console.log(item);
                //var stop = stops.filter(function(stop) { return stop.Bus_Stop_Code === item[1] });
                return {
                    'lineName': item[2],
                    'stopID': item[1],
                    'destination': item[3],
                    'registrationNumber': item[4],
                    'estimatedTime': Math.floor((+[item[5]] - (+new Date())) /60000),
                    'stop': stops[item[1]]
                }
            });

            // Only want each bus once
            obj = _.sortBy(obj, 'estimatedTime');
            obj = _.uniq(obj, 'registrationNumber');


            var group = line.split(',')[0];

            // Use registration as key - helpful if we want to refresh in the future
            var bus = svg.selectAll('.bus' + group)
                .data(obj, function(d) { return d.registrationNumber; });

            bus.enter()
                .append("circle")
                .attr('class', 'bus' + group)
                .attr("cx", function(d) {
                    // console.log('Enter - ', d.registrationNumber, d.estimatedTime);
                    return d3.round(x(d.stop.Location_Easting), 0);
                })
                .attr("cy", function(d) {
                    return d3.round(y(d.stop.Location_Northing), 0);
                })
                .attr("r", 1.5)
                .on("mouseover", busHover)
                // .on("touchstart", busHover)
                .on("mouseout", busUnHover)
                // .on("touchend", busUnHover)
                .attr("style", function(d){
                    return d.lineName.indexOf('RB') ? "fill: #FF1800" : "fill: #738FFF"
                })
                // .attr('opacity', 0)

                bus.exit().remove();

            bus.transition()
                .duration(0)
                .attr('opacity', 1);

            // Add Buses
            bus.transition()
                .duration(1000)
                .delay(function(){ return Math.random() * 29000 })
                .attr("cx", function(d) {
                    return d3.round(x(d.stop.Location_Easting), 0);
                })
                .attr("cy", function(d) {
                    return d3.round(y(d.stop.Location_Northing), 0);
                });

        });

        function busHover(d){
            d3.select(this)
                .classed('is-active', true);

            // Show the tooltip
            clearTimeout(tooltipTimeout);
            var stop = d;

            var time = 'MINUTE';
            if (d.estimatedTime != 1){
                time += 'S';
            }

            showTooltip(
                [d.lineName, d.destination.toUpperCase(), 'ARRIVING IN ' + d.estimatedTime + ' ' + time + ' AT', d.stop.Stop_Name],
                d3.round(x(d.stop.Location_Easting), 0),
                d3.round(y(d.stop.Location_Northing), 0)
            );
        }

        function busUnHover(d){
            d3.select(this)
                .classed('is-active', false);
            clearTimeout(tooltipTimeout);
            tooltipTimeout = setTimeout(hideTooltip, 500);
        }
    }

    return{
        start: init
    }

})();

bus.start();