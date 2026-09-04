<template>
  <div>
    <div
      class="wrm-separator wrm-modern"
      style="margin: 15px -15px 0px" />
    <!-- One question over every way out of the registered list: open a
      wallet on this device, or scan a code for one on another device.
      Asking it once is what keeps "Choose a Wallet" above from reading as
      a competing instruction to the rows below it.

      Rendered unconditionally: with wallets listed the rows are for a
      wallet that is not in the list, and with none there is nothing to
      see -- true either way, so it does not depend on what the greeting
      said. -->
    <div
      class="wrm-dark-gray"
      style="padding-top: 0.5em">
      Don't see your wallet?
    </div>
    <!-- Same-device wallet links: always visible, never behind the
      expander. A wallet the user already has installed is a first-class
      way to complete the exchange, on equal footing with the registered
      web wallets listed above -- not a fallback for when those fail. The
      QR code below stays behind its expander because it needs a second
      device, which is the less common case. -->
    <div v-if="walletAppUrl || walletWebUrl">
      <!-- Rendered as `wrm-item` rows, the same shape as the registered
        wallet list above, so opening a wallet the user already has reads
        as the same class of action as picking a listed one -- rather than
        a pair of small buttons trailing the list. -->
      <!-- With no wallet registered in this browser, an installed app is
        the likeliest thing the user actually has, so it is marked as the
        recommended row. With wallets listed, one of those is likelier and
        both rows stay neutral. -->
      <a
        v-if="walletAppUrl"
        class="wallet-link wrm-flex-row wrm-item"
        :class="{'wallet-link-recommended': recommendApp}"
        :href="walletAppUrl"
        @click="activate()">
        <i
          class="fas fa-mobile-alt wrm-flex-item wallet-link-icon"
          aria-hidden="true" />
        <div class="wallet-link-text">
          <strong>Open a wallet app on this device</strong>
        </div>
      </a>
      <a
        v-if="walletWebUrl"
        class="wallet-link wrm-flex-row wrm-item"
        :href="walletWebUrl"
        @click="activate()">
        <i
          class="fas fa-globe wrm-flex-item wallet-link-icon"
          aria-hidden="true" />
        <div class="wallet-link-text">
          <strong>Open a wallet website</strong>
        </div>
      </a>
      <!-- Custom-scheme navigation fails silently when nothing claims the
        scheme, with no event to detect it, so say so rather than promise an
        error that can never fire.

        Shown only after a row is activated: before that it asserts no
        wallet handles the link while a matching wallet may be listed above,
        which argues the user out of their fastest option. -->
      <div
        v-if="activated"
        class="wrm-dark-gray wallet-link-hint"
        style="font-size: 13px; padding-top: 0.5em">
        {{failureHint}}
      </div>
    </div>
    <!-- expander: the QR code is hidden until the user asks for it
      (unless not collapsible, e.g. when there are no wallets and the
      QR code is the primary option) -->
    <div
      v-if="collapsible"
      class="cross-device-toggle"
      role="button"
      tabindex="0"
      :aria-expanded="expanded"
      @click="toggle()"
      @keydown.enter.prevent="toggle()"
      @keydown.space.prevent="toggle()">
      <span>Use a wallet on another device</span>
      <i
        class="fas"
        :class="expanded ? 'fa-chevron-up' : 'fa-chevron-down'" />
    </div>
    <!-- without the toggle row above it, the block provides its own
      spacing below the separator -->
    <div
      v-if="expanded"
      :style="{paddingTop: collapsible ? '0' : '1em'}"
      style="text-align: center">
      <div class="wrm-dark-gray">
        Scan this code on a device with your wallet:
      </div>
      <img
        v-if="qrDataUrl"
        :src="qrDataUrl"
        alt="QR code for using a wallet on another device"
        style="width: 156px; height: 156px; margin: 0.5em auto">
      <div
        class="wrm-dark-gray"
        style="font-size: 14px">
        Already scanned? Click close to return to the website.
      </div>
      <div
        class="wrm-button-bar"
        style="margin: auto; padding-top: 0.5em">
        <button
          type="button"
          class="wrm-button"
          style="margin: auto"
          :disabled="loading"
          @click="close()">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2026, Digital Bazaar, Inc.
 */
import {computed, ref, toRef, watch, watchEffect} from 'vue';
import QRCode from 'qrcode';

