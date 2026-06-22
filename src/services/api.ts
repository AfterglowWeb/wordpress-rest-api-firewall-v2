<<<<<<< HEAD
import apiFetch from '@wordpress/api-fetch';

=======
>>>>>>> d78a3463b54610a29cf4b03016ae1c0da59bf6ae
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
<<<<<<< HEAD
	return apiFetch<AjaxResponse<T>>({
		url: getAjaxurl(),
		method: 'POST',
		data: {
			action,
			nonce: getNonce(),
			...data,
		},
	}).then((res) => {
=======
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
>>>>>>> d78a3463b54610a29cf4b03016ae1c0da59bf6ae
		if (!res.success) {
			throw new Error('Request failed');
		}
		return res.data;
	});
}