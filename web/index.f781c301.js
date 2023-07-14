let e=(()=>{let e=localStorage.getItem("bl-theme");if(e)return e;let t=window.matchMedia?.("(prefers-color-scheme: dark)");return t.matches?"dark":"light"})();const t=new Map;window.addEventListener("DOMContentLoaded",()=>{"dark"===e?(document.querySelector(".t-light")?.classList.remove("hidden"),document.documentElement.classList.add("dark")):document.querySelector(".t-dark")?.classList.remove("hidden"),document.querySelector("#theme")?.addEventListener("click",()=>{"dark"===e?(document.querySelector(".t-dark")?.classList.remove("hidden"),document.querySelector(".t-light")?.classList.add("hidden"),document.documentElement.classList.remove("dark"),localStorage.setItem("bl-theme","light"),e="light"):(document.querySelector(".t-dark")?.classList.add("hidden"),document.querySelector(".t-light")?.classList.remove("hidden"),document.documentElement.classList.add("dark"),localStorage.setItem("bl-theme","dark"),e="dark")});let c=[];if(window.map){let e=!1,l=()=>{e=!1,document.querySelector(".director").classList.remove("open"),document.querySelector("#search").classList.remove("open"),document.querySelector("#theme").classList.remove("flex"),document.querySelector("#theme").classList.add("hidden")};document.querySelector("#menu").addEventListener("click",t=>{e?l():(e=!0,document.querySelector(".director").classList.add("open"),document.querySelector("#search").classList.add("open"),document.querySelector("#theme").classList.add("flex"),document.querySelector("#theme").classList.remove("hidden"))});let s=[],n=window.map.data.slice();for(;n.length;){let e=n.shift();e.folder?n.unshift(...e.children||[]):s.push(e)}let o=(e,r)=>{for(let a of e)a.folder?o(a.children,a.id):r&&t.set(a.id,r)};o(window.map.data);let i=(e,t=1)=>e.map(e=>`<div class="d-item">
           ${e.folder?`
            <div data-id="${e.id}" class="select-none d-title dir" style="padding-left: ${(t-1)*16+6}px;">${e.name}</div><div class="d-sub">${i(e.children,t+1)}</div>
           `:`
              <a data-id="${e.id}" class="select-none d-title doc" style="padding-left: ${16*t+6}px;">${e.name}</a>
           `}
        </div>`).join("");document.querySelector(".director").innerHTML=i(window.map.data),document.querySelectorAll(".dir").forEach(e=>{e.addEventListener("click",()=>{e.classList.contains("open")?e.classList.remove("open"):e.classList.add("open")})});let u=(r,a)=>{let n=s.findIndex(e=>e.id===r);if(-1===n)return;e&&l(),a||window.scroll({top:0});let o=s[n];a&&setTimeout(()=>{document.querySelector("#"+decodeURI(a))?.scrollIntoView()},60),document.querySelector(".real-content").innerHTML=o.content,document.querySelector(".leading-list").innerHTML=o.outline,document.querySelectorAll(".d-title.active").forEach(e=>{e.classList.remove("active")}),document.querySelector(`[data-id="${r}"]`).classList.add("active");let i=t.get(r);for(;i;)document.querySelector(`[data-id="${i}"]`)?.classList.add("open"),i=t.get(i);let u=s[n+1],m=s[n-1];u||m?document.querySelector(".page-container").innerHTML=`
<div class="h-[1px] w-full dark:bg-gray-600/50 bg-gray-300"></div>
<div class="flex justify-between mt-4 md:space-x-10 flex-col md:flex-row">
  ${m?`
     <a class="flex-1 md:mb-0 mb-3 doc" data-id="${m.id}">
       <div class="paging group">
         <span class="text-xs dark:text-zinc-400 text-zinc-600">Previous page</span>
         <span class="paging-name truncate w-full">${m.name}</span>
       </div>
     </a>
  `:'<div class="flex-1"></div>'}
  ${u?`
    <a class="flex-1 md:mb-0 mb-3 doc" data-id="${u.id}">
     <div class="paging group">
       <span class="text-xs dark:text-zinc-400 text-zinc-600">Next page</span>
       <span class="paging-name truncate w-full">${u.name}</span>
     </div>
   </a>
  `:'<div class="flex-1"></div>'}
</div>
`:document.querySelector(".page-container").remove(),setTimeout(()=>{c=Array.from(document.querySelectorAll(".heading")).reverse(),d()})};(function(e){let t=0,d="",c=document.querySelector("#input");c.addEventListener("input",e=>{let c=e.target;d=c.value,clearTimeout(t),t=window.setTimeout(()=>{let e=[];if(d)for(let t of window.map.sections){let r=t.section.filter(e=>e.title?.includes(d)||e.text?.includes(d)).map(e=>({...e,text:e.text?.includes(d)?e.text:void 0}));r.length&&e.push({...t,section:r})}else{document.querySelector("#search-result").classList.add("hidden");return}e.length?document.querySelector("#search-empty").classList.add("hidden"):(document.querySelector("#search-empty").classList.remove("hidden"),document.querySelector("#search-empty span").innerHTML=`未搜索到关于 "${d}"的内容，<br/>换个关键词试试？`);let t=e.map(e=>` 
      <div>
        <div
          class="flex items-center text-xs leading-6 dark:text-gray-300 text-gray-700 border-b border-gray-400/30 px-2 mb-1 group">
          <span class="mt-[1px] dark:fill-gray-300 fill-zinc-700">
            <svg aria-hidden="true" class="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium MuiSvgIcon-root MuiSvgIcon-fontSizeLarge css-zjt8k" data-testid="ArticleIcon" tabindex="-1" viewBox="0 0 24 24" width="14" height="14"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"></path></svg>
          </span>
          <span class="ml-1 flex-1 truncate">${e.name}</span>
        </div>
      <div class="text-[14px] leading-6 space-y-1">
        ${e.section.map(t=>`
          <div
            data-id="${e.path}"
            data-hash="${t.tag?t.title:""}"
            class="cursor-pointer duration-200 hover:bg-blue-400/20 rounded px-2 py-1 doc"
          >
                ${"all"===t.tag&&t.text?`
                  <div class="mt-2 text-gary-600 dark:text-gray-400 text-gray-600 text-[13px] whitespace-pre-line">${r(t.text,d).replace(/\n+/g,"\n")}</div>
                  `:""}
                ${"all"!==t.tag?`
                  <div class="mb-0.5 flex items-center">
                    <span
                      class="mr-1 dark:text-amber-400 text-amber-500 font-bold text-xs"
                    >
                      ${t.tag}
                    </span>
                    <span
                      class="dark:text-gray-200 text-gray-800 whitespace-pre-line"
                    >${r(t.title||"",d).replace(/\n+/g,"")}</span>
                  </div>
                  ${t.text?`
                    <div class="text-[13px] leading-5 dark:text-gray-400 text-gray-600">${a(t.text,d).replace(/\n+/g,"\n")}</div>
                  `:""}
                `:""}
              </div>
            `).join("")}
          </div>
        </div>
      `).join("");document.querySelector("#search-result-list").innerHTML=t,document.querySelector("#search-result").classList.remove("hidden")},300)}),c.addEventListener("focus",e=>{d&&document.querySelector("#search-result").classList.remove("hidden")}),window.addEventListener("click",e=>{document.querySelector("#search").contains(e.target)||document.querySelector("#search-result").classList.add("hidden")})})(0),u(s[0].id),document.body.addEventListener("click",e=>{let t=e.target;for(;t;){if(t.classList.contains("doc")){document.querySelector(".doc.active")?.classList.remove("active"),t.classList.add("active"),u(t.dataset.id,t.dataset.hash);break}t=t.parentElement}})}else c=Array.from(document.querySelectorAll(".heading")).reverse(),d();window.addEventListener("scroll",e=>{if(!c.length)return;let t=document.body.scrollTop;for(let e of c){if(t>e.offsetTop-66){Array.from(document.querySelectorAll("[data-anchor]")).map(e=>e.classList.remove("active"));let t=document.querySelector(`[data-anchor="${e.querySelector(".anchor")?.id}"]`);t&&t.classList.add("active");return}document.querySelectorAll("[data-anchor]").forEach(e=>e.classList.remove("active"))}})});const r=(e,t)=>`${e.replaceAll(t,'<span class="font-semibold text-blue-500">$&</span>')}`,a=(e,t)=>r(e.split(/\n|\r\n/).find(e=>e.includes(t))||"",t);function d(){document.querySelectorAll(".code-block").forEach(e=>{let t=document.createElement("div");t.classList.add(..."absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 duration-200".split(" ")),t.innerHTML=`
            <div
              class="duration-200 hover:border-gray-200/50 border-gray-200/30 text-gray-400
              flex items-center justify-center w-7 h-7 border rounded cursor-pointer">
              <div class="duration-200 absolute -translate-x-full top-1/2 -translate-y-1/2 text-sm text-green-400 pointer-events-none opacity-0">Copied</div>
              <svg viewBox="64 64 896 896" focusable="false" data-icon="copy" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M832 64H296c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h496v688c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V96c0-17.7-14.3-32-32-32zM704 192H192c-17.7 0-32 14.3-32 32v530.7c0 8.5 3.4 16.6 9.4 22.6l173.3 173.3c2.2 2.2 4.7 4 7.4 5.5v1.9h4.2c3.5 1.3 7.2 2 11 2H704c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32zM350 856.2L263.9 770H350v86.2zM664 888H414V746c0-22.1-17.9-40-40-40H232V264h432v624z"></path></svg>
            </div>
          `,t.onclick=()=>{t.children[0].classList.add(..."border-green-400 text-green-400".split(" ")),t.children[0].classList.remove(..."hover:border-gray-200/50 border-gray-200/30 text-gray-400".split(" ")),t.children[0].children[0].classList.remove("opacity-0"),function(e){try{navigator.clipboard.writeText(e)}catch{let t=document.createElement("textarea"),r=document.activeElement;t.value=e,t.setAttribute("readonly",""),t.style.contain="strict",t.style.position="absolute",t.style.left="-9999px",t.style.fontSize="12pt";let a=document.getSelection(),d=a?a.rangeCount>0&&a.getRangeAt(0):null;document.body.appendChild(t),t.select(),t.selectionStart=0,t.selectionEnd=e.length,document.execCommand("copy"),document.body.removeChild(t),d&&(a.removeAllRanges(),a.addRange(d)),r&&r.focus()}}(e.querySelector("code").innerText),setTimeout(()=>{t.children[0].classList.remove(..."border-green-400 text-green-400".split(" ")),t.children[0].classList.add(..."hover:border-gray-200/50 border-gray-200/30 text-gray-400".split(" ")),t.children[0].children[0].classList.add("opacity-0")},2e3)},e.appendChild(t)})}