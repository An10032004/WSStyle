@echo off
set JAVA_TOOL_OPTIONS=-Xshare:off 
echo Starting backend with CDS disabled...
mvn spring-boot:run
