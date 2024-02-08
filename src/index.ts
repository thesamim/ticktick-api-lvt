'use strict';

import ObjectID from 'bson-objectid';
import request from 'request';

import { IProjectGroup } from './types/ProjectGroup';
import { IProject } from './types/Project';
import { ISections } from './types/Project';
import { ITag } from './types/Tag';
import { ITask } from './types/Task';
import { IFilter } from './types/Filter';
import { IHabit } from './types/Habit';

import { API_ENDPOINTS } from './utils/get-api-endpoints';


const {
  ticktickServer,
  protocol,
  apiProtocol,
  apiVersion,
  TaskEndPoint,
  updateTaskEndPoint,
  allTagsEndPoint,
  generalDetailsEndPoint,
  allHabitsEndPoint,
  allProjectsEndPoint,
  allTasksEndPoint,
  signInEndPoint,
  userPreferencesEndPoint,
  getSections,
  getAllCompletedItems,
  exportData,
  projectMove,
  parentMove
} = API_ENDPOINTS;

interface IoptionsProps {
  token: string;
  username?: string;
  password?: string;
  baseUrl?: string;

}

interface IreqOptions {
  method: string,
  url: string,
  headers: {
    'Content-Type': 'application/json',
    Origin: string,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'X-Device': '{"platform":"web","os":"Windows 10","device":"Firefox 121.0","name":"","version":5050,"id":"65957b7390584350542c3c92","channel":"website","campaign":"","websocket":"123"}',
    'X-Requested-With': 'XMLHttpRequest',
    'Cookie': string
  }
}

export class Tick {
  private originUrl: string;
  get lastError(): any {
    return this._lastError;
  }
  get inboxId(): string {
    return this.inboxProperties.id
  }
  request: any;
  username: string|undefined;
  password: string|undefined;
  inboxProperties: {
    id: string;
    sortOrder: number;
  };
  token: string;
  apiUrl: string;
  loginUrl: string;
  private _lastError: any;

  constructor({ username, password, baseUrl, token }: IoptionsProps) {
    this.request = request.defaults({ jar: true });
    this.username = username;
    this.password = password;
    this.token = token;
    this.inboxProperties = {
      id: '',
      sortOrder: 0
    };
    if (baseUrl) {
      this.apiUrl = `${apiProtocol}${baseUrl}${apiVersion}`;
      this.loginUrl = `${protocol}${baseUrl}${apiVersion}`;
      this.originUrl = `${protocol}${baseUrl}`
    } else {
      this.apiUrl = `${apiProtocol}${ticktickServer}${apiVersion}`;
      this.loginUrl = `${protocol}${ticktickServer}${apiVersion}`;
      this.originUrl = `${protocol}${ticktickServer}`
    }


  }

  // USER ======================================================================

  async login(): Promise<boolean> {
    try {
      const url = `${this.loginUrl}/${signInEndPoint}`;

      const baseOptions = this.createIreqOptions("POST", url);
      const options = { method: baseOptions.method, url: baseOptions.url, headers:baseOptions.headers,
        json: {
          username: this.username,
          password: this.password
        }
      };
      const reqObj = this.request;
      reqObj.body = JSON.stringify({
        username: this.username,
        password: this.password
      });
      console.log("this object", url)
      return new Promise((resolve) => {
        reqObj(options, async (error: any, response: any, request: any, body: any) => {
          if ((!response) || (response.statusCode != 200)) {
            this.setError("login Error", response, error)
            resolve(false);
          } else {
            this.token = response.body.token;

            await this.getInboxProperties()
              .then(() => {
                resolve(true);
              })
              .catch(() => {
                resolve(false);
              });
          }
        });
      });
    } catch (e: any) {
      return false;
    }
  }

  async getUserSettings(): Promise<any[]|null> {

    const url = `${this.apiUrl}/${userPreferencesEndPoint}`;

    const options = this.createIreqOptions('GET', url)
    const reqObj = this.request;

    return new Promise((resolve) => {
      reqObj(options, async (error: any, response: any, body: any) => {
        if (error || (response.statusCode != 200))
        {
          this.setError("Get User Settings", response, error);
          resolve(null)
        } else if (response.body) {
          this.setError("Get User Settings", response, error);
          resolve(body);
        } else {
          //assuming we fail only if token expired.
          this.setError("Get User Settings", response, error);
          throw new Error("Call Failed. Token Expired. Probably.")
        }
      });
    });
  }



