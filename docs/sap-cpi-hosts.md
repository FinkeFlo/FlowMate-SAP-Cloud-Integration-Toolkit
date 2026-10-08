# SAP Integration Suite UI hosts

Which hostnames FlowMate treats as an SAP Integration Suite (Cloud Integration) UI, and where that knowledge
comes from. This table is the specification for `features/shared/cpi-url.ts` (`CPI_UI_HOSTNAME_RE`,
`CPI_UI_DOMAIN_SUFFIXES`) and for the manifest patterns derived from it in `config/sap-cpi-urls.ts`.
Change the table, the regex and `features/shared/cpi-url.test.ts` together. Last verified: 2026-10-08.

All hostnames below use dummy subaccounts (`acme-dev`); never put a real tenant host into the repository.

## Host shape

```
https://<subaccount>.integrationsuite[-trial|-cpiNNN].cfapps.<region>[-NNN].<domain>
```

| Segment | Values | Notes |
|---|---|---|
| `<subaccount>` | `[a-z0-9-]+` | BTP subaccount subdomain |
| `integrationsuite` | `integrationsuite`, `integrationsuite-trial`, `integrationsuite-cpiNNN` | see rows 1–4 |
| `cfapps` | fixed | Cloud Foundry application domain (`IT_TENANT_UX_DOMAIN` = `cfapps.<region>.<domain>`) |
| `<region>[-NNN]` | region code, optional extension landscape suffix (`eu10-005`, `us21-001`) | matched as `[a-z0-9-]+` on purpose so a new landscape does not disable the extension |
| `<domain>` | `hana.ondemand.com`, `platform.sapcloud.cn` | one manifest pattern per domain |

## Verified hosts

