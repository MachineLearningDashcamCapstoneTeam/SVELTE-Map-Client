<script>
	import { onMount } from "svelte";
	import { onDestroy } from "svelte";
	import { getDataWithAxios } from "utils/fetch-data.js";
	import { Data } from "constants/index.js";
	import { getListOfObjectWhereKeyContainsString } from "utils/filter-data.js";
	import { convertDateTimeToString } from "utils/date-time-converter";
	import { db } from "db/firebase.js";
	import { collectionData } from "rxfire/firestore";
	import { collection, query, orderBy, doc, getDocs } from "firebase/firestore";

	// User ID passed from parent
	export let user;
	export let collectionList;
	export let selectedGeohash;
	export let mapStyle;
	export let isReadyForStyleSwitching;
	export let kingstonDetails;
	let isDataLoaded = false;
	let map;
	const small_popup = new mapboxgl.Popup();

	const fetchInitialMapData = async () => {
		try {
			let tempList = [];

			tempList.push({ id: 0, icon: "fa-building", type: "Polygon", isShown: true, name: "Buildings", layerName: "add-3d-buildings", sourceName: "building" });
			tempList.push({ id: 1, icon: "fa-cloud", type: "Polygon", isShown: true, name: "Sky Box", layerName: "sky", sourceName: "sky" });

			const docRef = doc(db, "users", user.uid);
			const colRef = query(collection(docRef, "potholes"), orderBy("date_time_analyzed", "desc"));
			const querySnapshot = await getDocs(colRef);
			querySnapshot.forEach((doc) => {
				// doc.data() is never undefined for query doc snapshots
				// console.log(doc.id, " => ", doc.data());

				let tempDate = doc.data()["date_time_analyzed"];
				tempDate = convertDateTimeToString(tempDate);

				const potholeLayerName = `PotholeLayer ${tempDate}`;
				const potholeSourceName = `PotholeSource${tempDate}`;
				const potholeData = doc.data();

				tempList.push({
					id: doc.id,
					icon: "fa-border-all",
					type: "Polygon",
					isShown: true,
					name: potholeLayerName,
					layerName: potholeLayerName,
					sourceName: potholeSourceName,
					data: potholeData,
				});
			});

			collectionList = tempList;

		
		} catch (e) {
			console.log(e);
		}
	};

	const addDataSources = () => {
		try {
			const potholeDataList = getListOfObjectWhereKeyContainsString(collectionList, "layerName", "PotholeLayer");
			for (var i = 0; i < potholeDataList.length; i++) {
				const potholeSourceName = potholeDataList[i].sourceName;
				const potholeData = potholeDataList[i].data;
				map.addSource(potholeSourceName, {
					type: "geojson",
					data: potholeData,
				});
			}

			isDataLoaded = true;
			addLayers();
		} catch (e) {
			console.error(e);
		}
	};

	const addLayers = () => {
		addTerrainLayer(collectionList[0]);
		addBuildingLayer(collectionList[1]);

		const potholeDataList = getListOfObjectWhereKeyContainsString(collectionList, "layerName", "PotholeLayer");
		for (var i = 0; i < potholeDataList.length; i++) {
			const potholeObject = potholeDataList[i];
			addPotholeLayer(potholeObject);
		}
	};

	const addTerrainLayer = () => {
		map.addSource("mapbox-dem", {
			type: "raster-dem",
			url: "mapbox://mapbox.mapbox-terrain-dem-v1",
			tileSize: 512,
			maxzoom: 14,
		});
		// add the DEM source as a terrain layer with exaggerated height
		map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

		// add a sky layer that will show when the map is highly pitched
		map.addLayer({
			id: "sky",
			type: "sky",
			paint: {
				"sky-type": "atmosphere",
				"sky-atmosphere-sun": [0.0, 0.0],
				"sky-atmosphere-sun-intensity": 15,
			},
		});
	};

	const addBuildingLayer = () => {
		map.addLayer({
			id: "add-3d-buildings",
			source: "composite",
			"source-layer": "building",
			filter: ["==", "extrude", "true"],
			type: "fill-extrusion",
			minzoom: 15,
			paint: {
				"fill-extrusion-color": "#dee7e7",
				"fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 15, 0, 15.05, ["get", "height"]],
				"fill-extrusion-base": ["interpolate", ["linear"], ["zoom"], 15, 0, 15.05, ["get", "min_height"]],
				"fill-extrusion-opacity": 1,
			},
		});
	};

	const addPotholeLayer = (fillList) => {
		map.addLayer({
			id: fillList.layerName,
			type: "circle",
			source: fillList.sourceName,
			minzoom: 7,
			paint: {
				// Size circle radius by earthquake magnitude and zoom level
				"circle-radius": ["interpolate", ["linear"], ["zoom"], 7, ["interpolate", ["linear"], ["get", "count"], 1, 2, 3, 4], 16, ["interpolate", ["linear"], ["get", "count"], 3, 6, 9, 12]],
				// Color circle by earthquake magnitude
				"circle-color": ["get", "marker-color"],
				"circle-stroke-color": "white",
				"circle-stroke-width": 1,
				// Transition from heatmap to circle layer by zoom level
				"circle-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0, 8, 1],
			},
		});
		map.setLayoutProperty(fillList.layerName, "visibility", "none");

		// When a click event occurs on a feature in the places layer, open a popup at the
		// location of the feature, with description HTML from its properties.
		map.on("click", fillList.layerName, (e) => {
			// Add features to the description
			let description = "";
			const sliced = Object.fromEntries(Object.entries(e.features[0].properties).slice(0, 3));
			for (const [key, value] of Object.entries(sliced)) {
				description += `<span class="block font-bold">${key}</span><span class="block">${value}</span>`;
			}
			small_popup.setLngLat(e.lngLat).setHTML(description).addTo(map);
		});

		// Change the cursor to a pointer when the mouse is over the places layer.
		map.on("mouseenter", fillList.layerName, (e) => {
			map.getCanvas().style.cursor = "pointer";
		});

		// Change it back to a pointer when it leaves.
		map.on("mouseleave", fillList.layerName, () => {
			map.getCanvas().style.cursor = "";
		});
	};

	const addFilter = () => {
		// If map not loaded, abort
		if (map === null) return;

		try {
			// If any of the layers are not loaded, abort
			for (let i = 0; i < collectionList.length; i++) {
				let tempLayerName = collectionList[i]["layerName"];
				let tempLayerIsShown = collectionList[i]["isShown"];

				if (!map.getLayer(tempLayerName)) {
					return;
				}

				if (tempLayerIsShown === true) {
					map.setLayoutProperty(tempLayerName, "visibility", "visible");
				} else {
					map.setLayoutProperty(tempLayerName, "visibility", "none");
				}
			}
		} catch (e) {}
	};
	$: collectionList && isDataLoaded && addFilter();

	const switchStyle = () => {
		if (isReadyForStyleSwitching === false) return;
		try {
			map.setStyle("mapbox://styles/mapbox/" + mapStyle);
			small_popup.remove();
			selectedGeohash = null;
		} catch (e) {}
	};
	$: mapStyle && isDataLoaded && switchStyle();

	onMount(async () => {
		// Get the initial Data
		await fetchInitialMapData();

		mapboxgl.accessToken = "pk.eyJ1IjoiY2FuYWxlYWwiLCJhIjoiY2t6NmgzdGd0MTBhcTJ3bXprNjM1a3NsbiJ9.umUsk2Ky68kLBFUa6PeAxA";
		map = new mapboxgl.Map({
			center: kingstonDetails.center,
			zoom: kingstonDetails.zoom,
			pitch: kingstonDetails.pitch,
			bearing: kingstonDetails.bearing,
			container: "map",
			antialias: true,
			style: "mapbox://styles/mapbox/" + mapStyle,
		});

		map.addControl(
			new MapboxGeocoder({
				accessToken: mapboxgl.accessToken,
				mapboxgl: mapboxgl,
			})
		);

		map.addControl(new mapboxgl.FullscreenControl(), "bottom-right");
		map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

		map.on("style.load", function () {
			addDataSources();
			addFilter();
		});
	});

	onDestroy(() => {
		try {
			for (let i = 0; i < collectionList.length; i++) {
				map.removeLayer(collectionList[i]["layerName"]);
				map.removeSource(collectionList[i]["sourceName"]);
			}
			map = null;
		} catch (e) {}
	});
</script>

<div id="map" class="h-96 md:h-full rounded-lg shadow-xl" />

<style>
</style>