  async getInboxProperties(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        let url;
        //Dida does not return inbox in the general details. It does in the all task.
        if (this.originUrl.includes("ticktick")) {
          url = `${this.apiUrl}/${generalDetailsEndPoint}`;
        } else {
          url = `${this.apiUrl}/${allTasksEndPoint}`;
        }
        const options = this.createIreqOptions('GET', url)

        this.request(options, (error: any, response: any, body: any) => {

          if (error) {
            this.setError("Get Inbox Properties", response, error)
            resolve(false);
          }
          if (body) {
            body = JSON.parse(body);
            this.inboxProperties.id = body.inboxId;
            body.syncTaskBean.update.forEach((task: any) => {
              if (task.projectId == this.inboxProperties.id && task.sortOrder < this.inboxProperties.sortOrder) {
                this.inboxProperties.sortOrder = task.sortOrder;
              }
            });
            this.inboxProperties.sortOrder--;
          }
          resolve(true);
        });
      } catch (e) {
        this.setError("Get Inbox Properties", null, e)
        console.error('Get Inbox Properties failed: ', e);
        resolve(false);
      }
    });
  }

  // FILTERS ===================================================================

  async getFilters(): Promise<IFilter[]> {
    return new Promise((resolve) => {
      const url = `${this.apiUrl}/${generalDetailsEndPoint}`;
      const options = this.createIreqOptions('GET', url)
      this.request(options, (error: any, response: any, body: any) => {
        body = JSON.parse(body);
        resolve(body.filters);
      });
    });
  }

  // TAGS ======================================================================

  async getTags(): Promise<ITag[]> {
    return new Promise((resolve) => {
      const url = `${this.apiUrl}/${allTagsEndPoint}`;
      const options = this.createIreqOptions('GET', url)
      this.request(options, (error: any, response: any, body: any) => {
        body = JSON.parse(body);
        resolve(body);
      });
    });
  }

  // HABITS ====================================================================

  async getHabits(): Promise<IHabit[]> {
    return new Promise((resolve) => {
      try {
        const url = `${this.apiUrl}/${allHabitsEndPoint}`;
        const options = this.createIreqOptions('GET', url)
        this.request(options, (error: any, response: any, body: any) => {
          const parsedBody = JSON.parse(body);
          resolve(parsedBody);
        });
      } catch (e) {
        resolve([]);
      }
    });
  }

  // PROJECTS ==================================================================

  async getProjectGroups(): Promise<IProjectGroup[]> {
    return new Promise((resolve) => {
      const url = `${this.apiUrl}/${generalDetailsEndPoint}`;
      const options = this.createIreqOptions('GET', url)
      this.request(options, (error: any, response: any, body: any) => {
        if (response.statusCode != 200) {
          this.setError("Get Project Groups", response, error)
          resolve([]);
          return
        }
        if (error) {
          this.setError("Get Project Groups", response, error)
          resolve([]);
        } else {
          body = JSON.parse(body);
          resolve(body.projectGroups);
        }
      });
    });
  }

  async getProjects(): Promise<IProject[]> {
    return new Promise((resolve) => {
      try {
        const url = `${this.apiUrl}/${allProjectsEndPoint}`;
        const options = this.createIreqOptions('GET', url)
        this.request(options, (error: any, response: any, body: any) => {
          if (error) {
            console.error('Error on getProjects', error);
            resolve([]);
          } else {
            const parsedBody = JSON.parse(body);
            resolve(parsedBody);
          }
        });
      } catch (e) {
        console.error('Error getting Projects: ', e);
        resolve([]);
      }
    });
  }

  //This may have worked at some point, but it doesn't any more.
  // async getProject(projectId: string) : Promise<ISections[]> {
  //   return new Promise((resolve) => {
  //     try {
  //       const url = `${this.apiUrl}/${getProject}/${projectId}`;
  //       this.request(url, (error: any, response: any, body: any) => {
  //         if (body !== undefined && body!== null && body.length > 0)
  //         {
  //           const parsedBody = JSON.parse(body);
  //           resolve(parsedBody);
  //         }
  //       });
  //     } catch (e) {
  //       console.error(e)
  //       resolve([]);
  //     }
  //   });
  // }
  async getProjectSections(projectId: string): Promise<ISections[]> {
    return new Promise((resolve) => {
      try {
        const url = `${this.apiUrl}/${getSections}/${projectId}`;
        const options = this.createIreqOptions('GET', url)
        this.request(options, (error: any, response: any, body: any) => {
          if (error) {
            console.error('Error on getProjectSections', error);
            resolve([]);
          } else {
            const parsedBody = JSON.parse(body);
            resolve(parsedBody);
          }
        });
      } catch (e) {
        console.error("Error on getting Sections", e);
        resolve([]);
      }
    });
  }

  // RESOURCES =================================================================
  async getAllResources(): Promise<ITask[]> {
    const url = `${this.apiUrl}/${allTasksEndPoint}`;
    const options = this.createIreqOptions('GET', url)
    return new Promise((resolve) => {
      this.request(options, (error: any, response: any, body: any) => {
        if (error) {
          this.setError("Get All Resources", response, error)
          console.error('Error getting resources: ', error);
          resolve([]);
        } else {
          if (body) {
            body = JSON.parse(body);
          } else {
            console.error('Did not get a response getting resources.');
            resolve([]);
          }
        }
        //TODO: Do we have to have a finer grained definition, or trust the client?
        resolve(body);
      });
    });
  }

  // TASKS =====================================================================

  async getTasksStatus(): Promise<ITask[]> {
    const url = `${this.apiUrl}/${allTasksEndPoint}`;
    const options = this.createIreqOptions('GET', url)
    return new Promise((resolve) => {
      this.request(options, (error: any, response: any, body: any) => {
        if (body) {
          body = JSON.parse(body);
          const tasks: ITask[] = body['syncTaskBean'];
          resolve(tasks);
        } else {
          this.setError("Get TaskStatus", response, error)
          console.error('Get Task Status: No body received in response.');
        }
      });
    });
  }

  async getAllTasks(): Promise<ITask[]> {
    const url = `${this.apiUrl}/${allTasksEndPoint}`;
    const options = this.createIreqOptions('GET', url)
    return new Promise((resolve) => {
      this.request(options, (error: any, response: any, body: any) => {
        body = JSON.parse(body);
        const tasks: ITask[] = body['syncTaskBean']['update'];
        resolve(tasks);
      });
    });
  }

  async getTasks(): Promise<ITask[]> {
    return new Promise((resolve) => {
      const url = `${this.apiUrl}/${generalDetailsEndPoint}`;
      const options = this.createIreqOptions('GET', url)

      this.request(options, (error: any, response: any, body: any) => {
        body = JSON.parse(body);
        resolve(body.syncTaskBean.update);
      });
    });
  }

  async getTask(taskID: string, projectID: string|undefined|null): Promise<ITask[]> {
    return new Promise((resolve) => {
      let url = `${this.apiUrl}/${TaskEndPoint}/${taskID}`//

      const projectParam = `?projectID=${projectID}`;
      if (projectID) {
        url = url + projectParam;
      }
      const options = this.createIreqOptions('GET', url)
      this.request(options, (error: any, response: any, body: any) => {
        try {
          body = JSON.parse(body);
          resolve(body);
        } catch (error) {
          let msg = "Unexpected response: " + error + "\n" + body
          throw new Error(msg);
        }
      });
    });
  }

  async getAllCompletedItems(): Promise<ITask[]> {
    return new Promise((resolve) => {
      const url = `${this.apiUrl}/${getAllCompletedItems}`;
      const options = this.createIreqOptions('GET', url)
      this.request(options, (error: any, response: any, body: any) => {
        body = JSON.parse(body);
        resolve(body);
      });
    });
  }

  addTask(jsonOptions: any): Promise<any> {
    const thisTask: ITask = {
      id: jsonOptions.id ? jsonOptions.id : ObjectID(),
      projectId: jsonOptions.projectId ? jsonOptions.projectId : this.inboxProperties.id,
      sortOrder: jsonOptions.sortOrder ? jsonOptions.sortOrder : this.inboxProperties.sortOrder,
      title: jsonOptions.title,
      content: jsonOptions.content ? jsonOptions.content : '',
      startDate: jsonOptions.startDate ? jsonOptions.startDate : null,
      dueDate: jsonOptions.dueDate ? jsonOptions.dueDate : null,
      timeZone: jsonOptions.timeZone ? jsonOptions.timeZone : 'America/New_York', // This needs to be updated to grab dynamically
      isAllDay: jsonOptions.isAllDay ? jsonOptions.isAllDay : null,
      reminder: jsonOptions.reminder ? jsonOptions.reminder : null,
      reminders: jsonOptions.reminders ? jsonOptions.reminders : [{ id: ObjectID(), trigger: 'TRIGGER:PT0S' }],
      repeatFlag: jsonOptions.repeatFlag ? jsonOptions.repeatFlag : null,
      priority: jsonOptions.priority ? jsonOptions.priority : 0,
      status: jsonOptions.status ? jsonOptions.status : 0,
      items: jsonOptions.items ? jsonOptions.items : [],
      progress: jsonOptions.progress ? jsonOptions.progress : 0,
      modifiedTime: jsonOptions.modifiedTime ? jsonOptions.modifiedTime : new Date().toISOString().replace('Z', '+0000'), //"2017-08-12T17:04:51.982+0000",
      deleted: jsonOptions.deleted ? jsonOptions.deleted : 0,
      assignee: jsonOptions.assignee ? jsonOptions.assignee : null,
      isDirty: jsonOptions.isDirty ? jsonOptions.isDirty : true,
      local: jsonOptions.local ? jsonOptions.local : true,
      remindTime: jsonOptions.remindTime ? jsonOptions.remindTime : null,
      tags: jsonOptions.tags ? jsonOptions.tags : [],
      childIds: jsonOptions.childIds ? jsonOptions.childIds : [],
      parentId: jsonOptions.parentId ? jsonOptions.parentId : null
    };

    let taskBody: any;
    taskBody = thisTask;

    const url = `${this.apiUrl}/${TaskEndPoint}`;
    const baseOptions= this.createIreqOptions('POST', url)
    const options = { method: baseOptions.method, url: baseOptions.url, headers:baseOptions.headers,
      json: taskBody
    };

    return new Promise((resolve) => {
      this.request(options, (error: any, response: any, body: any) => {
        if (error) {
          console.error('Error on addTask', error);
          resolve([]);
        } else {
          let bodySortOrder;
          bodySortOrder = body.sortOrder;
          this.inboxProperties.sortOrder = bodySortOrder - 1;
          resolve(body);
        }
      });
    });
  }

  updateTask(jsonOptions: any): Promise<any> {
    const thisTask: ITask = {
      id: jsonOptions.id ? jsonOptions.id : ObjectID(),
      projectId: jsonOptions.projectId ? jsonOptions.projectId : this.inboxProperties.id,
      sortOrder: jsonOptions.sortOrder ? jsonOptions.sortOrder : this.inboxProperties.sortOrder,
      title: jsonOptions.title,
      content: jsonOptions.content ? jsonOptions.content : '',
      startDate: jsonOptions.startDate ? jsonOptions.startDate : null,
      dueDate: jsonOptions.dueDate ? jsonOptions.dueDate : null,
      timeZone: jsonOptions.timeZone ? jsonOptions.timeZone : 'America/New_York', // This needs to be updated to grab dynamically
      isAllDay: jsonOptions.isAllDay ? jsonOptions.isAllDay : null,
      reminder: jsonOptions.reminder ? jsonOptions.reminder : null,
      reminders: jsonOptions.reminders ? jsonOptions.reminders : [{ id: ObjectID(), trigger: 'TRIGGER:PT0S' }],
      repeatFlag: jsonOptions.repeatFlag ? jsonOptions.repeatFlag : null,
      priority: jsonOptions.priority ? jsonOptions.priority : 0,
      status: jsonOptions.status ? jsonOptions.status : 0,
      items: jsonOptions.items ? jsonOptions.items : [],
      progress: jsonOptions.progress ? jsonOptions.progress : 0,
      modifiedTime: jsonOptions.modifiedTime ? jsonOptions.modifiedTime : new Date().toISOString().replace('Z', '+0000'), //"2017-08-12T17:04:51.982+0000",
      deleted: jsonOptions.deleted ? jsonOptions.deleted : 0,
      assignee: jsonOptions.assignee ? jsonOptions.assignee : null,
      isDirty: jsonOptions.isDirty ? jsonOptions.isDirty : true,
      local: jsonOptions.local ? jsonOptions.local : true,
      remindTime: jsonOptions.remindTime ? jsonOptions.remindTime : null,
      tags: jsonOptions.tags ? jsonOptions.tags : [],
      childIds: jsonOptions.childIds ? jsonOptions.childIds : [],
      parentId: jsonOptions.parentId ? jsonOptions.parentId : null
    };

    let taskBody: any;
    taskBody = {
      add: [],
      addAttachments: [],
      delete: [],
      deleteAttachments: [],
      updateAttachments: [],
      update: [thisTask]
    };
    const url = `${this.apiUrl}/${updateTaskEndPoint}`;
    const baseOptions= this.createIreqOptions('POST', url)
    const options = { method: baseOptions.method, url: baseOptions.url, headers:baseOptions.headers,
      json: taskBody
    };
    return new Promise((resolve) => {
      this.request(options, (error: any, response: any, body: any) => {
        if (error) {
          console.error('Error on updateTask', error);
          resolve([]);
        } else {
          this.inboxProperties.sortOrder = body.sortOrder - 1;
          resolve(body);
        }
      });
    });
  }
  deleteTask(deleteTaskId: string, deletedTaskprojectId: string): Promise<any> {
    if (!deleteTaskId || !deletedTaskprojectId) {
      throw new Error('Both Task Id and Project ID are required for a delete, otherwise TickTick will fail silently.');
    }

    const taskToDelete = { taskId: deleteTaskId, projectId: deletedTaskprojectId };

    let taskBody: any;
    taskBody = {
      add: [],
      addAttachments: [],
      delete: [taskToDelete],
      deleteAttachments: [],
      updateAttachments: [],
      update: []
    };

    const url = `${this.apiUrl}/${updateTaskEndPoint}`;
    const baseOptions= this.createIreqOptions('POST', url)
    const options = { method: baseOptions.method, url: baseOptions.url, headers:baseOptions.headers,
      json: taskBody
    };


    return new Promise((resolve) => {
      this.request(options, (error: any, response: any, body: any) => {
        this.inboxProperties.sortOrder = body.sortOrder - 1;
        resolve(body);
      });
    });
  }


  async exportData(): Promise<string|null> {

    const url = `${this.apiUrl}/${exportData}`;

    const options = this.createIreqOptions('GET', url)
    const reqObj = this.request;

    return new Promise((resolve) => {
      reqObj(options, async (error: any, response: any, body: any) => {
        if (error || (response.statusCode != 200))
        {
          this.setError("Export Data", response, error);
          resolve(null)
        } else if (response.body) {
          //What we get back is a string, with escaped characters.

          //get rid of first and last quote.
          body = body.substring(1);
          body = body.substring(0, body.length - 1)

          //get rid of escaped quotes, and escaped line returns
          body = body.replace(/\\\"/g, '"')
          body = body.replace(/\\n/g, '\n')

          resolve(body);
        } else {
          //assuming we fail only if token expired.
          this.setError("Export Data", response, error);
          throw new Error("Export Data Failed..")
        }
      });
    });
  }


  projectMove(taskId: string, fromProjectId: string, toProjectId: string): Promise<string|null> {
    const url = `${this.apiUrl}/${projectMove}`;
    const baseOptions= this.createIreqOptions('POST', url)
      const parms = [{
        fromProjectId: fromProjectId,
        toProjectId: toProjectId,
        taskId: taskId,
        sortOrder: -1924145348608
      }];


    const options = { method: baseOptions.method, url: baseOptions.url, headers:baseOptions.headers,
      json: parms
    };
    return new Promise((resolve) => {
      this.request(options, (error: any, response: any, body: any) => {
        if (error) {
          console.error('Error on Project Move', error);
          resolve(null);
        } else {
          this.inboxProperties.sortOrder = body.sortOrder - 1;
          resolve(body);
        }
      });
    });
  }

parentMove(taskId: string, newParentId: string, projectId: string): Promise<string|null> {
  const url = `${this.apiUrl}/${parentMove}`;
  const baseOptions = this.createIreqOptions('POST', url)
  const parms = [{
    parentId: newParentId,
    projectId: projectId,
    taskId: taskId,
  }];


  const options = {
    method: baseOptions.method, url: baseOptions.url, headers: baseOptions.headers,
    json: parms
  };
  return new Promise((resolve) => {
    this.request(options, (error: any, response: any, body: any) => {
      if (error) {
        console.error('Error on Parent Move', error);
        resolve(null);
      } else {
        this.inboxProperties.sortOrder = body.sortOrder - 1;
        resolve(body);
      }
    });
  });
}
  private createIreqOptions(method:string, url:string) {
    const options: IreqOptions = {
      method: method,
      url: url,
      headers: {
        'Content-Type': 'application/json',
        Origin : this.originUrl,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'X-Device': '{"platform":"web","os":"Windows 10","device":"Firefox 121.0","name":"","version":5050,"id":"65957b7390584350542c3c92","channel":"website","campaign":"","websocket":"123"}',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': "t=" + this.token
      }
    };
    return options;
  }

  private setError(operation: string, response: any, error: any) {
    const statusCode = response.statusCode
    const body = response.body;
    this._lastError = {statusCode, operation, error, body }
  }
}
