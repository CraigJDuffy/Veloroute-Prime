var lastClickTime;
var lastContextmenuTime;

/*
The following functions allow for zooming in and out via double clicking of the left and right mouse buttons.
The map.on method fires for left clicks, only on the map.
The getElementById method fires for anything within the "map" div (map and geocoder). This is neccessary as the equivalent map.on method doesn't appear to ever fire.
No known method for hiding the browser context menu in Firefox has yet been found. Current method works for hiding in Chrome. Others untested.
*/

map.on("click", function (e) {

	if (typeof (lastClickTime) == 'undefined') {
		lastClickTime = Date.now();
	} else {
		if (Date.now() - lastClickTime < 600) { //Two clicks less than 600 ms apart
			lastClickTime = undefined; //Prevents false positives if three clicks are rapidly made
			map.zoomIn();
			alert("Map double left click");
		} else {
			lastClickTime = Date.now();
		}
	}


});

document.getElementById("map").addEventListener("contextmenu", function (e) {

	if (typeof (lastContextmenuTime) == 'undefined') {
		lastContextmenuTime = Date.now();
	} else {
		if (Date.now() - lastContextmenuTime < 600) { //Two clicks less than 600 ms apart
			lastContextmenuTime = undefined; //Prevents false positives if three clicks are rapidly made
			e.preventDefault(); //Prevents browser context menu showing...in Chrome
			e.stopPropagation(); //No known effect
			map.zoomOut();
			alert("Map double right click");
		} else {
			lastContextmenuTime = Date.now();
		}
	}

});
