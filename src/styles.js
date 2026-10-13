export const CSS = `
:root{
  --green:#176b3a;
  --green2:#228b4c;
  --dark:#123524;
  --bg:#f4f7f5;
  --white:#ffffff;
  --text:#17231c;
  --muted:#6b7770;
  --border:#dce5df;
  --danger:#b42318;
  --warning:#b76e00;
  --shadow:0 8px 25px rgba(0,0,0,.07);
}

*{
  box-sizing:border-box;
}

html,body{
  margin:0;
  padding:0;
  font-family:Arial,Helvetica,sans-serif;
  background:var(--bg);
  color:var(--text);
}

body{
  min-height:100vh;
}

a{
  color:inherit;
  text-decoration:none;
}

button,
input,
select,
textarea{
  font:inherit;
}

.topbar{
  height:64px;
  background:var(--dark);
  color:white;
  display:flex;
  align-items:center;
  padding:0 18px;
  position:fixed;
  top:0;
  left:0;
  right:0;
  z-index:1000;
}

.brand{
  font-size:18px;
  font-weight:700;
  margin-left:12px;
}

.menu-btn{
  width:42px;
  height:42px;
  border:0;
  border-radius:10px;
  background:rgba(255,255,255,.1);
  color:white;
  font-size:23px;
  cursor:pointer;
}

.top-right{
  margin-left:auto;
  display:flex;
  align-items:center;
  gap:12px;
}

.admin-label{
  font-size:13px;
  opacity:.8;
}

.sidebar{
  position:fixed;
  top:64px;
  left:0;
  bottom:0;
  width:245px;
  background:#fff;
  border-right:1px solid var(--border);
  overflow-y:auto;
  z-index:900;
  transition:.25s;
}

.sidebar-inner{
  padding:15px 12px 30px;
}

.nav-section{
  font-size:11px;
  font-weight:700;
  color:#89938d;
  text-transform:uppercase;
  padding:14px 10px 7px;
  letter-spacing:.5px;
}

.nav-link{
  display:flex;
  align-items:center;
  gap:10px;
  padding:11px 12px;
  border-radius:99px;
  font-size:14px;
  color:#34423a;
}

.nav-link:hover{
  background:#edf6f0;
  color:var(--green);
}

.nav-link.active{
  background:#e3f3e9;
  color:var(--green);
  font-weight:700;
}

.nav-icon{
  width:24px;
  text-align:center;
}

.main{
  margin-left:245px;
  padding:90px 25px 40px;
  min-height:100vh;
  transition:.25s;
}

.container{
  max-width:1400px;
  margin:auto;
}

.page-title{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:15px;
  margin-bottom:22px;
}

.page-title h1{
  margin:0;
  font-size:27px;
}

.page-title p{
  color:var(--muted);
  margin:5px 0 0;
}

.card{
  background:white;
  border:1px solid var(--border);
  border-radius:14px;
  box-shadow:var(--shadow);
  padding:20px;
  margin-bottom:20px;
}

.stats{
  display:grid;
  grid-template-columns:repeat(5,1fr);
  gap:15px;
  margin-bottom:22px;
}

.stat{
  background:white;
  border:1px solid var(--border);
  border-radius:14px;
  padding:20px;
  box-shadow:var(--shadow);
}

.stat .icon{
  font-size:26px;
}

.stat .number{
  font-size:29px;
  font-weight:700;
  margin-top:8px;
  color:var(--green);
}

.stat .label{
  color:var(--muted);
  font-size:13px;
  margin-top:4px;
}

.grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:20px;
}

.form-grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:15px;
}

.form-group{
  margin-bottom:2px;
}

.form-group.full{
  grid-column:1 / -1;
}

.form-group label{
  display:block;
  font-size:13px;
  font-weight:700;
  margin-bottom:6px;
}

.form-control{
  width:100%;
  border:1px solid #cfdad3;
  border-radius:8px;
  padding:10px 11px;
  background:#fff;
  color:var(--text);
}

.form-control:focus{
  outline:none;
  border-color:var(--green2);
  box-shadow:0 0 0 3px rgba(34,139,76,.1);
}

textarea.form-control{
  min-height:100px;
  resize:vertical;
}

.btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  border:0;
  border-radius:8px;
  padding:10px 15px;
  cursor:pointer;
  font-weight:700;
  font-size:13px;
}

.btn-primary{
  background:var(--green);
  color:#fff;
}

.btn-primary:hover{
  background:#11562e;
}

.btn-secondary{
  background:#edf1ee;
  color:#34423a;
}

.btn-danger{
  background:#feeceb;
  color:var(--danger);
}

.btn-warning{
  background:#fff3db;
  color:#8a5400;
}

.btn-sm{
  padding:7px 10px;
  font-size:12px;
}

.actions{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}

.table-wrap{
  overflow-x:auto;
}

table{
  width:100%;
  border-collapse:collapse;
  font-size:13px;
}

th{
  background:#f2f6f3;
  text-align:left;
  font-size:12px;
  color:#56645c;
  white-space:nowrap;
}

th,
td{
  padding:11px 10px;
  border-bottom:1px solid var(--border);
  vertical-align:top;
}

tr:hover td{
  background:#fafcfb;
}

.badge{
  display:inline-block;
  padding:4px 8px;
  border-radius:99px;
  font-size:11px;
  font-weight:700;
}

.badge-green{
  background:#e4f5ea;
  color:#176b3a;
}

.badge-gray{
  background:#eef1ef;
  color:#66716b;
}

.badge-red{
  background:#feeceb;
  color:#a71d12;
}

.badge-yellow{
  background:#fff1cf;
  color:#8a5900;
}

.badge-success{
  background:#e4f5ea;
  color:#176b3a;
}

.badge-danger{
  background:#feeceb;
  color:#a71d12;
}

.badge-warning{
  background:#fff1cf;
  color:#8a5900;
}

.btn-success{
  background:var(--green);
  color:#fff;
}

.page-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:15px;
  margin-bottom:22px;
}

.text-muted{
  color:var(--muted);
}

.table-responsive{
  overflow-x:auto;
}

.table{
  width:100%;
  border-collapse:collapse;
}

.input{
  width:100%;
  border:1px solid #cfdad3;
  border-radius:8px;
  padding:10px 11px;
  background:#fff;
  color:var(--text);
}

.notice{
  padding:13px 15px;
  border-radius:99px;
  margin-bottom:18px;
  font-size:13px;
}

.notice-info{
  background:#eaf4ff;
  color:#17527c;
}

.notice-danger{
  background:#fff0ef;
  color:#9b251d;
}

.empty{
  text-align:center;
  padding:35px;
  color:var(--muted);
}

.search-box{
  display:flex;
  gap:10px;
  margin-bottom:18px;
}

.search-box input{
  flex:1;
}

.login-page{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px;
  background:linear-gradient(135deg,#123524,#1d7041);
}

.login-card{
  background:white;
  width:100%;
  max-width:420px;
  border-radius:18px;
  padding:32px;
  box-shadow:0 20px 60px rgba(0,0,0,.25);
}

.login-logo{
  text-align:center;
  font-size:42px;
}

.login-card h1{
  text-align:center;
  margin:10px 0 5px;
  color:var(--dark);
}

.login-card p{
  text-align:center;
  color:var(--muted);
  margin-bottom:25px;
}

.mobile-overlay{
  display:none;
}

.footer{
  margin-top:30px;
  padding:20px 0;
  text-align:center;
  color:#89938d;
  font-size:12px;
}

@media(max-width:1000px){
  .stats{
    grid-template-columns:repeat(3,1fr);
  }
}

@media(max-width:750px){
  .sidebar{
    transform:translateX(-100%);
    box-shadow:10px 0 30px rgba(0,0,0,.15);
  }

  .sidebar.open{
    transform:translateX(0);
  }

  .mobile-overlay{
    position:fixed;
    inset:64px 0 0 0;
    background:rgba(0,0,0,.35);
    z-index:800;
  }

  .mobile-overlay.open{
    display:block;
  }

  .main{
    margin-left:0;
    padding:84px 14px 30px;
  }

  .stats{
    grid-template-columns:repeat(2,1fr);
  }

  .grid,
  .form-grid{
    grid-template-columns:1fr;
  }

  .form-group.full{
    grid-column:auto;
  }

  .page-title,
  .page-header{
    align-items:flex-start;
    flex-direction:column;
  }

  .page-title h1{
    font-size:23px;
  }

  .admin-label{
    display:none;
  }
}

@media(max-width:430px){
  .stats{
    grid-template-columns:1fr 1fr;
    gap:9px;
  }

  .stat{
    padding:14px;
  }

  .stat .number{
    font-size:23px;
  }

  .card{
    padding:15px;
  }
}
`;
