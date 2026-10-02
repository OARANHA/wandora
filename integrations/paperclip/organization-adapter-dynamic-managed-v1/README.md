# Organization Adapter Dynamic Managed Employee Candidate V1

This directory is a **candidate overlay**, not a second runtime plugin
implementation.

The canonical source remains
`integrations/paperclip/plugins/organization-adapter-v1` at version **0.6.1**,
pinned to `wandora/paperclip:v2026.916.1`.

`organization-adapter-v0.7.0.patch` is applied only to a disposable copy by
`compose-candidate.sh`. The resulting 0.7.0 candidate is built against the
qualified five-patch Paperclip dynamic-managed Agent profile.

This preserves the historical/production 0.6.1 guards while proving the
additive dynamic employee bridge without duplicating a runtime implementation.

No source in this directory is installed or promoted by merging it.
