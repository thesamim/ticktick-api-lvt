import { Tick } from '../src'
import dotenv from 'dotenv'
import { ITask } from '../src/types/Task'
dotenv.config()
import { isValid } from '../src/utils/validate'
import fs from "fs";

let allAllTasks: ITask[] = null;
let donePrinted: string[] = [];

export async function testTick() {
  try {
    const envUSERNAME = process.env.TICK_USERNAME
    const envPASSWORD = process.env.TICK_PASSWORD
    const baseURL =   "dida365.com" //"ticktick.com"

    const projectID = "" // an arbitrary project id to test with.;
    const token = ""; //token grabbed from login cookie.
    const tickSession = new Tick({username: envUSERNAME,password: envPASSWORD, token: token, baseUrl: baseURL});

    //If you have not gotten a token (using your favorite method), you will need to login first and
    // grab the token (using your favorite method.) This is not demonstrated here.
    const hasLoggedIn = await tickSession.login();

    if (!hasLoggedIn) {
      throw new Error("Login failed.")
    }
    let response = await tickSession.getUserSettings();
    // console.log("Response:", JSON.parse(response))

    if (!response) {
      console.error("Not Logged in.", tickSession.lastError)
      return;
    }

    response = await tickSession.getInboxProperties();
    // console.log(response, tickSession.inboxId)
    console.log("this much")
    let bkup = await  tickSession.exportData();
    if (tickSession.lastError.statusCode != "200") {
      console.log("What? ", tickSession.lastError)
    } else {
      console.log("Got a : ", bkup, bkup[0].substring(1, 50))
      fs.writeFileSync("e:\\temp\\ttbckup.csv", bkup)
    }
return


    // let myTask: ITask = {
    //   "projectId": projectID,
    //   "title": "Trying too many things. #otherNewTest 10/21/2023 -- latest.",
    //   "tags": ["NewTest"]
    // }
    // let addResult = await tickSession.addTask(myTask);
    // console.log("Add Result : ", addResult);

    // let newTaskId = "6515b1642b3163961425bb73";
    // let newTaskTitle = "";
    // console.log("New Id: ", newTaskId, "New Title: ", newTaskTitle);
    // let addedTask = await tickSession.getTask(newTaskId, projectID)
    // console.log("getTask result: ", addedTask);

    // let myTask: ITask = {
    //   "projectId": projectID,
    //   "title": addedTask.title + " just add something.",
    //   // "tags": ["NewTest"],
    //   "id": newTaskId,
    //   "status": 3
    // }
    // let addResult = await tickSession.updateTask(myTask);
    // console.log("Update Result : ", addResult);
    // const allAllTasks = await tickSession.getAllTasks();
    // if (allAllTasks !== undefined && allAllTasks !== null) {
    //   console.log("==== allAllTasks")
    //   console.log(allAllTasks.map((item) => item.title));
    //   console.log("==== items of allAllTasks")
    //   console.log(allAllTasks.map((item) => item.items))
    //   console.log("==== content of allAllTasks")
    //   console.log(allAllTasks.map((item) => item.content))
    // }else {
    //   console.log("==== No allAllTasks")
    // }
    allAllTasks = await tickSession.getAllTasks();
    if (allAllTasks !== undefined && allAllTasks !== null) {
      allAllTasks = allAllTasks.filter((currentTask) => currentTask.status == 0);
      //make sure top level tasks are first
      allAllTasks.sort((a, b) => {
        if (isValid(a.parentId) && isValid(b.parentId)) {
          return (a.parentId < b.parentId)
        } else if (isValid(a.parentId)) {
          return 1;
        } else {
          return -1;
        }
      });
      // allAllTasks.forEach(task => console.log(task.title))


      // console.log(allAllTasks.map((currentTask) => `${currentTask.title}, ${currentTask.sortOrder}`))
      printTasks(allAllTasks);
      return
      // let oneLevelTasks = allAllTasks.filter((currentTask) => !isAChild(currentTask.parentId));
      // let taskWithChildren = allAllTasks.filter((currentTask) => isAChild(currentTask.parentId));
      // console.log(`No Parent tasks: \n ${oneLevelTasks.map((currentTask) => currentTask.title)}\n`)
      // console.log(`Parent tasks:\n ${taskWithChildren.map((currentTask) => currentTask.title)}\n`)

      // allAllTasks.forEach(task => {
      //   if (task.status == 0) {
      //     // if (!(isValid(task.parentId))) {
      //       console.log(`${task.status} -- ${task.title} -- ${task.id} -- ${isAChild(task.parentId) ? 'is a parent' : 'is not a parent'}`);
      //       // console.log(task);
      //     // }
      //     if (isValid(task.childIds)) {
      //       task.childIds.forEach(child => {
      //         console.log(`\t ${child}`)
      //         let childrens = allAllTasks.filter((currentTask) => currentTask.id==child)
      //         console.log(`====children of ${child}========`)
      //         console.log(childrens)
      //       });
      //     }
      //   }
      // });
    }else {
      console.log("==== No allAllTasks")
    }

    // const projects = await tickSession.getProjects();
    // if (projects !== undefined && projects !== null) {
    //   console.log("==== projects")
    //   // console.log(projects.map((item) => item.name));
    //   console.log(`Got ${projects.length} projects.`)
    //   projects.forEach(async project => {
    //     console.log("Prj nm: ",project.name);
    //     const sections = await tickSession.getProjectSections(project.id);
    //     // console.log(`Project: ${project.name} -- ${sections}`);
    //     if (sections !== undefined && sections !== null && sections.length > 0) {
    //       sections.forEach(section => {
    //         console.log(project.name + '--' + section.name);
    //       })
    //     } else {
    //       console.log(project.name + '--' + 'no sections')
    //     }
    //   })

    //   // projects.forEach(project => {
    //   //   console.log(project.name);
    //   //   const sections = await tickSession.getProjectSections(project.id);
    //   //   if (sections !== undefined && sections !== null) {
    //   //     console.log(sections);
    //   //   });
    //   // }

    // } else {
    //   console.log("==== No projects")
    // }
  } catch (e: any) {
    console.log(e.message);
  }
  console.log("\n\nDone")
}

