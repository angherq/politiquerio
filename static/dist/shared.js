/**
 * @name http-loader
 * @version 0.0.1
 *
 * @param {int} httpStatus -
 *		0: Success (hide httpLoader)
 *		1: Error (show error)
 *		2: Loading (show gears)
**/

angular.module('app').directive('httpLoader', function() {
	return {
		restrict: 'E',
		scope: {
			errorMessage: '=?',
			httpStatus: '=',
			margin: '@?'
		},
		templateUrl: '/shared/httpLoader/view.html'
	}
});

/**
 * @name pagination-view
 * @version 0.0.1
 *
**/

angular.module('app').directive('paginationView', function() {
	return {
		restrict: 'E',
		scope: {
			pagination: '=',
		},
		templateUrl: '/shared/paginationView/view.html'
	}
});

/**
 * @name line-graph
 * @version 0.0.1
 *
**/

angular.module('app').directive('lineChart', function() {
	return {
		restrict: 'E',
		scope: {
			type: '=',
			labels: '=',
			datasets: '=',
			height: '=',
			width: '='
		},
		controller: 'LineChartController',
		controllerAs: 'vm',
		bindToController: true,
		templateUrl: '/shared/lineChart/view.html'
	}
});

/**
 * @name line-graph-controller
 * @version 0.0.1
 *
**/

angular.module('app').controller('LineChartController', [
'$scope', '$timeout', 'ChartHelpers',
function($scope, $timeout, ChartHelpers) {

	var self = this;

	self.id = Math.floor(Math.random() * 1000000);
	var chart = null;

	$scope.$watch(function() {
		return self.datasets;
	}, function(_datasets) {
		if(_datasets) $timeout(function() { drawChart() });
	});

	$scope.$watch(function() {
		return self.type;
	}, function(_type) {
		if(self.datasets) $timeout(function() { drawChart() });
	});

	function drawChart(type, labels, datasets) {

		type = type || self.type;
		labels = labels || self.labels;
		datasets = datasets || self.datasets;

		var ctx = document.getElementById("mychart");

		if(chart) chart.destroy();

		chart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: labels,
				datasets: datasets
			},
    		options: {
				responsive: true,
				legend: { position: 'bottom' },
        		scales: {
					yAxes: [{ticks: { beginAtZero:true }}],
					xAxes: []
				},
				onClick: chartClick
    		}
		});

	}

	function chartClick(x, data) {
		if(data && self.type == 'line' && self.datasets.length > 1) {
			var index = data[0]._index;
			self.type = 'bar';
			var ds = ChartHelpers.zoomDatasets(index, self.datasets, true);
			drawChart(self.type, [self.labels[index]], ds);
		}
	}

}]);

/**
 * @name table-view
 * @version 0.0.1
 *
**/

angular.module('app').directive('tableView', function() {
	return {
		restrict: 'E',
		scope: {
			view: '@',
			table: '='
		},
		controller: 'TableViewController',
		controllerAs: 'vm',
		bindToController: true,
		templateUrl: '/shared/tableView/view.html'
	}
});

/**
 * @name table-view-controller
 * @version 0.0.1
 *
**/

angular.module('app').controller('TableViewController', [
'$scope', 'DatasetHelpers', 'Helpers',
function($scope, Dataset, Helpers) {

	var self = this;

	self.three_columns = [0, 5, 10];

	self.sort = {index: 2, reverse: false};

	self.table = [];
	self.pagination = Helpers.generatePagination(0, 15, 15);

	$scope.$watch(function() {
		return self.view;
	}, function() {
		self.pagination.update(self.table.data[self.view].length);
	});

	self.setView = function(v) {
		if((v != 'estados' && !self.table.has_mun_data) || v > 1000) return;
		self.view = v;
	}

	self.sortFunc = function(item) {
		var valor = item[self.sort.index] || 0;
		return self.sort.index == 1 ? valor : -parseInt(valor);
	}

}]);

/**
 * @name: mexico-mapa-draw
 * @desc: Turns <Dataset> arrays into Chart.js dataset arrays
**/

