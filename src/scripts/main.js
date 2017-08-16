var routingControl = L.Mapzen.routing.control({
    lineOptions: {
        styles: [{
            color: "white",
            opacity: 0.8,
            weight: 12
        },
        {
            color: "#2676C6",
            opacity: 1,
            weight: 6
        }
        ]
    },
    position: 'topleft',
    geocoder: L.Mapzen.routing.geocoder(),
    router: L.Mapzen.routing.router({ costing: "bicycle", costing_options: { bicycle: { use_roads: "1", use_hills: "0" } } }),
    summaryTemplate: '<div class="start">{name}</div><div class="info {costing}">{distance}, {time}</div>',
    routeWhileDragging: false,
    fitSelectedRoutes: 'smart',
    collapsible: true
}).addTo(map);
L.Mapzen.routing.errorControl(routingControl).addTo(map);

var redHillIcon = L.icon({
    iconUrl: 'media/redHill.svg',
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [16, 0]
});

var orangeHillIcon = L.icon({
    iconUrl: 'media/orangeHill.svg',
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [16, 0]
});

var yellowHillIcon = L.icon({
    iconUrl: 'media/yellowHill.svg',
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [16, 0]
});

var greenHillIcon = L.icon({
    iconUrl: 'media/greenHill.svg',
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [16, 0]
});

routingControl.addEventListener("routesfound", routesFound);
routingControl.getPlan().addEventListener("waypointschanged", waypointsChanged);


var lowerHillBound = 6;
var positiveGradientUncertainty = 14;
var negativeGradientUncertainty = 14;
var latestRoute;
var hillMarkers = [];

function routesFound(e) {
    requestElevationData(e);
    latestRoute = e.routes[0];
}

function waypointsChanged(e) {

    if (typeof (e.waypoints[0].latlng) == 'undefined' || typeof (e.waypoints[1].latlng) == 'undefined') { //For some reason the array always has at least two elements, either or both of which may have null attributes.

        for (i = 0; i < hillMarkers.length; i++) { //remove each marker
            hillMarkers[i].remove();
        }

        hillMarkers = [];
    }
}

function requestElevationData(e) {

    var data = polyline.encode(e.routes[0].coordinates, 6);

    var xhttp = new XMLHttpRequest();
    data = "?json={\"range\":true, \"encoded_polyline\":\"".concat(data, "\"}&api_key=mapzen-bTyRhDo");
    xhttp.onreadystatechange = function () {
        receiveElevationData(xhttp);
    };
    xhttp.open("GET", "http://elevation.mapzen.com/height".concat(data), true);
    xhttp.send();
}

function receiveElevationData(xhttp) {

    if (xhttp.readyState == 4 && xhttp.status == 200) {
        processElevationData(JSON.parse(xhttp.responseText));
    }

}

function rankHill(dY, dX, hillStartIndex) {
    var area = (0.5) * dY * dX; // area of triangle
    var gradient = (dY / dX) * 100;


    //Rounding courtesy https://stackoverflow.com/questions/11832914/round-to-at-most-2-decimal-places-only-if-necessary
    switch (gradeHill(area)) {
        case 1:
            hillMarkers.push(L.marker(latestRoute.coordinates[hillStartIndex], { icon: greenHillIcon, riseOnHover: true, bubblingMouseEvents: true }).bindTooltip("Average Gradient: " + (Math.round(gradient * 100) / 100) +"%\n" + "Distance: " + dX +" meters").addTo(map));
            break;
        case 2:
            hillMarkers.push(L.marker(latestRoute.coordinates[hillStartIndex], { icon: yellowHillIcon, riseOnHover: true, bubblingMouseEvents: true }).bindTooltip("Average Gradient: " + (Math.round(gradient * 100) / 100) + "%\n" + "Distance: " + dX + " meters").addTo(map));
            break;
        case 3:
            hillMarkers.push(L.marker(latestRoute.coordinates[hillStartIndex], { icon: orangeHillIcon, riseOnHover: true, bubblingMouseEvents: true }).bindTooltip("Average Gradient: " + (Math.round(gradient * 100) / 100) + "%\n" + "Distance: " + dX + " meters").addTo(map));
            break;
        case 4:
            hillMarkers.push(L.marker(latestRoute.coordinates[hillStartIndex], { icon: redHillIcon, riseOnHover: true, bubblingMouseEvents: true }).bindTooltip("Average Gradient: " + (Math.round(gradient * 100) / 100) + "%\n" + "Distance: " + dX + " meters").addTo(map));
            break;
    }
}

function gradeHill(area) {
    var lvl1 = 5;
    var lvl2 = 20;
    var lvl3 = 40;
    var lvl4 = 60;

    if (area > lvl1) {
        if (area < lvl2) {
            return 1;
        }
        else if (area < lvl3) {
            return 2;
        }
        else if (area < lvl4) {
            return 3;
        }
        else {
            return 4;
        }
    }
}


//The data returned appears to be in meters.
function processElevationData(data) {
    var previousGrad;
    var hillStartIndex;

    var hillStartHeight; //Used to hold details of the base of the hill for the ranking algorithm.
    var hillStartDistance;

    for (index = 1; index < data.range_height.length; index++ , previousGrad = gradient) {

        var deltaY = (data.range_height[index][1] - data.range_height[index - 1][1]);
        var deltaX = (data.range_height[index][0] - data.range_height[index - 1][0]);
        var gradient = (deltaY / deltaX) * 100; //Gradient as a percentage


        if (gradient > lowerHillBound) {//If greater than lower bound, start/continue a hill segment

            if (typeof (previousGrad) == 'undefined' || previousGrad < lowerHillBound) { //Start a new hill segment

                hillStartIndex = index - 1;
                hillStartHeight = data.range_height[index - 1][1];
                hillStartDistance = data.range_height[index - 1][0];

            } else if (gradient < previousGrad + positiveGradientUncertainty && gradient > previousGrad - negativeGradientUncertainty) {// Continue hill segment


            } else {

                //End current segment and start a new one.
                //End segment due to sharp change in gradient
                //Start new segment as gradient is still considered a hill (above lower bound).
                rankHill((data.range_height[index - 1][1] - hillStartHeight), (data.range_height[index - 1][0] - hillStartDistance), hillStartIndex); //Takes in the dY and dX of the entire hill, not just one segment
                hillStartIndex = index - 1;
                hillStartHeight = data.range_height[index - 1][1];
                hillStartDistance = data.range_height[index - 1][0];

            }

        } else {
            //End current segment if applicable, as we are now nominally flat (or downhill).

            if (previousGrad > lowerHillBound) {
                rankHill((data.range_height[index - 1][1] - hillStartHeight), (data.range_height[index - 1][0] - hillStartDistance), hillStartIndex);
            }


        }
    }
}
