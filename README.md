# IFC Viewer

### Description

IFC 파일을 웹 환경에서 시각화하고 관리할 수 있는 3D 뷰어 애플리케이션입니다. 


Open BIM App Templates인 https://github.com/thatOpen/engine_templates 를 기반으로 개발되었습니다.


> IFC(Industry Foundation Classes)
>
> 
> ISO 표준이자, openBIM 데이터 교환을 위한 글로벌 표준입니다.
> 건물의 3차원 형상 및 BIM 데이터에 내포된 속성 정보를 서로 다른 SW 사이에서 주고받을 수 있게 되어있습니다.



> BIM(Building Information Modeling)
>
> 
> 디지털 방식으로 건물의 하나 또는 그 이상의 정확한 가상 모델을 생성하는 기술입니다.
> 설계를 단계별로 지원하고 수동 프로세스보다 더욱 효과적인 분석 및 제어를 가능하게 합니다.

---
### Environment

- Server

  Nodejs v20.16.0

- Database

  SQLite v3.46.1


---
### Usage

- nodejs 및 vite 동시 실행

  npm run dev

- 코드 변경 시,
  
  npx tsc 명령어 실행

- 서버 네트워크 주소 변경 시,

  vite.config.ts 파일에서 server:proxy:"/api":target 주소 변경