| # | Region / case | UI host pattern (dummy) | Runtime regex | Manifest | Status | Source |
|---|---|---|---|---|---|---|
| 1 | Cloud Foundry, all providers (AWS `eu10` `us10` `ap10` …, Azure `eu20` `us20` `ch20` …, GCP `us30` `eu30` `jp31` …, SAP Cloud Infrastructure `eu01` `eu02` (EU Access) `ae01` `us01` …) | `acme-dev.integrationsuite.cfapps.<region>.hana.ondemand.com` | accept | `https://*.hana.ondemand.com/*` | verified: domain per region; host shape | [Regions and API Endpoints (CF)](https://github.com/SAP-docs/btp-cloud-platform/blob/main/docs/10-concepts/regions-and-api-endpoints-available-for-the-cloud-foundry-environment-f344a57.md) (domain column `<region>.hana.ondemand.com`), [Publish B2B data to SAP Cloud ALM](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Trading_Partner_Management/publish-b2b-data-to-sap-cloud-alm-5ec23a5.md) (`<tenant-subdomain>.integrationsuite.cfapps.eu21.hana.ondemand.com`), [SAP-samples/teched2025-IN161](https://github.com/SAP-samples/teched2025-IN161) (`…integrationsuite.cfapps.us20…`) |
| 2 | Extension landscapes `eu10-002` … `eu10-005`, `us10-001` … `us10-003`, `eu20-001`, `eu20-002`, `us21-001` | `acme-dev.integrationsuite.cfapps.eu10-005.hana.ondemand.com` | accept | `https://*.hana.ondemand.com/*` | verified | regions page above (rows `cf-eu10-002` …), [Cloud Integration patch releases](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ci/WhatsNewInCloudIntegration/patch-releases-for-cloud-integration-023a472.md) ("extension landscape URL … `tenantxy.integrationsuite.cfapps.eu10-004.hana.ondemand.com/shell/home`") |
| 3 | SAP-operated `integrationsuite-cpiNNN` tenants | `acme-dev.integrationsuite-cpi033.cfapps.eu10-005.hana.ondemand.com` | accept (`-cpi[0-9]+`) | `https://*.hana.ondemand.com/*` | verified (SAP-owned sample repos, not SAP Help) | [SAP-samples/teched2025-IN161](https://github.com/SAP-samples/teched2025-IN161), [SAP-samples/teched2025-IN162](https://github.com/SAP-samples/teched2025-IN162) (`integrationsuite-cpi033` on `eu10-005`, `integrationsuite-cpi035` on `eu20-001`) |
| 4 | Trial (`us10`, `ap21`) | `acme.integrationsuite-trial.cfapps.us10.hana.ondemand.com` | accept (`-trial`) | `https://*.hana.ondemand.com/*` | trial regions verified; `-trial` host label only from community posts and existing FlowMate tests, not found verbatim in SAP Help | regions page above (trial table: `us10`, `ap21`), [SAP Community: Cloud Integration trial design URL](https://community.sap.com/t5/technology-q-a/cloud-integration-trial-how-to-get-url-to-design-workspace/qaq-p/12817717) |
| 5 | China `cn20` (Azure, China North 3) and `cn40` (Alibaba, Shanghai) | `acme-dev.integrationsuite.cfapps.cn40.platform.sapcloud.cn` | accept | `https://*.platform.sapcloud.cn/*` | domain and `cfapps` route verified; the composed Integration Suite UI host is inferred (not seen in an SAP source). SAP notes that China regions have no shared default domain for MTA deployments; this is assumed not to affect SaaS-provisioned Integration Suite routes, and it is the reason this row is "inferred" rather than verified | regions page above (`cn20.platform.sapcloud.cn`, `cn40.platform.sapcloud.cn`), [Region-specific IP addresses (API Management)](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/region-specific-ip-addresses-available-for-api-management-cloud-foundry-environment-683a97c.md) (Integration Suite listed for `cn20`, `cn40`), [SAP/custom-agentic-cookbook](https://github.com/SAP/custom-agentic-cookbook/blob/main/recipes/02-deploy-btp/README.md) (`<app>.cfapps.cn40.platform.sapcloud.cn`), [MTA deployment in China regions](https://github.com/SAP-docs/btp-cloud-platform/blob/main/docs/30-development/mta-deployment-in-regions-china-shanghai-and-china-north-3-f463c3d.md) |
| 6 | Other sovereign / government landscapes | — | — | — | none found: EU Access (`eu01`, `eu02`) is on `hana.ondemand.com`; no `*.ondemand.cn`, `*.cloud.sap` tenant domains exist in the SAP region list (`cloud.sap` is only the cockpit) | regions page above |

## Rejected on purpose (not supported)

| Case | Example (dummy) | Why |
|---|---|---|
| Standalone Cloud Integration on Cloud Foundry (pre-Integration-Suite subscription), UI under `/itspaces` | `acme-dev.it-cpi001.cfapps.eu10.hana.ondemand.com/itspaces` | Different UI (`/itspaces` shell); FlowMate's page detection and APIs target the Integration Suite shell. `it-cpiNNN` is also the worker/runtime label (`IT_SYSTEM_ID`, [Environment Variables](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ci/InitialSetup/environment-variables-fb24f52.md)), and runtime hosts (`it-cpiNNN-rt`) must never receive credentials. |
| Neo / Classic tenants | `acme-tmn.hci.eu1.hana.ondemand.com/itspaces` | Neo landscape ([Stable URL](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ci/Operations/stable-url-32a5a18.md): `<Account Short Name>-tmn.hci.<Landscape Host>`). Not mounted and not validated; `/itspaces` prefix logic in `getCpiBaseUrl`/`buildTenantUrl` is kept only for legacy quick links. |
| Custom domains (SAP Custom Domain service, e.g. `integration.acme.example`) | — | Cannot be matched generically by a manifest pattern or a regex; SAP KBA 3749268 confirms custom-domain SaaS routes exist for Integration Suite. Users on a custom domain must open the tenant through its SAP-provided host. |
| Other SAP apps on the same BTP domains (BTP cockpit, authentication, launchpad, Cloud Transport Management, custom CAP apps) | `acme.ts.cfapps.eu10.hana.ondemand.com`, `acme.authentication.eu10.hana.ondemand.com` | Inside the manifest pattern but rejected by the runtime regex, so the content script never mounts there and nothing is ever fetched from them. |

## Why the manifest is broader than the regex

Chrome and Firefox match patterns allow a wildcard only as the leading `*.` of the host (it then matches any
subdomain depth, e.g. `*.hana.ondemand.com` matches `a.b.c.hana.ondemand.com`); `https://*.integrationsuite.cfapps.*.hana.ondemand.com/*`
is invalid. The manifest therefore declares one `https://*.<domain>/*` pattern per domain suffix, and
`isCpiUiHostname` is the actual trust boundary (content-script mount, background `fetch`, `tabs.create`,
storage validation, popup active-tab detection).

Sources: [Chrome match patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns),
[MDN match patterns](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns).
