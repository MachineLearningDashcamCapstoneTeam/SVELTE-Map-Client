<script>
	import Navbar from "components/Navbar.svelte";
	import Footer from "components/Footer.svelte";
	import Map from "components/Map.svelte";
	import AttentionBar from "components/AttentionBar.svelte";
	import Profile from "components/Profile.svelte";
	import DateTime from "components/DateTime.svelte";
	import Layers from "components/Layers.svelte";
	import StyleSelector from "components/StyleSelector.svelte";




	import { auth, googleProvider } from 'db/firebase'
	import { authState } from 'rxfire/auth'
	let user = null
	const unsubscribe = authState(auth).subscribe(u => (user = u))
	function login() {
		auth.signInWithPopup(googleProvider)
	}



	import { getCurrentDateInYYYYMMDD, getCurrentTime } from "utils/fetch-time.js";

	let collectionList = [];
	let selectedGeohash = null;
	let selectedDate = getCurrentDateInYYYYMMDD();
	let selectedTime = getCurrentTime();
	let mapStyle = "navigation-night-v1";
	let isReadyForStyleSwitching = false;
	let kingstonDetails = {
		id: 0,
		photoURL: "https://www.meme-arsenal.com/memes/bd75c0339be8bbe24aeecd9c64764321.jpg",
		displayName: "Waterdown",
		center: [-79.8833298, 43.333332],
		zoom: 12,
		pitch: 45,
		bearing: -17.6,
	};

	const fetchData = () => {
		alert(`Fetching data for: ${selectedDate} at ${selectedTime} => Geohash : ${selectedGeohash}`);
	};
</script>

<Navbar />

{#if user}

<AttentionBar />

<section class="grid grid-cols-1  md:grid-cols-12 grid-rows-6  gap-4 py-4 px-4 h-fit">
	<div class="col-span-1 md:col-span-3 row-span-6 grid grid-cols-1 md:grid-cols-1 gap-4 h-fit">
		<div class="col-span-1 md:col-span-1 row-span-1">
			<Layers bind:collectionList />
		</div>

		<div class="col-span-1 md:col-span-1 row-span-1">
			<DateTime bind:selectedDate bind:selectedTime />
		</div>

		<div class="col-span-1 md:col-span-1 row-span-1">
			<Profile {user} {kingstonDetails}/>
		</div>

	</div>

	<div class="col-span-1 md:col-span-9  row-span-6 relative">
		<Map bind:user {kingstonDetails} bind:collectionList bind:mapStyle bind:isReadyForStyleSwitching bind:selectedGeohash />
		<div class="absolute top-1 left-1 ">
			<StyleSelector bind:mapStyle bind:isReadyForStyleSwitching />
		</div>
	</div>
</section>
{:else}

<section class="grid grid-cols-1  md:grid-cols-12 grid-rows-6  gap-4 py-4 px-4 h-fit">
	
		<div class="col-span-1 md:col-span-3 row-span-1">
			<button class="card-btn card-btn-blue rounded-lg" on:click={login}> Signin with Google </button>
		</div>

</section>

{/if}


<Footer />

<style>
</style>
