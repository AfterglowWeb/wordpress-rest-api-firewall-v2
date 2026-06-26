import apiFetch from '@wordpress/api-fetch';

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
	return apiFetch<AjaxResponse<T>>({
		url: getAjaxurl(),
		method: 'POST',
		data: {
			action,
			nonce: getNonce(),
			...data,
		},
	}).then((res) => {
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