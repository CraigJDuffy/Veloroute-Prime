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

var redHillStopIcon = L.icon({
    iconUrl: 'media/redHillStop.svg',
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

var orangeHillStopIcon = L.icon({
    iconUrl: 'media/orangeHillStop.svg',
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

var yellowHillStopIcon = L.icon({
    iconUrl: 'media/yellowHillStop.svg',
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

var greenHillStopIcon = L.icon({
    iconUrl: 'media/greenHillStop.svg',
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [16, 0]
});

routingControl.addEventListener("routesfound", routesFound);
routingControl.getPlan().addEventListener("waypointschanged", waypointsChanged);


var lowerHillBound = 6; //The cutout gradient value. Any gradient below this is nominally flat.
var positiveGradientUncertainty = 14; //The min and max change in gradient percentage points before starting a new hill.
var negativeGradientUncertainty = 14;
var hillEndDistanceRequired = 100; //Distance of nominally flat ground in meters defining the end of a hill

var latestRoute;
var elevationRequests;
var elevationReceived;
var elevationResults;
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

  

    //var polylineSegments = [];
    var data = "";
    elevationRequests = 0;
    elevationReceived = 0;
    elevationResults = [];


    for (elevationRequests = 0; (elevationRequests * 1000) < e.routes[0].coordinates.length; elevationRequests++){

        var xhttp = new XMLHttpRequest();

        xhttp.onreadystatechange = createfunc(xhttp);


        //slice(inclusive start, exclusive end)
        data = "?json={\"range\":true, \"encoded_polyline\":\"".concat(polyline.encode(e.routes[0].coordinates.slice((elevationRequests * 1000), (elevationRequests * 1000) + 1001), 6), "\"}&api_key=mapzen-bTyRhDo&id=", elevationRequests);
        //Note that having "+1001" rather than 1000 should result in each splice overlapping by one element. This avoids jumps in elevation with a 0 deltaX when the data is reconstituted.

        xhttp.open("GET", "http://elevation.mapzen.com/height".concat(data), true);
        xhttp.send();

    }



}

function createfunc(xhttp) {
    return function () { receiveElevationData(xhttp); };
}

function receiveElevationData(xhttp) {

    if (xhttp.readyState == 4 && xhttp.status == 200) {

        var temp = JSON.parse(xhttp.responseText);

        elevationResults[temp.id] = temp.range_height; //This orders the incoming results.

        elevationReceived += 1;

        //alert(elevationReceived);

        if (elevationReceived == (elevationRequests)) {
            processElevationData(reconstituteElevationData(elevationResults));
        }
    }

}

function reconstituteElevationData(elevationResults) {
    var elevationData = [];

    for (i = 0; i < elevationResults.length; i++) {

        elevationData = elevationData.concat(elevationResults[i]); //This combines all the results into a single array of data
        
    }

    var acc = elevationData[0][0];

    for (i = 1; i < elevationData.length; i++) { 

        if (elevationData[i][0] == 0) {
            acc = elevationData[i - 1][0];
            elevationData.splice(i, 1);  //Removes the element with distance index zero.
                                         //Since such elements are overlapped between the segments, removal loses no data.
                                         //However prevents having two data points with deltaX of zero.
        }

        elevationData[i][0] += acc;

    }

    return elevationData;

}

function rankHill(dY, dX, hillStartIndex, hillEndIndex) {
    var area = (0.5) * dY * dX; // area of triangle
    var gradient = (dY / dX) * 100;

    console.log(area);

    //Rounding courtesy https://stackoverflow.com/questions/11832914/round-to-at-most-2-decimal-places-only-if-necessary
    switch (gradeHill(area)) {
        case 1:
            hillMarkers.push(L.marker(latestRoute.coordinates[hillStartIndex], { icon: greenHillIcon, riseOnHover: true, bubblingMouseEvents: true }).bindTooltip("Hill Starts\nAverage Gradient: " + (Math.round(gradient * 100) / 100) + "%\n" + "Distance: " + dX + " meters").addTo(map));
            hillMarkers.push(L.marker(latestRoute.coordinates[hillEndIndex], { icon: greenHillStopIcon, riseOnHover: true, bubblingMouseEvents: true }).bindTooltip("Hill Ends\nAverage Gradient: " + (Math.round(gradient * 100) / 100) + "%\n" + "Distance: " + dX + " meters").addTo(map));
            break;
        case 2:
            hillMarkers.push(L.marker(latestRoute.coordinates[hillStartIndex], { icon: yellowHillIcon, riseOnHover: true, bubblingMouseEvents: true }).bindTooltip("Hill Starts\nAverage Gradient: " + (Math.round(gradient * 100) / 100) + "%\n" + "Distance: " + dX + " meters").addTo(map));
            hillMarkers.push(L.marker(latestRoute.coordinates[hillEndIndex], { icon: yellowHillStopIcon, riseOnHover: true, bubblingMouseEvents: true }).bindTooltip("Hill Ends\nAverage Gradient: " + (Math.round(gradient * 100) / 100) + "%\n" + "Distance: " + dX + " meters").addTo(map));
            break;
        case 3:
            hillMarkers.push(L.marker(latestRoute.coordinates[hillStartIndex], { icon: orangeHillIcon, riseOnHover: true, bubblingMouseEvents: true }).bindTooltip("Hill Starts\nAverage Gradient: " + (Math.round(gradient * 100) / 100) + "%\n" + "Distance: " + dX + " meters").addTo(map));
            hillMarkers.push(L.marker(latestRoute.coordinates[hillEndIndex], { icon: orangeHillStopIcon, riseOnHover: true, bubblingMouseEvents: true }).bindTooltip("Hill Ends\nAverage Gradient: " + (Math.round(gradient * 100) / 100) + "%\n" + "Distance: " + dX + " meters").addTo(map));
            break;
        case 4:
            hillMarkers.push(L.marker(latestRoute.coordinates[hillStartIndex], { icon: redHillIcon, riseOnHover: true, bubblingMouseEvents: true }).bindTooltip("Hill Starts\nAverage Gradient: " + (Math.round(gradient * 100) / 100) + "%\n" + "Distance: " + dX + " meters").addTo(map));
            hillMarkers.push(L.marker(latestRoute.coordinates[hillEndIndex], { icon: redHillStopIcon, riseOnHover: true, bubblingMouseEvents: true }).bindTooltip("Hill Ends\nAverage Gradient: " + (Math.round(gradient * 100) / 100) + "%\n" + "Distance: " + dX + " meters").addTo(map));
            break;
    }
}

function gradeHill(area) {
    var lvl1 = 50;
    var lvl2 = 100;
    var lvl3 = 250;
    var lvl4 = 400;

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

//The hillEndIndex variable is continually updated whilst iterating over the data. It does not include the required flat section at the end of a hill, so that the flat does not affect the hill ranking
//hillFlatDistance holds the length of the current flat segment after a hill. It is 0 when the current gradient is not flat. It is -1 when there is no hill segment to end. It is continually zeroed whenever a non-flat section is encountered (either to start or continue a hill segment). 
function processElevationData(data) {
    var previousGrad;
    var hillFlatDistance = -1;
    var lastHillGradient;

    var hillStartIndex;
    var hillEndIndex;


    for (index = 1; index < data.length; index++) {

        var deltaY = (data[index][1] - data[index - 1][1]);
        var deltaX = (data[index][0] - data[index - 1][0]);
        var gradient = (deltaY / deltaX) * 100; //Gradient as a percentage

        //console.log(index + " | " + gradient + " | +" + deltaX);

        if (gradient > lowerHillBound) {//If greater than lower bound, start/continue a hill segment

            if (hillFlatDistance == -1) { //Start a new hill segment

                hillStartIndex = index - 1;
                hillEndIndex = index;
                hillFlatDistance = 0;

               // console.log("Start");


            } else if (!(gradient < lastHillGradient + positiveGradientUncertainty && gradient > lastHillGradient - negativeGradientUncertainty)) {

                //End current segment and start a new one.
                //End segment due to sharp change in gradient
                //Start new segment as gradient is still considered a hill (above lower bound).
                //This occurs at any point in a hill or within the required distance form the end

                hillEndIndex = index - 1;

                rankHill((data[hillEndIndex][1] - data[hillStartIndex][1]), (data[hillEndIndex][0] - data[hillStartIndex][0]), hillStartIndex, hillEndIndex); //Takes in the dY and dX of the entire hill, not just one segment

                hillStartIndex = index - 1;
                hillEndIndex = index;
                hillFlatDistance = 0;

                //console.log(index + " | Split");

            } else { //Continue hill

                //console.log("Continue");

                hillEndIndex = index;
                hillFlatDistance = 0;

            }

            lastHillGradient = gradient;

        } else {
            //End current segment if applicable, as we are now nominally flat (or downhill).

            if (hillFlatDistance > hillEndDistanceRequired) { //End hill if required distance reached
                rankHill((data[hillEndIndex][1] - data[hillStartIndex][1]), (data[hillEndIndex][0] - data[hillStartIndex][0]), hillStartIndex, hillEndIndex);
                hillFlatDistance = -1;
                //console.log("End Hill");
            } else if (hillFlatDistance != -1) { //Not yet reached the required distance to end the current hill
                hillFlatDistance += (deltaX); //So add on the distance of this 'flat' segment
                //console.log("Add flat distance");
            }


        }
    }

    if (hillFlatDistance > -1) { //If there is an unfinished hill segment at the end of the route
        rankHill((data[hillEndIndex][1] - data[hillStartIndex][1]), (data[hillEndIndex][0] - data[hillStartIndex][0]), hillStartIndex, hillEndIndex);
    }
}
