require(
{
	baseUrl: "../dojo",
	djeoEngine: "povray",
	paths: {djeo: "../djeo"}
},
[
	"dojo/has",
	"djeo/Map",
	"djeo/parser/osm",
	"dojo/_base/json"
], function(has, Map, osm, json){

var inputArgs = {
	inputFile: 0,
	outputFile: 0,
	lookAt: 0
};

var style = [
	{
		filter: "this.type=='Polygon' && this.building",
		height: 15,
		roofAngle: 40,
		roofTexture: "Roof_Texture",
		wallTexture: "Wall_Texture_Outside",
		handler: "makeBuilding"
	},
	{
		filter: "this.landuse=='forest' || this.natural=='wood' || this.leisure=='park'",
		trees: ["object{Tree_00 scale 2}", "object{Tree_10 scale 2}"],
		ratios: [40, 60],
		treeCellX: 3,
		treeCellZ: 3,
		scaleFactor: 0.4,
		maxTiltAngle: 10,
		treeTexture: "Tree_10_Texture",
		handler: "makeForest"
	},
	{
		filter: "this.type=='LineString' && (this.highway=='primary' || this.highway=='secondary' || this.highway=='tertiary' || this.highway=='residential')",
		stripes: [[-4.4, 0.3], [4.4, 0.3], [0, 0.3]],
		width: 10,
		highwayTexture: "Asphalt",
		highwayHeight: 0.01,
		stripesTexture: "Stripes",
		stripesHeight: 0.01,
		handler: "makeRoad"
	},
	{
		filter: "this.type=='LineString' && this.highway=='footway'",
		width: 2,
		highwayTexture: "Footway",
		highwayHeight: 0.001,
		handler: "makeRoad"
	}
];

require(
	has("host-browser") ? [
		"djeo/control/Navigation",
		"djeo/control/Highlight",
		"djeo/control/Tooltip",
		"dojo/domReady!"
	] : [], function(Navigation, Highlight, Tooltip){
	// process command line arguments
	var numArgs = process.argv.length
	if (numArgs<5) {
		console.error("Please specify output file and camera parameters");
		return;
	}
	for (var i=3; i<numArgs; i++) {
		var split = process.argv[i].split(/=/),
			key = split[0],
			value = split[1]
		;
		if (key in inputArgs) {
			if (value.indexOf(",")>=0) {
				// we have an object; parse it
				value = json.fromJson("{"+value+"}");
			}
			inputArgs[key] = value;
		}
		else {
			console.log("Unknown key: "+key);
		}
	}
	if (!(inputArgs.inputFile && inputArgs.lookAt)) return
	var output = has("host-browser") ? "toConsole" : "toFile";
	var map = new Map("map", {
		style: style,
		userProjection: "EPSG:4326",
		lookAt: inputArgs.lookAt,
		engineOptions: {povray: {
			output: output,
			outputFile: inputArgs.outputFile || "osm.pov"
		}},
		features: osm.parseFromUrl(inputArgs.inputFile)
	});
	map.ready(function(){
		if (has("host-browser")) {
			new Navigation(map);
			new Highlight(map);
			new Tooltip(map);
		}
	});
});

});