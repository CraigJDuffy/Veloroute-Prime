		

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
	styles: [ {color:"#FE0000",opacity:0.50, weight: 16},
		{color:"#FF6300", opacity:1, weight:12},
		{color:"#FFFF01",opacity:1, weight:8},
		{color:"#008001", opacity:1, weight:6},
		{color:"#0000FE", opacity:1, weight:4},
		{color:"#4B0081", opacity:1, weight:2},
		{color:"#BC31FE", opacity:1, weight:1}]
	},
	position: 'topleft',
	geocoder: L.Mapzen.routing.geocoder(),
	router: L.Mapzen.routing.router({costing:"bicycle",costing_options:{bicycle:{use_roads:"1",use_hills:"0"}}}),
	summaryTemplate:'<div class="start">{name}</div><div class="info {costing}">{distance}, {time}</div>',
	routeWhileDragging: false,
	fitSelectedRoutes:true}).addTo(map);
	L.Mapzen.routing.errorControl(routingControl).addTo(map);

routingControl.addEventListener("routesfound", requestElevationData);

function requestElevationData(e){
	var xhttp = new XMLHttpRequest();
	var data = JSON.stringify(e.routes[0].coordinates); //Becomes an Array of {"Lat" x, "Lng" y}
	xhttp.onreadystatechange = receiveElevationData(this);
	xhttp.open("POST", "TODO.php", true);
	xhttp.setRequestHeader("Content-Type", "application/json");
	xhttp.send(data);			
}

function receiveElevationData(xhttp){
	
		//alert("!");
	
}

