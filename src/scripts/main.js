		

/*	var geocoderOptions = {
	expanded: true,
	position: 'topleft',
	focus: true,
	panToPoint:true
}*/

//var geocoder = L.Mapzen.geocoder(geocoderOptions);
//geocoder.addTo(map);
var routingControl = L.Mapzen.routing.control({
	/*waypoints: [
		L.latLng(55.909795, -3.318300),
		L.latLng(55.942746, -3.215559)
	],*/
	lineOptions: {
		styles: [{
			color: "white",
			opacity: 0.8,
			weight: 12
		}, //keep it simple for now
		{
			color: "#2676C6",
			opacity: 1,
			weight: 6
		}
		]
	},
	position: 'topleft',
	geocoder: L.Mapzen.routing.geocoder(),
	router: L.Mapzen.routing.router({costing:"bicycle",costing_options:{bicycle:{use_roads:"1",use_hills:"0"}}}),
	summaryTemplate:'<div class="start">{name}</div><div class="info {costing}">{distance}, {time}</div>',
	routeWhileDragging: false,
	fitSelectedRoutes:true}).addTo(map);
	L.Mapzen.routing.errorControl(routingControl).addTo(map);

routingControl.addEventListener("routesfound", requestElevationData);


var lowerHillBound = 5;
var positiveGradientUncertainty = 7;
var negativeGradientUncertainty = 7;

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

//The data returned appears to be in meters.
function processElevationData(data) {
	var previousGrad;
	var hillStartDistance;
	var hillBaseHeight;


	for (index = 1; index < data.range_height.length; index++ , previousGrad = gradient) {

		var deltaY = (data.range_height[index][1] - data.range_height[index - 1][1]);
		var deltaX = (data.range_height[index][0] - data.range_height[index - 1][0]);
		var gradient = (deltaY / deltaX) * 100; //Gradient as a percentage

		console.log(index + " | "+ gradient);

		if (gradient > lowerHillBound) {//If greater than lower bound, start/continue a hill segment

			if (typeof (previousGrad) == 'undefined' || previousGrad < lowerHillBound) { //Start a new hill segment

				hillStartDistance = data.range_height[index - 1][0];
				hillBaseHeight = data.range_height[index - 1][1];

				console.log("Start Hill");

			} else if (gradient < previousGrad + positiveGradientUncertainty && gradient > previousGrad - negativeGradientUncertainty) {// Continue hill segment

				console.log("Continue Hill");
				
			} else {
				//rankHill(args);

				console.log("Restart Hill");

				hillStartDistance = data.range_height[index - 1][0];
				hillBaseHeight = data.range_height[index - 1][1];

				//end current segment and start a new one.
				//End segment due to sharp change in gradient
				//Start new segment as gradient is still considered a hill (above lower bound).
			}

			

		} else {
			//End current segment if applicable, as we are now nominally flat (or downhill).

			if (previousGrad > lowerHillBound) {
				//rankHill(args)
				console.log("End Hill");
			}

			
		}
	}
}


