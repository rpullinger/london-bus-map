var bus = (function(){

    var svg,
        tooltipTimeout,
        mapWrapper;
        zoom = 1;

    function init(){

        // Add the map
        svg = d3.select(".map")
            .append("svg");

        mapWrapper = d3.select('.js-map');

        // Add elements
        addTooltip();
        mapBusStops();

        $('.js-map').panzoom({
            cursor: 'pointer',
            contain: 'invert',
            increment: 1,
            minScale: 1,
            maxScale: 10,
            $zoomIn: $('.js-zoom-in'),
            $zoomOut: $('.js-zoom-out'),
        });


        if(window.innerWidth < 700){
            $('.js-map').panzoom("zoom", 2);
        }
        // $(window).on('resize', function() {
        //     $('.js-map').panzoom('resetDimensions');
        // });
    }

    function addTooltip(){
        svg.append('text')
            .attr('class', 'tooltip')
    }

    function showTooltip(text, x, y){
        var tooltip = d3.select('.tooltip')
            .transition()
            .duration(200)
            .attr("x", x)
            .attr("y", y)
            .text(text);
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
            var y = d3.scale.linear()
                .range([height, 0])
                .domain([minNorthing, maxNorthing ])
                .nice();

            var x = d3.scale.linear()
                .range([0, width])
                .domain([minEasting, maxEasting ])
            .nice();

            // Set viewBox of the svg
            svg.attr("viewBox", "0 0 " + width + " " + height)

            // Add all the bus stops
            svg.append('g')
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
                .attr("r", 2)
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
                .transition()
                .delay(function(){ return Math.random() * 10000; })
                .style("opacity", 1)

        });
    }

    return{
        start: init
    }

})();

bus.start();