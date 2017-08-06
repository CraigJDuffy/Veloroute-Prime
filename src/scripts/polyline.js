'use strict';

/*Code taken and modified from https://github.com/mapbox/polyline

Copyright(c), Development Seed  
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
	are permitted provided that the following conditions are met:

- Redistributions of source code must retain the above copyright notice, this
list of conditions and the following disclaimer.
- Redistributions in binary form must reproduce the above copyright notice, this
list of conditions and the following disclaimer in the documentation and/ or
other materials provided with the distribution.
- Neither the name "Development Seed" nor the names of its contributors may be
used to endorse or promote products derived from this software without
specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED.IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
	(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

/**
 * Based off of [the offical Google document](https://developers.google.com/maps/documentation/utilities/polylinealgorithm)
 *
 * Some parts from [this implementation](http://facstaff.unca.edu/mcmcclur/GoogleMaps/EncodePolyline/PolylineEncoder.js)
 * by [Mark McClure](http://facstaff.unca.edu/mcmcclur/)
 *
 * @module polyline
 */

var polyline = {};
var range_coord = [];
var geod = GeographicLib.Geodesic.WGS84;
var acc = new GeographicLib.Accumulator.Accumulator();

function py2_round(value) {
	// Google's polyline algorithm uses the same rounding strategy as Python 2, which is different from JS for negative values
	return Math.floor(Math.abs(value) + 0.5) * Math.sign(value);
}

function encode(current, previous, factor) {
	current = py2_round(current * factor);
	previous = py2_round(previous * factor);
	var coordinate = current - previous;
	coordinate <<= 1;
	if (current - previous < 0) {
		coordinate = ~coordinate;
	}
	var output = '';
	while (coordinate >= 0x20) {
		output += String.fromCharCode((0x20 | (coordinate & 0x1f)) + 63);
		coordinate >>= 5;
	}
	output += String.fromCharCode(coordinate + 63);

	if (coordinate + 63 == 92) {
		output += "\\";
	}

	return output;
}

//Decode will require modification to allow for double blackslash characters

/**
 * Decodes to a [latitude, longitude] coordinates array.
 *
 * This is adapted from the implementation in Project-OSRM.
 *
 * @param {String} str
 * @param {Number} precision
 * @returns {Array}
 *
 * @see https://github.com/Project-OSRM/osrm-frontend/blob/master/WebContent/routing/OSRM.RoutingGeometry.js
 */
polyline.decode = function (str, precision) {
	var index = 0,
		lat = 0,
		lng = 0,
		coordinates = [],
		shift = 0,
		result = 0,
		byte = null,
		latitude_change,
		longitude_change,
		factor = Math.pow(10, precision || 5);

	// Coordinates have variable length when encoded, so just keep
	// track of whether we've hit the end of the string. In each
	// loop iteration, a single coordinate is decoded.
	while (index < str.length) {

		// Reset shift, result, and byte
		byte = null;
		shift = 0;
		result = 0;

		do {
			byte = str.charCodeAt(index++) - 63;
			result |= (byte & 0x1f) << shift;
			shift += 5;
		} while (byte >= 0x20);

		latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

		shift = result = 0;

		do {
			byte = str.charCodeAt(index++) - 63;
			result |= (byte & 0x1f) << shift;
			shift += 5;
		} while (byte >= 0x20);

		longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

		lat += latitude_change;
		lng += longitude_change;

		coordinates.push([lat / factor, lng / factor]);
	}

	return coordinates;
};

/**
 * Encodes the given [latitude, longitude] coordinates array.
 *
 * @param {Array.<Array.<Number>>} coordinates
 * @param {Number} precision
 * @returns {String}
 */
polyline.encode = function (coordinates, precision) {
	if (!coordinates.length) { return ''; }

	var factor = Math.pow(10, precision || 5),
        output = encode(coordinates[0].lat, 0, factor) + encode(coordinates[0].lng, 0, factor);

    range_coord = [[0, coordinates[0]]];
    acc.Set(0);

	for (var i = 1; i < coordinates.length; i++) { //Note iteration starts at index 1
		var a = coordinates[i], b = coordinates[i - 1];
		output += encode(a.lat, b.lat, factor);
        output += encode(a.lng, b.lng, factor);

        acc.Add(geod.Inverse(coordinates[i - 1].lat, coordinates[i - 1].lng, coordinates[i].lat, coordinates[i].lng).s12);
        range_coord[i] = [acc.Sum(), coordinates[i]];
	}

	return output;
};

function flipped(coords) {
	var flipped = [];
	for (var i = 0; i < coords.length; i++) {
		flipped.push(coords[i].slice().reverse());
	}
	return flipped;
}

/**
 * Encodes a GeoJSON LineString feature/geometry.
 *
 * @param {Object} geojson
 * @param {Number} precision
 * @returns {String}
 */
polyline.fromGeoJSON = function (geojson, precision) {
	if (geojson && geojson.type === 'Feature') {
		geojson = geojson.geometry;
	}
	if (!geojson || geojson.type !== 'LineString') {
		throw new Error('Input must be a GeoJSON LineString');
	}
	return polyline.encode(flipped(geojson.coordinates), precision);
};

/**
 * Decodes to a GeoJSON LineString geometry.
 *
 * @param {String} str
 * @param {Number} precision
 * @returns {Object}
 */
polyline.toGeoJSON = function (str, precision) {
	var coords = polyline.decode(str, precision);
	return {
		type: 'LineString',
		coordinates: flipped(coords)
	};
};

if (typeof module === 'object' && module.exports) {
	module.exports = polyline;
}

polyline.getRange_Coords = function () {
    return range_coord;
}