export default {
  name: 'CrossDeviceOptions',
  props: {
    collapsible: {
      type: Boolean,
      required: false,
      default: true
    },
    interactionUrl: {
      type: String,
      required: true
    },
    loading: {
      type: Boolean,
      required: false,
      default: false
    },
    recommendApp: {
      type: Boolean,
      required: false,
      default: false
    },
    walletAppUrl: {
      type: String,
      required: false,
      default: ''
    },
    walletWebUrl: {
      type: String,
      required: false,
      default: ''
    }
  },
  emits: ['activate', 'close'],
  setup(props, {emit}) {
    // start expanded when not collapsible (the QR code is the
    // primary option, e.g. no wallets are available)
    const expanded = ref(!props.collapsible);
    const toggle = () => expanded.value = !expanded.value;
    // auto-expand if the QR code becomes the primary option (e.g. the
    // user hides the last wallet in the list)
    watch(toRef(props, 'collapsible'), collapsible => {
      if(!collapsible) {
        expanded.value = true;
      }
    });

    const qrDataUrl = ref('');
    watchEffect(async () => {
      try {
        qrDataUrl.value = await QRCode.toDataURL(props.interactionUrl, {
          errorCorrectionLevel: 'M',
          margin: 2,
          scale: 4
        });
      } catch(e) {
        // fail soft: omit the QR image, never block the chooser
        console.error('Could not generate QR code:', e);
        qrDataUrl.value = '';
      }
    });
    /* singular when only one row is shown -- on Safari the web wallet row
    is hidden, so "these links" would name something not on screen */
    const failureHint = computed(() => {
      const both = props.walletAppUrl && props.walletWebUrl;
      return both ?
        'Nothing opened? No wallet on this device handles these links.' :
        'Nothing opened? No wallet on this device handles this link.';
    });

    /* Activating a row hands the exchange to a wallet outside this
    context. Where a handler is registered the navigation replaces the
    mediator, so the response has to be emitted first or the relying party
    is left waiting on a dialog that no longer exists -- the popup path
    detects the dialog leaving by polling `handle.closed`, which a
    same-context navigation never sets.

    Where no handler is registered the navigation is a no-op, so the
    failure note is revealed instead and the dialog stays usable. Both
    outcomes are indistinguishable from here, so both are prepared for. */
    const activated = ref(false);
    const activate = () => {
      activated.value = true;
      emit('activate');
    };

    const close = () => emit('close');
    return {activate, activated, close, expanded, failureHint, qrDataUrl,
      toggle};
  }
};
</script>

<style>
/* match the registered wallet rows: full width, icon left, and a pointer
cursor -- `.wrm-item` supplies the rest */
.wallet-link.wrm-item {
  align-items: center;
  cursor: pointer;
  text-decoration: none;
  /* `wrm-flex-row` centers its children; the wallet rows above are
  left-aligned, so start the icon and text at the left edge to match */
  justify-content: flex-start;
  /* inherit the dialog's text color: as an <a>, the row would otherwise
  take the UA's blue link color and read as a different kind of thing
  from the wallet rows it sits beside */
  color: inherit;
}
.wallet-link.wrm-item:hover {
  color: inherit;
}
/* Same 48px icon slot the registered wallet rows use for their logos, so
the glyph is centered in it and every row's text starts on the same
vertical line -- the wallet list above and these rows below it. A centered
glyph in a fixed slot also keeps the rows aligned with each other when the
two icons differ in width. */
.wallet-link-icon {
  width: 48px;
  min-width: 48px;
  font-size: 28px;
  line-height: 1;
  text-align: center;
}
.wallet-link-text {
  margin-left: 10px;
  overflow: hidden;
  /* take the remaining width so the text block cannot be centered by the
  flex row's leftover space */
  flex: 1 1 auto;
}
.wallet-link-text strong {
  font-size: 14px;
}
/* the recommended row: a left accent bar and a slightly lifted
background, rather than a filled `wrm-primary` treatment, which would
overpower a full-width row and fight the wallet list beside it */
.wallet-link.wallet-link-recommended {
  background-color: #eef4fb;
  border-left: 3px solid #4a90d9;
}
@media (prefers-color-scheme: dark) {
  .wallet-link.wallet-link-recommended {
    background-color: #2b3038;
    border-left-color: #5b9bd5;
  }
}
/* the silent-failure note only matters after a tap that did nothing, so
it is de-emphasized relative to the links it explains */
.wallet-link-hint {
  opacity: 0.8;
}
</style>
