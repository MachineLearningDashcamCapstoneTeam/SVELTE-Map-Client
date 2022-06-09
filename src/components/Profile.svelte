<script>
	import { auth, googleProvider } from "db/firebase";
	import { getCurrentDateTime } from "utils/fetch-time";
	export let kingstonDetails;

	export let user;
	const { displayName } = { ...user };
</script>

<section class="rounded-lg shadow-xl text-sm p-4">
	<p class="font-bold my-1">User:</p>
	<p>{displayName}</p>
	<p class="font-bold my-1">City:</p>
	<p>{kingstonDetails.displayName}</p>

	<p class="font-bold my-1">Map Data:</p>
	<p>Data taken from API on {getCurrentDateTime()}</p>

	<p class="font-bold my-1">Details:</p>
	<button class="card-btn w-full block card-btn-red rounded-lg" on:click={() => auth.signOut()}>Logout</button>
</section>