angular.module('app').service('MexicoMapaDraw', [
'Helpers', 'MexicoMapaActions', 'MexicoMapaGradients',
function(Helpers, Actions, Gradients) {

	var _tooltip = d3.select("body").append("div")
	.attr("class", "tooltip").style("opacity", 0);

	return {
		MAP_ID: 'pol_mexico_map',
		DATASETS: null,
		GEOJSON: null,
		SVG: null,
		PATH: null,
		SCALE: 0,
		DIMENSIONS: {height: 0, width: 0},
		BOUNDS: {
			top_latitude	: 32.71865357526209,
			bottom_latitude	: 14.532098361948302,
			left_longitude	: -118.40764955087901,
			right_longitude	: -86.71040527005668
		},
		TOOLTIP: _tooltip,
		setDataset: function(ds) {
			this.DATASET = ds;
			var eds = _.pick(ds, function(v,k) { return k < 1000; });
			var mns = _.pick(ds, function(v,k) { return k > 1000; });
			this.G = {
				estatal: {min: _.min(eds), max: _.max(eds)},
				municipal: {min: _.min(mns), max: _.max(mns)}
			}
		},
		setGeoJson: function(estados, municipios) {
			this.GEOJSON = {estados: estados, municipios: municipios};
		},
		mexico: function(container_id, width) {
			var self = this;
			self.DIMENSIONS.width = width;
			// 0.62 -> La razón entre la altura y el ancho de Mexico:
			self.DIMENSIONS.height = width * 0.62;
			// Si ya se dibujo, destruye. Útil en resize
			d3.select('#' + self.MAP_ID).remove();
			// Haz que la escala sea la diferencia entra las longitudes del país
			self.SCALE = 360 * self.DIMENSIONS.width /
				(-self.BOUNDS.right_longitude - self.BOUNDS.left_longitude);
			// Dibuja
			self.SVG = d3.select(container_id)
				.append("svg")
				.attr("id", self.MAP_ID)
				.attr("width", self.DIMENSIONS.width)
				.attr("height", self.DIMENSIONS.height)
				.attr("class", "mapa");
			// translada el origen a 0,0
			var projection = d3.geoMercator().scale(self.SCALE).translate([0,0]);
			// checa donde se proyecta la coordenada izquierda
			var trans = projection([self.BOUNDS.left_longitude,
				self.BOUNDS.top_latitude]);
			// translada el mapa en en la dirección NEGATIVA del resultado
			projection.translate([-1*trans[0],-1*trans[1]]);
			self.PATH = d3.geoPath().projection(projection);
			self.estados();
		},
		estados: function() {
			var self = this;
			self.SVG.selectAll('.estado')
			.data(topojson.feature(self.GEOJSON.estados,
				self.GEOJSON.estados.objects.states).features)
			.enter()
			.append("path")
			.attr("class", function(d) { return 'estado'; })
			.on("mousemove", function(d) { Actions.mouseMove(self.TOOLTIP); })
			.on("mouseover", function(d) {
				Actions.mouseOver(d, 'estado', self.TOOLTIP, self.DATASET);
			})
			.on("mouseout", function(d) { Actions.mouseOut(self.TOOLTIP); })
			.on("click", function(d) {
				Actions.estadoClick(d, self.SVG, self.PATH, self.DIMENSIONS);
				self.municipios(d.properties.state_code);
			})
			.attr("d", self.PATH);
			// Draw borders
			self.SVG.append("path")
			.datum(topojson.mesh(self.GEOJSON.estados,
				self.GEOJSON.estados.objects.states))
			.attr("d", self.PATH).attr("class", 'estado-border');
			Gradients.draw(self.SVG, 'estado', self.DATASET, self.G);
		},
		municipios: function(estado_id) {
			var self = this;
			var mun_data = {
				type: "GeometryCollection",
				bbox: [0,0,0,0],
				geometries: self.GEOJSON.municipios[estado_id]
			}
			// If already drawn, destroy
			d3.selectAll(".municipio").remove();
			d3.selectAll(".municipio-border").remove();
			self.SVG.selectAll('.municipio')
			.data(topojson.feature(self.GEOJSON.estados, mun_data).features)
			.enter()
			.append("path")
			.on("mousemove", function(d) { Actions.mouseMove(self.TOOLTIP); })
			.on("mouseover", function(d) {
				Actions.mouseOver(d, 'municipio', self.TOOLTIP, self.DATASET);
			})
			.on("mouseout", function(d) { Actions.mouseOut(self.TOOLTIP); })
			.on("click", function(d) {
				Actions.municipioClick(d, self.SVG, self.DIMENSIONS, self.TOOLTIP);
			})
			.attr("class", function(d) { return 'municipio'; })
			.attr("d", self.PATH);
			// Draw borders
			self.SVG.append("path")
			.datum(topojson.mesh(self.GEOJSON.estados, mun_data))
			.attr("d", self.PATH).attr("class", 'municipio-border');
			Gradients.draw(self.SVG, 'municipio', self.DATASET, self.G);
		}
	}
}]);

/**
 * @name: mexico-mapa-draw
 * @desc: Turns <Dataset> arrays into Chart.js dataset arrays
**/

