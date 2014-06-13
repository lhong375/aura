This is my branch of Aura
and this is just for the aura brownbag, for now

## Build

mvn clean install

above command will create jars into your default maven repository :  ~/.m2/repository/org/auraframework/

## Run

mvn jetty:start

## Play 

well, the server is up on your localhost:8080 by default

================================= below are copy from original Aura repository on Git ====================================
from 
https://github.com/forcedotcom/aura

## What is Aura?

Aura is a UI framework for developing dynamic web apps for mobile and desktop 
devices, while providing a scalable long-lived lifecycle to support building apps
engineered for growth. It supports partitioned multi-tier component development 
that bridges the client and server.
 
To find out more about Aura, see the [Aura Documentation](http://documentation.auraframework.org/auradocs) site.

## How Do I Develop with Aura?

You can build your user interface at a granular level and easily integrate with
popular toolkits and libraries, such as jQuery. Aura's lightweight and scalable 
architecture uses two key building blocks: components and events.
 
Components use markup that looks similar to HTML. You can also use HTML or any other code that can
execute within an HTML page. Components are encapsulated and their internals stay 
private. You can extend existing components to customize their behavior. 
   
The robust event model enables you to develop loosely coupled components. Once 
you define the events that interact with your components, your team can work on 
the components in parallel to quickly build a powerful app.

Aura also supports a powerful expression language, embedded testing, performance, and security features.

## How Do I Start?

The easiest way to get up and running is from the command line, but you can easily use Aura
with your favorite IDE too.

### Prerequisites

You need:

* JDK 1.7
* Apache Maven 3 or later
