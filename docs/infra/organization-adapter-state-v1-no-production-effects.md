# Organization Adapter State V1 — No Production Effects

This branch/PR is intentionally non-operative.

It does not:

- apply migration 010 to production;
- grant the live Core access to the new private tables;
- add a customer hiring route;
- install the Wandora adapter into live Paperclip;
- create/bind a live Paperclip company or agent;
- add or rotate any credential;
- modify Core/Web/Gateway production images;
- enable Human Send or Gateway outbound.

The purpose is only to version and verify the minimum private integration state justified by the disposable Paperclip evidence.
