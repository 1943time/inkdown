# 分享

便捷的文档分享是青石重要目标之一，为习惯于本机读写，以markdown为文档形式的使用者提供一种编辑的网络浏览功能，使用者可自由选择自己的分享服务，目前提供了Linux服务器与阿里云oss存储方式。

分享时会自动转换引入的图片、本地连接，将相关文件同步至远程以便于远程查看，每次同步时会自动校验文件的`hash`值，已上传或没有更改的文件不会在重复上传。

> 在线文档已加入响应式适配，在分享后可发送给移动，pc，pad等设备，青石目前使用了客户端渲染，是因为无服务器运行环境，且生成静态html不利于网络缓存优化。

## 服务设置

在进行文档分享之前您需要先设定您的服务类型与参数

### 阿里云

> 阿里云oss需绑定自己的域名才可以直接打开html进行浏览，中国内地地区域名需要备案通过，也可以考虑中国香港地区。云存储优点是访问速度快，个人使用场景下价格非常便宜。

所需参数如下:

- `accessKeyId`
- `accessKeySecret`
- `region`
- `bucket`
- `domain` domain为您的访问域名

阿里云后台bucket设置步骤

1. 创建一个用于文档的bucket
2. 在 bucket配置 -> 域名管理 绑定已购买的域名
3. 在 数据管理 -> 静态页面 中设置默认首页为 `index.html` 默认404页面为`index.html` 错误文档响应码`200`
4. 将所需参数填入青石服务设置中

![qH52DzivcNXz8yY_eKec7](..%2F.images%2FqH52DzivcNXz8yY_eKec7.png)

点击保存会自动验证是否能够连接，链结后会上传依赖文件，可能会需要几十秒。保存成功后，选择任意markdown文档，点击当前文档即可立即同步分享。

### Linux服务器

> 有很多的云服务商支持ip访问服务器，如果您不想购买域名，或备案，可用ip来访问服务器，分享文档。青石使用了`ssh`上传所需的相关文件。

1. 在服务器上安装nginx代理服务，
2. 加入专为文档服务的配置文件 `doc.conf` 内容如下：

   ```nginx
   server {
     server_name 000.000.000.100; #// 你的域名或者 ip
     location / {
       root /opt/doc;  # 指定静态网站根目录
       index index.html;  # 指定默认访问的文件
       try_files $uri $uri/ /index.html;
       add_header 'Access-Control-Allow-Origin' '*';
       add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
     }
     listen 8080;  # 指定端口，nginx默认端口为80
   }
   ```

3. 在青石中配置服务相关参数，记住nginx的root目录，为配置中的存储目录示例如下：

   ![h63Evo-Y1NgjsT83RYHhE](..%2F.images%2Fh63Evo-Y1NgjsT83RYHhE.png)

4. 点击确定，会尝试上传初始化文件，成功后即可选择任意markdown文件进行分享