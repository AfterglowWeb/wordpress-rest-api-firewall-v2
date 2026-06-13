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
}