type AjaxResponse<T> = {
	success: boolean;
	data: T;
};

function getAjaxurl(): string {
	return (window as any).bromateRestApiFirewall?.ajaxurl;
}

function getNonce(): string {
	return (window as any).bromateRestApiFirewall?.nonce;
}

export async function apiRequest<T>(
	action: string,
	data: Record<string, any> = {}
): Promise<T> {
	const nonce = getNonce();
	return fetch( getAjaxurl(), {
		method: 'POST',
		headers: {
				'Content-Type':
					'application/x-www-form-urlencoded; charset=UTF-8',
			},
		body: new URLSearchParams( {
				action,
				nonce,
				...data
			} ),
	})
	.then( ( r ) => r.json() )
	.then((res:AjaxResponse<T>) => {
		if (!res.success) {
			throw new Error('Request failed');
		}
		return res.data;
	});

	if (!response.ok) {
		throw new Error(`HTTP error ${response.status}`);
	}

	const res: AjaxResponse<T> = await response.json();

	if (!res.success) {
		const message =
			(res.data as any)?.message ??
			(typeof res.data === 'string' ? res.data : 'Request failed');
		throw new Error(message);
	}

	return res.data;
}