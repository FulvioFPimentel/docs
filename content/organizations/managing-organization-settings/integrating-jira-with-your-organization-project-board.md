---
title: 'Integrating Jira with your organization {% data variables.projects.projects_v1_board %}'
intro: 'You can integrate Jira Cloud with your organization account to scan commits and pull requests, creating relevant metadata and hyperlinks in any mentioned Jira issues.'
redirect_from:
  - /articles/integrating-jira-with-your-organization-project-board
  - /github/setting-up-and-managing-organizations-and-teams/integrating-jira-with-your-organization-project-board
versions:
  feature: projects-v1
shortTitle: Integrate Jira
allowTitleToDifferFromFilename: true
---

{% data reusables.profile.access_org %}
{% data reusables.profile.org_settings %}
1. In the left sidebar, select **{% octicon "code" aria-hidden="true" aria-label="code" %} Developer settings**, then click **OAuth Apps**.
1. Click **New OAuth App**.
1. Under **Application name**, type "Jira".
1. Under **Homepage URL**, type the full URL to your Jira instance.
1. Under **Authorization callback URL**, type the full URL to your Jira instance.
1. Click **Register application**.
1. Under **Organization owned applications**, note the "Client ID" and "Client Secret" values.
{% data reusables.user-settings.jira_help_docs %}

## Further reading

* [AUTOTITLE](/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-personal-account-settings/integrating-jira-with-your-personal-projects)
* [Connect Jira Cloud to GitHub](https://confluence.atlassian.com/adminjiracloud/connect-jira-cloud-to-github-814188429.html) in the Atlassian documentation
