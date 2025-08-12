# 🔌 Linear to Discord

A simple webhook service for sending Linear notifications to Discord, including support for Issues, Comments, Projects, and Project Updates.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvarun-raj%2Flinear-to-discord&env=DISCORD_WEBHOOK&envDescription=Discord%20webhook&envLink=https%3A%2F%2Fsupport.discord.com%2Fhc%2Fen-us%2Farticles%2F228383668-Intro-to-Webhooks&project-name=linear-to-discord&repository-name=linear-to-discord)

## Features

- **Issue notifications**: Create and update notifications for Linear issues
- **Comment notifications**: New comment notifications on issues
- **Project notifications**: Create and update notifications for Linear projects
- **Project update notifications**: Important project status reports with health indicators
- **Optional separate channels**: Configure project updates to go to a different Discord channel

## Usage

1. Create a Discord webhook in the channel you want to send notifications to. [Guide](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)
2. Copy the webhook URL and add it as an environment variable named `DISCORD_WEBHOOK` in the Vercel project.
3. **(Optional)** For project updates to go to a separate channel, create another Discord webhook and add it as `DISCORD_WEBHOOK_PROJECTS`.
4. Deploy the project to Vercel.
5. Add the webhook URL to Linear. [Guide](https://linear.app/settings/api)
6. Done! You should now receive notifications in the Discord channel(s).

## Supported Webhook Events

- **Issues**: Create and update events (title changes, status changes, assignee changes)
- **Comments**: Create events for new comments on issues
- **Projects**: Create and update events for Linear projects
- **Project Updates**: Create and update events for project status reports

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_WEBHOOK` | Yes | Main Discord webhook URL for general notifications |
| `DISCORD_WEBHOOK_PROJECTS` | No | Optional Discord webhook URL specifically for project updates |

## Project Update Features

Project updates include:
- 🟢 **On Track** - Project is progressing well
- 🟡 **At Risk** - Project has potential issues
- 🔴 **Off Track** - Project needs immediate attention  
- ✅ **Completed** - Project is finished

Each project update shows:
- Project name and link
- Author information
- Health status with visual indicators
- Truncated update content
- Link to full update

## Development

1. Clone the repository.
2. Install dependencies using `npm install`.
3. Run the development server using `npm run dev`.


## Deployment
You can use the vercel button above to deploy the project to vercel or follow the steps below to deploy it manually.

1. Clone the repository.
2. Install dependencies using `npm install`.
3. Run `npm run build` to build the project.
4. Run `npm run start` to start the server.

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE)