angular.module('app').service('MexicoMapaActions', [
'MexicoMapaZooms',
function(Zoom) {
	const PADDING = 10;
	return {
		mouseMove: function(tooltip) {
			tooltip.style("left", (d3.event.pageX) + "px")
			.style("top", (d3.event.pageY - 28) + "px");
		},
		mouseOver: function(d, tipo, tooltip, dataset) {
			var texto = "Sin datos";
			var nombre = tipo == 'estado' ?
				d.properties.state_name : d.properties.mun_name;
			var id = d.properties.state_code;
			if(tipo == 'municipio') id = id * 1000 + d.properties.mun_code;
			if(dataset[id]) texto = dataset[id].toLocaleString();
			tooltip.style("opacity", 0.9);
			tooltip.html(nombre + ': ' + texto)
				.style("left", (d3.event.pageX) + "px")
				.style("top", (d3.event.pageY - 28) + "px");
		},
		mouseOut: function(tooltip) {
			tooltip.style("opacity", 0);
		},
		estadoClick: function(d, svg, path, dim) {
			var centroid = path.centroid(d);
			var k = Zoom.getProportion(d, path, dim);
			var coords = [centroid[0] + PADDING, centroid[1] + PADDING, k];
			svg.selectAll('.estado').classed('estado-unfocused', function(d_2) {
				if(d != d_2) return true;
			})
			svg.transition().duration(500).attr('transform',
				'translate(' + dim.width / 2 + ',' + dim.height / 2 + ')\
				scale(' + coords[2] + ') translate (' + -coords[0] + ','
				+ -coords[1] + ')');
		},
		municipioClick: function(d, svg, dim, tooltip) {
			svg.selectAll('.estado').classed('estado-unfocused', false);
			svg.selectAll('.municipio-border').remove();
			svg.selectAll('.municipio').remove();
			var coords = [dim.width / 2, dim.height / 2, 1];
			svg.transition().duration(500).attr('transform',
				'translate(' + dim.width / 2 + ',' + dim.height / 2 + ')\
				scale(' + coords[2] + ') translate (' + -coords[0] + ',' + -coords[1] + ')');
			this.mouseOut(tooltip);
		}
	}
}]);

/**
 * @name: mexico-mapa-colors
**/

angular.module('app').service('MexicoMapaColors', [
function() {

	function hex(x) {
		x = x.toString(16);
		return (x.length == 1) ? '0' + x : x;
	};
	/*GOOD:

	*/
	return {
		empty : '777', // Color para cuando no hay datos
		max	  : '4679b2', // Color para el valor máximo
		min	  : 'f6f1d1', // Color para el valor mínimo
		gradient: function(ratio, color1, color2) {
			var r = Math.ceil(parseInt(color1.substring(0,2), 16) * ratio +
				parseInt(color2.substring(0,2), 16) * (1-ratio));
			var g = Math.ceil(parseInt(color1.substring(2,4), 16) * ratio +
				parseInt(color2.substring(2,4), 16) * (1-ratio));
			var b = Math.ceil(parseInt(color1.substring(4,6), 16) * ratio +
				parseInt(color2.substring(4,6), 16) * (1-ratio));
			return hex(r) + hex(g) + hex(b);
		}
	}
}]);

/**
 * @name: mexico-mapa-draw
 * @desc: Turns <Dataset> arrays into Chart.js dataset arrays
**/

angular.module('app').service('MexicoMapaGradients', [
'MexicoMapaColors',
function(Colors) {
	return {
		draw: function(svg, type, dataset, _g) {
			svg.selectAll('.' + type).attr('fill', function(d) {
				var id = d.properties.state_code;
				if(type == 'municipio') id = id * 1000 + d.properties.mun_code;
				var g = type == 'estado' ? _g.estatal : _g.municipal;
				var valor = dataset[id];
				if(!valor) return '#' + Colors.empty;
				var g = (valor - g.min) / (g.max - g.min);
				return '#' + Colors.gradient(g, Colors.max, Colors.min);
			});
		}
	}
}]);

/**
 * @name: mexico-mapa-colors
**/

angular.module('app').service('MexicoMapaZooms', [
function() {

	function hex(x) {
		x = x.toString(16);
		return (x.length == 1) ? '0' + x : x;
	};

	return {
		getProportion: function(d, path, dim) {
			var K_FIX = -1; // <- Esto se necesita por razones
			var bounds = path.bounds(d);
			var w_dif = dim.width / ((bounds[1][0] - bounds[0][0]));
			var h_dif = dim.height / ((bounds[1][1] - bounds[0][1]));
			var k = w_dif < h_dif ? w_dif : h_dif;
			if(k > 15) {
				return 20;
			} else {
				return k + K_FIX;
			}
		},
		zoomOut: function() {

		}
	}
}]);

/**
 * @name mexico-map
 * @version 0.0.1
 *
**/

angular.module('app').directive('mexicoMap', function() {
	return {
		restrict: 'E',
		scope: {
			dataset: '=',
			width: '='
		},
		controller: 'MexicoMapController',
		controllerAs: 'vm',
		bindToController: true,
		templateUrl: '/shared/mexicoMap/view.html'
	}
});

/**
 * @name mexico-map-controller
 * @version 0.0.1
 *
**/

angular.module('app').controller('MexicoMapController', [
'$scope', '$timeout', 'Rest', 'Helpers', 'MexicoMapaDraw',
function($scope, $timeout, Rest, Helpers, Draw) {

	var self = this;


	var container_id = "#pol_mexico_map_container";


	Rest.add('/static/geojson/estados.json')
	.add('/static/geojson/municipios.json')
	.load(function(err, res) {
		if(!err) {
			Draw.setGeoJson(res[0], res[1]);
			if(Draw.DATASET) {
				Draw.mexico(container_id, self.width);
				self.initialized = true;
			}
		}
	});

	$scope.$watch(function() {
		return self.dataset;
	}, function(_dataset) {
		if(_dataset) {
			Draw.setDataset(_dataset);
			if(Draw.GEOJSON) Draw.mexico(container_id, self.width);
			self.initialized = true;
		}
	});

}]);
