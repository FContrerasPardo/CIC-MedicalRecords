This folder is used to store all assets that are going to be used in the medical-records plugin. The assets are going to be copied to the dist folder when the application is built.

The configuration for assets is located in the `project.json` file of the application:

```json
{
    "input": "libs/plugins/medical-records/assets",
    "output": "assets/medical-records",
    "glob": "**/*"
}
```

In order to use an asset, add it to this folder and reference it with the path `assets/medical-records/<asset-name>`.
