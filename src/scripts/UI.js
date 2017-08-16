var lastClickTime;
var lastContextmenuTime;
var doubleClickDelay = 600;

//NB Mouseup doesn't fire on UNIX on a single right click. 

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
        if (Date.now() - lastClickTime < doubleClickDelay) { //Two clicks less than 600 ms apart
			lastClickTime = undefined; //Prevents false positives if three clicks are rapidly made
			map.zoomIn();
		} else {
			lastClickTime = Date.now();
		}
	}


});

document.getElementById("map").addEventListener("contextmenu", function (e) {

	if (typeof (lastContextmenuTime) == 'undefined') {
		lastContextmenuTime = Date.now();
	} else {
        if (Date.now() - lastContextmenuTime < doubleClickDelay) { //Two clicks less than 600 ms apart
			lastContextmenuTime = undefined; //Prevents false positives if three clicks are rapidly made
			e.preventDefault(); //Prevents browser context menu showing in Chrome on Windows
            e.stopPropagation();
            e.stopImmediatePropagation(); //Prevents browser context menu showing in Firefox
			map.zoomOut();
		} else {
			lastContextmenuTime = Date.now();
		}
	}

});
