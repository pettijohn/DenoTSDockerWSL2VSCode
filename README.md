
# Deno running TypeScript through Docker on WSL2 with VSCode Debugging
Demonstration app of executing TypeScript in Deno from inside a Docker container running on WSL2 on Windows and attaching a VS Code debugger from the Windows host OS. Docker Desktop for Windows is explicitly *not* required due to its [licensing](https://www.docker.com/pricing/faq/). 

**Easy way:** install Deno on Windows directly.

**Hard way:** you're looking at it! But if you build upon this technique you can enforce that a whole team builds using the exact same toolchain with zero installation or per-engineer upkeep overhead. You could also run the same Docker-hosted toolchain on Mac, Windows, and Linux (with tweaks to `.vscode/*`). Just run the script, Docker resolves all the toolchain dependencies, everything just works. 

## Prerequisites 
* WSL2 running on Windows 10+.
* Your flavor of Linux probably works; this is tested on [Ubuntu 20.04.3 LTS](https://www.microsoft.com/store/productId/9NBLGGH4MSV6)
* [Docker on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
* VS Code 
* [Deno VS Code Extension](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno)

## To Use

* Clone the repository, open the folder in VS Code, attach a breakpoint in `main.ts`, hit F5. The Docker image will build and then the code will execute in Deno, hitting your breakpoint.
* CTRL+P, type `task bundle` to run the bundle task, see the result in `out/main.bundle.js`.

## File by File

* `Dockerfile` - Holds all compiler toolchain dependencies in a Docker image. Built on `denoland/deno` and exposes the debugging port `9229`. Every time we run a toolchain command, we ask Docker to do it via WSL2 and map `./` from the host Windows OS to `/code` in the container. We do not copy everything into the build context, rather, the container operates on our live filesystem (we're trying to emulate having `deno` installed locally but with the beauty of all dependencies in a container). By tagging this image as `deno` the commands feel relatively natural (e.g. `docker run deno bundle <foo>`). 
* `main.ts` - entrypoint to the application, this is where your application lives, what you want to execut when you run `deno run main.ts`.
* `.vscode\tasks.json` - Two critical tasks, one that runs `docker build` and one that calls `deno bundle`. ¡IMPORTANT! These tasks run `wsl.exe` as the shell executable and pass in the docker command through `command`. Even more obtuse, the Bundle task calls `wsl.exe` to call `docker` to call `deno bundle`. Sorry, it's convoluted, that's the nature of the beast. `deno bundle` [bundles](https://deno.land/manual/tools/bundler.md) everything into a minimized, tree-shaken ES Module file that can be referenced in a browser. 
* `launch.json` - Runs deno in [debugger mode](https://deno.land/manual@v1.0.0/tools/debugger). Actually, it calls `wsl.exe` which calls `docker` to run `deno run --inspect-brk`. You must not use `--inspect` since it is unreliable; the code can complete execution before the debugger attaches. `--inspect-brk` pauses execution after start until the debugger attaches. It instructs Deno to bind the debugger to 0.0.0.0 (all interfaces); by default it only binds to 127.0.0.1, the loopback adapter *inside* the container. We are attaching from the host OS outside of the container. This also sets `remoteRoot`, `localRoot`, and - very importantly - `sourceMapPathOverrides` to resolve your correct source code (within the Docker container, the compiler thinks your code is in `/code`, so sourcemaps won't find the file in `${workspaceFolder}`). 
* `index.html` - Loads the bundled ES Module from `./out/main.bundle.js` and updates the contents of a `<div/>`. See it live here: https://pettijohn.github.io/DenoTSDockerWSL2VSCode/ 
* `.gitattributes` - Enforces line endings to \n (except for .bat/.cmd files) since dealing with WSL/Windows at the same time can create inconsistencies. [Read more](https://docs.microsoft.com/en-us/windows/wsl/tutorials/wsl-git#git-line-endings).
* `.dockerignore` - Ignore everything! We map `./` to `/code` inside the container so that our working directory can be modified live by the container. No need to send anything into the build context. 
* `/etc/wsl.conf` - Inside WSL2 guest OS, enable Docker to start automatically [Read more](https://docs.microsoft.com/en-us/windows/wsl/wsl-config#boot-settings):

```
[boot]
command="service docker start"
```
