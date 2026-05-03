# WEB_project
Git Workflow & Collaboration
## 1. Getting Started (First Time Setup)
Clone the repository to your local machine:
  `git clone <your-repository-url>`
  `cd WEB_project`
## 2. Daily Routine: Always Pull First-Before starting any new work, make sure you have the latest updates from your teammate:
  `git checkout main`
  `git pull origin main`
## 3. Creating a Feature Branch-Create a new branch for every specific task you work on. Use descriptive names:
  `git checkout -b feature/your-task-name`
## 4. Saving Your Work (Commit)-Work on your files, then save your changes locally with a clear message:
  `git add . `
 ` git commit -m "Brief but descriptive message of what you changed"`
## 5 .Check your changes: Before pushing, run git status to see exactly which files you modified and ensure you are not uploading unwanted files.
  `git status`
## 6. Push to GitHub:
  `git push origin feature/task-name`
  or
 ` git push`
## 7. Pull Requests (PR) and Code Review
* When a task is ready, we open a **Pull Request** from `feature/task-name` into `develop`.
* **CRITICAL RULE:** Do NOT click Merge immediately! Both teammates must look over the code together (or the designated reviewer must thoroughly check it) to ensure nothing is broken.
* If everything is okay, the reviewer clicks **Approve** and then **Merge**.
* After the Merge, the `feature` branch can be deleted.
