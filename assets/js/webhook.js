window.restApiFirewallTriggerWebhook = function () {
	const restApiFirewallWebhookService =
		window.restApiFirewallWebhookService || {};

	if ( ! confirm( restApiFirewallWebhookService?.confirmMessage ) ) {
		return;
	}

	jQuery.post(
		restApiFirewallWebhookService?.ajaxurl,
		{
			action: 'trigger_application_webhook',
			nonce: restApiFirewallWebhookService?.nonce,
		},
		function ( response ) {
			if ( response.success && response.data ) {
				const data = JSON.parse( response.data );
				const d = data.timestamp
					? new Date( data.timestamp ).toLocaleDateString()
					: '';
				const t = data.timestamp
					? new Date( data.timestamp ).toLocaleTimeString()
					: '';
				alert( `Success\n${ data.message }\n${ d } @ ${ t }` );
			} else {
				alert(
					'Error: ' +
						( response.data && response.data.error
							? response.data.error
							: 'Unknown error' )
				);
			}
		}
	);
};
