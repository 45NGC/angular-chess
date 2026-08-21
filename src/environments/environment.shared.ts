function buildDefaultOnlineApiBaseUrl(): string {
	if (typeof window === 'undefined') {
		return 'http://localhost:8080';
	}
	return `${window.location.protocol === 'https:' ? 'https' : 'http'}://${window.location.hostname}:8080`;
}

function buildDefaultOnlineWebSocketUrl(): string {
	if (typeof window === 'undefined') {
		return 'ws://localhost:8080/ws';
	}
	const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
	return `${protocol}://${window.location.hostname}:8080/ws`;
}

export function createEnvironment(production: boolean) {
	return {
		production,
		onlineBackend: {
			apiBaseUrl: buildDefaultOnlineApiBaseUrl(),
			webSocketUrl: buildDefaultOnlineWebSocketUrl()
		}
	};
}
