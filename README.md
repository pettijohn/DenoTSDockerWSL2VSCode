
# Deno, TypeScript, Docker, WSL2, VSCode Debugging
Demonstration app of executing TypeScript in Deno from inside a Docker container running in WSL2 on Windows and attaching a VS Code debugger from the Windows host OS. Docker Desktop for Windows is explicitly *not* required due to its [licensing](https://www.docker.com/pricing/faq/). 

**Easy way:** install Deno on Windows directly.

**Hard way:** you're looking at it! But if you build upon this technique you can enforce that a whole team builds using the exact same toolchain with zero installation or per-engineer upkeep overhead. Just run the script, Docker resolves all the toolchaing dependencies, everything just works. 

## Prerequisites 
* WSL2 running on Windows 10+.
* Your flavor of Linux probably works; this is tested on [Ubuntu 20.04.3 LTS](https://www.microsoft.com/store/productId/9NBLGGH4MSV6)
* [Docker on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
* VS Code 
* [Deno VS Code Extension](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno)

## File by File

* `Dockerfile` - Holds all compiler toolchain dependencies in a Docker image. Built on `denoland/deno` and exposes the debugging port `9229`. Every time we run a toolchain command, we ask Docker to do it via WSL2 and map `./` from the host Windows OS to `/code` in the container. We do not copy everything into the build context, rather, the containre operates on our live filesystem. By tagging this image as `deno` the commands feel relatively natural (e.g. `docker run deno bundle <foo>`). 
* `main.ts` - entrypoint to the application, make it do whatever you need.
* `.vscode\tasks.json` - Two critical tasks, one that runs `docker build` and one that calls `deno bundle`. ¡BUT! ¡IMPORTANT! These tasks run `wsl.exe` as the shell executable and pass in the docker command through `command`. Even more obtuse, the Bundle task calls `wsl.exe` to call `docker` to call `deno bundle`. Sorry, it's convoluted, that's the nature of the beast. `deno bundle` compiles everything into a minimized, tree-shaken .js ES Module file that can be referenced in a browser. 
* `launch.json` - Runs deno in [debugger mode](https://deno.land/manual@v1.0.0/tools/debugger). Actually, it calls `wsl.exe` which calls `docker` to run `deno run --inspect-brk`. `--inspect` is unreliable, the code can complete execution before the debugger attaches, so we use `--inspect-brk`. This also sets `remoteRoot`, `localRoot`, and - very importantly - `sourceMapPathOverrides` to resolve your correct source code (within the Docker container, the compiler thinks your code is in `/code`, so sourcemaps won't find the file in `${workspaceFolder}`). 
* `index.html` - Loads the bundled ES Module and updates the contents of a `<div/>`. See it live here: «»
* `.gitattributes` - Enforces line endings to \n (except for .bat/.cmd files) since dealing with WSL/Windows at the same time can create inconsistencies. [Read more](https://docs.microsoft.com/en-us/windows/wsl/tutorials/wsl-git#git-line-endings)
* `/etc/wsl.conf` - Inside WSL2 guest OS, enable Docker to start automatically [Read more](https://docs.microsoft.com/en-us/windows/wsl/wsl-config#boot-settings):

```
[boot]
command="service docker start"
```

* `.dockerignore` - Ignore everything! We map `./` to `/code` inside the container so that our working directory can be modified live by the container. No need to send anything into the build context. 