function isAChild(idToCheck: string) {
  console.log(`input: ${idToCheck}`);
  if (!isValid(idToCheck)) {
    console.log('is a child.')
    return false;
  } else {
    console.log("is not a child")
    return true
  }
}

function printTasks(allTheTasks: ITask[]) {
  console.log("=== Print Tasks ==");

  allTheTasks.forEach(task => {
    // if (!isAChild(task.parentId)) {
    //   console.log(task.title);
    // } else {
    if (donePrinted.indexOf(task.id) < 1) {
      printTaskAndChildren(task, 0);
    }
    // }
  });
}

function printTaskAndChildren(task: ITask, depth: number) {
  // console.log(`printTasks+ ${task.title}, ${depth}`)
  let childCount = 0;
  //There's probably a more js way of doing this
  let tabs: string = '';
  childCount = childCount + depth;
  for (let index = 0; index < childCount; index++) {
    tabs += '\t';
  }
  // console.log(`[${tabs}], ${tabs.length}, ${childCount}`);
  if (donePrinted.indexOf(task.id) < 1) {
    console.log(`${tabs}title: ${task.title} -- ${task.id} -- parent ${task.parentId} --- project: ${task.projectId}`)
    donePrinted.push(task.id);
  }
  if (isValid(task.childIds))
  {
    // console.log("-- has children")
    let newDepth = depth + 1;
    // console.log(`new depth: ${newDepth}`);
    task.childIds.forEach(currentChildId => {
      let childTask: ITask = allAllTasks.find(currentTask => currentTask.id == currentChildId);
      if (isValid(childTask)) {
        printTaskAndChildren(childTask, newDepth);
      } else {
        console.log(`found no child: for ${task.title}`)
      }


    });
    // printTaskAndChildren(---)

  }
}






testTick();




