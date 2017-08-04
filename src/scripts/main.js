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
    fitSelectedRoutes: true
}).addTo(map);
L.Mapzen.routing.errorControl(routingControl).addTo(map);

routingControl.addEventListener("routesfound", requestElevationData);


var lowerHillBound = 6;
var positiveGradientUncertainty = 14;
var negativeGradientUncertainty = 14;

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

function rankHill(dY, dX, hillStartDistance) {
    var area = (0.5) * dY * dX; // area of triangle
    //console.log("Area:" + area);

    switch (gradeHill(area)) {
        case 1:
            console.log("Insignificant hill at: " + hillStartDistance);
            break;
        case 2:
            console.log("Average hill at: " + hillStartDistance);
            break;
        case 3:
            console.log("Potentially Challenging hill at: " + hillStartDistance);
            break;
        case 4:
            console.log("Challenging hill at: " + hillStartDistance);
            break;
        default:
        //console.log("Error reciving hill");
    }
}

function gradeHill(area) {
    var lvl1 = 20;
    var lvl2 = 30;
    var lvl3 = 50;
    var lvl4 = 70;

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
        return 0;
    }
}


//The data returned appears to be in meters.
function processElevationData(data) {
    var previousGrad;
    var hillStartDistance;
    var hillBaseHeight;


    for (index = 1; index < data.range_height.length; index++ , previousGrad = gradient) {

        var deltaY = (data.range_height[index][1] - data.range_height[index - 1][1]);
        var deltaX = (data.range_height[index][0] - data.range_height[index - 1][0]);
        var gradient = (deltaY / deltaX) * 100; //Gradient as a percentage

        //console.log(index + " | " + data.range_height[index][0]);

        if (gradient > lowerHillBound) {//If greater than lower bound, start/continue a hill segment

            if (typeof (previousGrad) == 'undefined' || previousGrad < lowerHillBound) { //Start a new hill segment

                hillStartDistance = data.range_height[index - 1][0];
                hillBaseHeight = data.range_height[index - 1][1];

                //console.log("Start Hill");
                //console.log(index + " | "+ gradient);

            } else if (gradient < previousGrad + positiveGradientUncertainty && gradient > previousGrad - negativeGradientUncertainty) {// Continue hill segment

                //console.log("Continue Hill");

            } else {
                rankHill(deltaY, deltaX, hillStartDistance);

                //console.log("Restart Hill");

                hillStartDistance = data.range_height[index - 1][0];
                hillBaseHeight = data.range_height[index - 1][1];

                //end current segment and start a new one.
                //End segment due to sharp change in gradient
                //Start new segment as gradient is still considered a hill (above lower bound).
            }


        } else {
            //End current segment if applicable, as we are now nominally flat (or downhill).

            if (previousGrad > lowerHillBound) {
                rankHill(deltaY, deltaX, hillStartDistance);
                //console.log("End Hill");
            }


        }
    }
}
